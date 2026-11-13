
import 'server-only';

import { randomBytes, timingSafeEqual } from 'crypto';
import { admin } from './supabase-server';
import { ApiError } from './http';
import {
  getImageById,
  pickGameLocations,
} from './mapillary';
import { haversineKm, scoreFor } from './geo';
import type { Creds, RoomState } from './types';

export const GRACE_MS = 3000;

const MAX_PLAYERS = 8;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

type Row = Record<string, any>;

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

// OYUNCU DOĞRULAMA

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

// İSTEK KİMLİK BİLGİLERİ

export function credsFrom(req: Request): Creds {
  return {
    playerId:
      req.headers.get('x-player-id') ?? '',
    secret:
      req.headers.get('x-player-secret') ?? '',
  };
}

// TAKMA AD KONTROLÜ

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

// OYUNCU EKLEME

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

  const secret = randomBytes(24).toString(
    'base64url'
  );

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
      (byte) =>
        ALPHABET[byte % ALPHABET.length]
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
      (player) =>
        player.nickname.toLowerCase() ===
        nick.toLowerCase()
    )
  ) {
    throw new ApiError(
      409,
      'Bu takma ad alınmış'
    );
  }

  return addPlayer(room.id, nick, false);
}

// OYUNU BAŞLAT
// FARKLI BÖLGELERDEN KONUM HAZIRLA

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

  // Aynı anda iki defa başlatılmasını engelle.

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
    // Yeni Mapillary sistemi:
    // Farklı arama bölgelerinden 360° panorama seçer.

    const locations = await pickGameLocations(
      room.total_rounds
    );

    // Ek güvenlik:
    // Aynı fotoğraf ID'si tekrar edemez.

    const uniqueIds = new Set(
      locations.map(
        (item) => item.image.imageId
      )
    );

    if (
      locations.length !== room.total_rounds ||
      uniqueIds.size !== locations.length
    ) {
      throw new ApiError(
        503,
        'Yeterince farklı panorama bulunamadı'
      );
    }

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

    // Tüm turları önceden kaydet.
    // Böylece sonraki turlarda yeni arama beklenmez.

    check(
      await admin()
        .from('room_rounds')
        .insert(rows)
        .select('id')
    );

    // Oyuncu puanlarını sıfırla.

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

    // Oyunu ilk turdan başlat.

    check(
      await admin()
        .from('rooms')
        .update({
          status: 'playing',
          current_round: 1,
          round_ends_at: endsAt(
            room.time_limit_sec
          ),
        })
        .eq('id', room.id)
        .select('id')
    );
  } catch (error) {
    // Başlatma başarısız olursa
    // yarım kalan kayıtları temizle.

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

// TAHMİN GÖNDERME

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

  // Koordinat kontrolü.

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

  // Süre kontrolü.

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

  // Gerçek konumu al.

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

  // Mesafe ve puan hesaplama.

  const distanceKm = haversineKm(
    { lat, lng },
    {
      lat: rr.lat,
      lng: rr.lng,
    }
  );

  const score = scoreFor(distanceKm);

  // Tahmini kaydet.

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

  // Oyuncunun toplam puanını hesapla.

  const guesses = check<Row[]>(
    await admin()
      .from('guesses')
      .select('score')
      .eq('room_id', room.id)
      .eq('player_id', me.id)
  );

  const total = guesses.reduce(
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

  // Herkes tahmin yaptıysa turu bitir.

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

// SONRAKİ TURA GEÇ

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

  // Son tur tamamlandıysa oyunu bitir.

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

  // Sonraki tura geç.

  const updated = check<Row[]>(
    await admin()
      .from('rooms')
      .update({
        status: 'playing',
        current_round:
          room.current_round + 1,
        round_ends_at: endsAt(
          room.time_limit_sec
        ),
      })
      .eq('id', room.id)
      .eq('status', 'results')
      .eq(
        'current_round',
        room.current_round
      )
      .select('id')
  );

  if (updated.length) {
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

// ODA DURUMUNU GETİR

export async function getState(
  code: string,
  c: Creds
): Promise<RoomState> {
  const room = await getRoom(code);
  const me = await auth(room, c);

  // Odadaki oyuncuları getir.

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

  // Aktif turun panoramasını getir.

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

    // Tur bittiyse gerçek konumu göster.

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
