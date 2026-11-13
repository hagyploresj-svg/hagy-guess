
import 'server-only';

import { randomBytes, timingSafeEqual } from 'crypto';
import { admin } from './supabase-server';
import { ApiError } from './http';
import {
  getImageById,
  pickRandomLocation,
} from './mapillary';
import { haversineKm, scoreFor } from './geo';
import type {
  Creds,
  RoomState,
  LatLng,
  RoundImage,
} from './types';

export const GRACE_MS = 3000;

const MAX_PLAYERS = 8;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Farklı tur konumları arasında hedeflenen mesafe
const MIN_DISTANCE_KM = 25;

// Birbirinden farklı konum aramak için üst sınırlar
const MAX_LOCATION_BATCHES = 6;
const LOCATION_BATCH_SIZE = 8;

type Row = Record<string, any>;

type PickedLocation = {
  image: RoundImage;
  location: LatLng;
};

function check<T>(r: {
  data: T | null;
  error: { message: string; code?: string } | null;
}): T {
  if (r.error) {
    console.error('[supabase]', r.error);
    throw new ApiError(500, 'Veritabanı hatası');
  }

  return r.data as T;
}

const endsAt = (limitSec: number) =>
  limitSec > 0
    ? new Date(Date.now() + limitSec * 1000).toISOString()
    : null;

async function getRoom(code: string): Promise<Row> {
  const r = await admin()
    .from('rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  const room = check<Row | null>(r);

  if (!room) {
    throw new ApiError(404, 'Oda bulunamadı');
  }

  return room;
}

async function auth(
  room: Row,
  c: Creds
): Promise<Row> {
  const player = check<Row | null>(
    await admin()
      .from('players')
      .select('*')
      .eq('id', c.playerId)
      .eq('room_id', room.id)
      .maybeSingle()
  );

  const sec = check<Row | null>(
    await admin()
      .from('player_secrets')
      .select('secret')
      .eq('player_id', c.playerId)
      .maybeSingle()
  );

  const a = Buffer.from(sec?.secret ?? '');
  const b = Buffer.from(c.secret ?? '');

  if (
    !player ||
    !sec ||
    a.length !== b.length ||
    !timingSafeEqual(a, b)
  ) {
    throw new ApiError(401, 'Yetkisiz');
  }

  return player;
}

export function credsFrom(req: Request): Creds {
  return {
    playerId:
      req.headers.get('x-player-id') ?? '',
    secret:
      req.headers.get('x-player-secret') ?? '',
  };
}

function cleanNick(n: string): string {
  const v = n
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 20);

  if (!v) {
    throw new ApiError(
      400,
      'Takma ad gerekli'
    );
  }

  return v;
}

async function addPlayer(
  roomId: string,
  nickname: string,
  isHost: boolean
): Promise<Creds> {
  const p = check<Row>(
    await admin()
      .from('players')
      .insert({
        room_id: roomId,
        nickname,
        is_host: isHost,
      })
      .select('id')
      .single()
  );

  const secret =
    randomBytes(24).toString('base64url');

  check(
    await admin()
      .from('player_secrets')
      .insert({
        player_id: p.id,
        secret,
      })
      .select('player_id')
      .single()
  );

  return {
    playerId: p.id,
    secret,
  };
}

// ODA OLUŞTURMA
export async function createRoom(
  nickname: string,
  totalRounds: number,
  timeLimitSec: number
) {
  const nick = cleanNick(nickname);

  for (let i = 0; i < 5; i++) {
    const code = Array.from(
      randomBytes(5),
      (b) =>
        ALPHABET[b % ALPHABET.length]
    ).join('');

    const r = await admin()
      .from('rooms')
      .insert({
        code,
        total_rounds: totalRounds,
        time_limit_sec: timeLimitSec,
      })
      .select('*')
      .single();

    if (r.error?.code === '23505') {
      continue;
    }

    const room = check<Row>(r);

    return {
      code,
      ...(await addPlayer(
        room.id,
        nick,
        true
      )),
    };
  }

  throw new ApiError(
    500,
    'Oda kodu üretilemedi'
  );
}

// ODAYA KATILMA
export async function joinRoom(
  code: string,
  nickname: string
) {
  const room = await getRoom(code);

  if (room.status !== 'lobby') {
    throw new ApiError(
      409,
      'Oyun çoktan başladı'
    );
  }

  const nick = cleanNick(nickname);

  const players = check<Row[]>(
    await admin()
      .from('players')
      .select('nickname')
      .eq('room_id', room.id)
  );

  if (players.length >= MAX_PLAYERS) {
    throw new ApiError(409, 'Oda dolu');
  }

  if (
    players.some(
      (p) =>
        p.nickname.toLowerCase() ===
        nick.toLowerCase()
    )
  ) {
    throw new ApiError(
      409,
      'Bu takma ad alınmış'
    );
  }

  return addPlayer(
    room.id,
    nick,
    false
  );
}

