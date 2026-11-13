
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

const MIN_DISTANCE_KM = 25;
const MAX_LOCATION_ATTEMPTS = 12;

type Row = Record<string, any>;

type PickedLocation = {
  image: RoundImage;
  location: LatLng;
};

function check<T>(r: {
  data: T | null;
  error: {
    message: string;
    code?: string;
  } | null;
}): T {
  if (r.error) {
    console.error('[supabase]', r.error);
    throw new ApiError(500, 'Veritabanı hatası');
  }

  return r.data as T;
}

const endsAt = (limitSec: number) =>
  limitSec > 0
    ? new Date(
        Date.now() + limitSec * 1000
      ).toISOString()
    : null;

// ODAYI BUL

async function getRoom(code: string): Promise<Row> {
  const result = await admin()
    .from('rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  const room = check<Row | null>(result);

  if (!room) {
    throw new ApiError(404, 'Oda bulunamadı');
  }

  return room;
}

// OYUNCUYU DOĞRULA

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
  const value = n
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 20);

  if (!value) {
    throw new ApiError(
      400,
      'Takma ad gerekli'
    );
  }

  return value;
}

// OYUNCU EKLE

async function addPlayer(
  roomId: string,
  nickname: string,
  isHost: boolean
): Promise<Creds> {
  const player = check<Row>(
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
        player_id: player.id,
        secret,
      })
      .select('player_id')
      .single()
  );

  return {
    playerId: player.id,
    secret,
  };
}

// ODA OLUŞTUR

export async function createRoom(
  nickname: string,
  totalRounds: number,
  timeLimitSec: number
) {
  const nick = cleanNick(nickname);

  for (let i = 0; i < 5; i++) {
    const code = Array.from(
      randomBytes(5),
      (b) => ALPHABET[b % ALPHABET.length]
    ).join('');

    const result = await admin()
      .from('rooms')
      .insert({
        code,
        total_rounds: totalRounds,
        time_limit_sec: timeLimitSec,
      })
      .select('*')
      .single();

    if (result.error?.code === '23505') {
      continue;
    }

    const room = check<Row>(result);

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

// ODAYA KATIL

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

// FARKLI KONUM BUL
// Daha önce oynanan turlar tekrar seçilmez.

async function prepareNextLocation(
  roomId: string
): Promise<PickedLocation> {
  const previous = check<Row[]>(
    await admin()
      .from('room_rounds')
      .select('image_id,lat,lng')
      .eq('room_id', roomId)
  );

  for (
    let attempt = 0;
    attempt < MAX_LOCATION_ATTEMPTS;
    attempt++
  ) {
    const candidate =
      await pickRandomLocation();

    const different = previous.every(
      (item) => {
        if (
          item.image_id ===
          candidate.image.imageId
        ) {
          return false;
        }

        return (
          haversineKm(
            {
              lat: item.lat,
              lng: item.lng,
            },
            candidate.location
          ) >= MIN_DISTANCE_KM
        );
      }
    );

    if (different) {
      return candidate;
    }
  }

  throw new ApiError(
    503,
    'Farklı panorama bulunamadı. Tekrar dene.',
    3
  );
}

// TUR KONUMUNU KAYDET

async function saveRound(
  roomId: string,
  roundNo: number,
  candidate: PickedLocation
): Promise<void> {
  const result = await admin()
    .from('room_rounds')
    .insert({
      room_id: roomId,
      round_no: roundNo,
      image_id: candidate.image.imageId,
      sequence_id:
        candidate.image.sequenceId,
      lat: candidate.location.lat,
      lng: candidate.location.lng,
    });

  if (result.error?.code === '23505') {
    // Aynı tur başka bir istek tarafından
    // hazırlanmış olabilir.
    return;
  }

  if (result.error) {
    console.error(result.error);

    throw new ApiError(
      500,
      'Tur konumu kaydedilemedi'
    );
  }
}

// OYUNU HIZLI BAŞLAT

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
    // SADECE İLK TURU HAZIRLA.
    // Diğer turlar başlangıcı geciktirmez.

    const firstLocation =
      await prepareNextLocation(room.id);

    await saveRound(
      room.id,
      1,
      firstLocation
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
        .eq('status', 'starting')
        .select('id')
    );
  } catch (error) {
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

  const result = await admin()
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

  if (result.error?.code === '23505') {
    throw new ApiError(
      409,
      'Bu tur için zaten tahmin ettin'
    );
  }

  if (result.error) {
    console.error(result.error);

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

// SÜRE DOLDUYSA TURU BİTİR

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
// Yeni konum yalnızca burada hazırlanır.

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

  const nextRoundNo =
    room.current_round + 1;

  // Önce yeni turun kaydı var mı kontrol et.

  const existing = check<Row | null>(
    await admin()
      .from('room_rounds')
      .select('id')
      .eq('room_id', room.id)
      .eq('round_no', nextRoundNo)
      .maybeSingle()
  );

  if (!existing) {
    // Önceki turlardan farklı konum seç.
    const location =
      await prepareNextLocation(room.id);

    await saveRound(
      room.id,
      nextRoundNo,
      location
    );
  }

  // Oyuncuların tahmin durumunu sıfırla.

  check(
    await admin()
      .from('players')
      .update({
        has_guessed: false,
      })
      .eq('room_id', room.id)
      .select('id')
  );

  // Yeni tura geç.

  check(
    await admin()
      .from('rooms')
      .update({
        status: 'playing',
        current_round: nextRoundNo,
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

    if (room.status !== 'playing') {
      const guesses = check<Row[]>(
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
        guesses: guesses.map(
          (guess) => ({
            playerId:
              guess.player_id,
            lat: guess.lat,
            lng: guess.lng,
            distanceKm:
              guess.distance_km,
            score: guess.score,
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
      (player) => ({
        id: player.id,
        nickname:
          player.nickname,
        isHost:
          player.is_host,
        totalScore:
          player.total_score,
        hasGuessed:
          player.has_guessed,
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