// KONUM TEKRARINI KONTROL ET
function isDifferentLocation(
  candidate: PickedLocation,
  selected: PickedLocation[]
): boolean {
  for (const previous of selected) {
    // Aynı fotoğraf kesinlikle tekrar seçilmesin
    if (
      previous.image.imageId ===
      candidate.image.imageId
    ) {
      return false;
    }

    // Birbirine çok yakın konumları ele
    const distance = haversineKm(
      previous.location,
      candidate.location
    );

    if (distance < MIN_DISTANCE_KM) {
      return false;
    }
  }

  return true;
}

// FARKLI PANORAMALARI HAZIRLA
async function prepareUniqueLocations(
  totalRounds: number
): Promise<PickedLocation[]> {
  const selected: PickedLocation[] = [];

  for (
    let batch = 0;
    batch < MAX_LOCATION_BATCHES;
    batch++
  ) {
    if (selected.length >= totalRounds) {
      break;
    }

    // Paralel arama: bir tur için tek tek beklemiyoruz.
    const results = await Promise.allSettled(
      Array.from(
        { length: LOCATION_BATCH_SIZE },
        () => pickRandomLocation()
      )
    );

    for (const result of results) {
      if (selected.length >= totalRounds) {
        break;
      }

      if (result.status !== 'fulfilled') {
        continue;
      }

      const candidate = result.value;

      if (
        isDifferentLocation(
          candidate,
          selected
        )
      ) {
        selected.push(candidate);
      }
    }
  }

  if (selected.length < totalRounds) {
    throw new ApiError(
      503,
      'Yeterince farklı 360° konum bulunamadı. Tekrar dene.',
      3
    );
  }

  return selected;
}

// OYUNU BAŞLAT
export async function startGame(
  code: string,
  c: Creds
) {
  const room = await getRoom(code);
  const me = await auth(room, c);

  if (!me.is_host) {
    throw new ApiError(
      403,
      'Sadece oda sahibi başlatabilir'
    );
  }

  const lock = check<Row[]>(
    await admin()
      .from('rooms')
      .update({
        status: 'starting',
      })
      .eq('id', room.id)
      .eq('status', 'lobby')
      .select('id')
  );

  if (!lock.length) {
    throw new ApiError(
      409,
      'Oyun zaten başlıyor'
    );
  }

  try {
    const locations =
      await prepareUniqueLocations(
        room.total_rounds
      );

    const rows = locations.map(
      (item, index) => ({
        room_id: room.id,
        round_no: index + 1,
        image_id: item.image.imageId,
        sequence_id:
          item.image.sequenceId,
        lat: item.location.lat,
        lng: item.location.lng,
      })
    );

    check(
      await admin()
        .from('room_rounds')
        .insert(rows)
        .select('id')
    );

    check(
      await admin()
        .from('players')
        .update({
          total_score: 0,
          has_guessed: false,
        })
        .eq('room_id', room.id)
        .select('id')
    );

    check(
      await admin()
        .from('rooms')
        .update({
          status: 'playing',
          current_round: 1,
          round_ends_at:
            endsAt(room.time_limit_sec),
        })
        .eq('id', room.id)
        .select('id')
    );
  } catch (error) {
    // Başlatma başarısızsa yarım kalan tur kayıtlarını temizle.
    await admin()
      .from('room_rounds')
      .delete()
      .eq('room_id', room.id);

    await admin()
      .from('rooms')
      .update({
        status: 'lobby',
        current_round: 0,
        round_ends_at: null,
      })
      .eq('id', room.id)
      .eq('status', 'starting');

    throw error;
  }
}

// TURU BİTİR
async function finishRound(
  roomId: string,
  roundNo: number
) {
  await admin()
    .from('rooms')
    .update({
      status: 'results',
    })
    .eq('id', roomId)
    .eq('status', 'playing')
    .eq('current_round', roundNo);
}

// TAHMİN GÖNDER
export async function submitGuess(
  code: string,
  c: Creds,
  lat: number,
  lng: number
) {
  const room = await getRoom(code);
  const me = await auth(room, c);

  if (room.status !== 'playing') {
    throw new ApiError(
      409,
      'Şu an tahmin alınmıyor'
    );
  }

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    throw new ApiError(
      400,
      'Geçersiz koordinat'
    );
  }

  if (
    room.round_ends_at &&
    Date.now() >
      new Date(
        room.round_ends_at
      ).getTime() + GRACE_MS
  ) {
    throw new ApiError(
      409,
      'Süre doldu'
    );
  }

  const rr = check<Row>(
    await admin()
      .from('room_rounds')
      .select('lat,lng')
      .eq('room_id', room.id)
      .eq(
        'round_no',
        room.current_round
      )
      .single()
  );

  const distanceKm = haversineKm(
    { lat, lng },
    {
      lat: rr.lat,
      lng: rr.lng,
    }
  );

  const score = scoreFor(distanceKm);

  const ins = await admin()
    .from('guesses')
    .insert({
      room_id: room.id,
      round_no: room.current_round,
      player_id: me.id,
      lat,
      lng,
      distance_km: distanceKm,
      score,
    });

  if (ins.error?.code === '23505') {
    throw new ApiError(
      409,
      'Bu tur için zaten tahmin ettin'
    );
  }

  if (ins.error) {
    console.error(ins.error);
    throw new ApiError(
      500,
      'Veritabanı hatası'
    );
  }

  const all = check<Row[]>(
    await admin()
      .from('guesses')
      .select('score')
      .eq('room_id', room.id)
      .eq('player_id', me.id)
  );

  const total = all.reduce(
    (sum, guess) =>
      sum + guess.score,
    0
  );

  check(
    await admin()
      .from('players')
      .update({
        total_score: total,
        has_guessed: true,
      })
      .eq('id', me.id)
      .select('id')
  );

  const pending = check<Row[]>(
    await admin()
      .from('players')
      .select('id')
      .eq('room_id', room.id)
      .eq('has_guessed', false)
  );

  if (pending.length === 0) {
    await finishRound(
      room.id,
      room.current_round
    );
  }
}

// SÜRE KONTROLÜ
export async function advanceIfExpired(
  code: string,
  c: Creds
) {
  const room = await getRoom(code);

  await auth(room, c);

  if (
    room.status === 'playing' &&
    room.round_ends_at &&
    Date.now() >
      new Date(
        room.round_ends_at
      ).getTime() + GRACE_MS
  ) {
    await finishRound(
      room.id,
      room.current_round
    );
  }
}

// SONRAKİ TUR
export async function nextRound(
  code: string,
  c: Creds
) {
  const room = await getRoom(code);
  const me = await auth(room, c);

  if (!me.is_host) {
    throw new ApiError(
      403,
      'Sadece oda sahibi ilerletebilir'
    );
  }

  if (room.status !== 'results') {
    throw new ApiError(
      409,
      'Tur henüz bitmedi'
    );
  }

  if (
    room.current_round >=
    room.total_rounds
  ) {
    check(
      await admin()
        .from('rooms')
        .update({
          status: 'finished',
        })
        .eq('id', room.id)
        .eq('status', 'results')
        .select('id')
    );

    return;
  }

  const upd = check<Row[]>(
    await admin()
      .from('rooms')
      .update({
        status: 'playing',
        current_round:
          room.current_round + 1,
        round_ends_at:
          endsAt(room.time_limit_sec),
      })
      .eq('id', room.id)
      .eq('status', 'results')
      .eq(
        'current_round',
        room.current_round
      )
      .select('id')
  );

  if (upd.length) {
    check(
      await admin()
        .from('players')
        .update({
          has_guessed: false,
        })
        .eq('room_id', room.id)
        .select('id')
    );
  }
}

// ODA DURUMU
export async function getState(
  code: string,
  c: Creds
): Promise<RoomState> {
  const room = await getRoom(code);
  const me = await auth(room, c);

  const players = check<Row[]>(
    await admin()
      .from('players')
      .select(
        'id,nickname,is_host,total_score,has_guessed'
      )
      .eq('room_id', room.id)
      .order('joined_at')
  );

  let round: RoomState['round'] = null;
  let reveal: RoomState['reveal'] = null;

  if (
    room.current_round > 0 &&
    [
      'playing',
      'results',
      'finished',
    ].includes(room.status)
  ) {
    const rr = check<Row>(
      await admin()
        .from('room_rounds')
        .select('*')
        .eq('room_id', room.id)
        .eq(
          'round_no',
          room.current_round
        )
        .single()
    );

    round = {
      roundNo: room.current_round,
      image: await getImageById(
        rr.image_id
      ),
    };

    if (
      room.status !== 'playing'
    ) {
      const gs = check<Row[]>(
        await admin()
          .from('guesses')
          .select('*')
          .eq('room_id', room.id)
          .eq(
            'round_no',
            room.current_round
          )
      );

      reveal = {
        actual: {
          lat: rr.lat,
          lng: rr.lng,
        },
        guesses: gs.map(
          (g) => ({
            playerId: g.player_id,
            lat: g.lat,
            lng: g.lng,
            distanceKm:
              g.distance_km,
            score: g.score,
          })
        ),
      };
    }
  }

  return {
    serverNow: Date.now(),

    room: {
      id: room.id,
      code: room.code,
      status: room.status,
      totalRounds:
        room.total_rounds,
      timeLimitSec:
        room.time_limit_sec,
      currentRound:
        room.current_round,
      roundEndsAt:
        room.round_ends_at,
    },

    players: players.map(
      (p) => ({
        id: p.id,
        nickname: p.nickname,
        isHost: p.is_host,
        totalScore:
          p.total_score,
        hasGuessed:
          p.has_guessed,
      })
    ),

    me: {
      id: me.id,
      isHost: me.is_host,
    },

    round,
    reveal,
  };
}
