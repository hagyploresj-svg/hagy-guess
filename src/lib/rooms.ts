
import 'server-only';

import { randomBytes, timingSafeEqual } from 'crypto';
import { admin } from './supabase-server';
import { ApiError } from './http';
import { getImageById } from './mapillary';
import { pickPreparedRounds } from './fast-pool';
import { haversineKm, scoreFor } from './geo';
import type { Creds, RoomState } from './types';

export const GRACE_MS = 3000;

const MAX_PLAYERS = 8;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

type Row = Record<string, any>;

function check<T>(result: {
  data: T | null;
  error: { message: string; code?: string } | null;
}): T {
  if (result.error) {
    console.error('[supabase]', result.error);
    throw new ApiError(500, 'Veritabanı hatası');
  }

  return result.data as T;
}

const endsAt = (seconds: number) =>
  seconds > 0
    ? new Date(Date.now() + seconds * 1000).toISOString()
    : null;

async function getRoom(code: string): Promise<Row> {
  const room = check<Row | null>(
    await admin()
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .maybeSingle()
  );

  if (!room) {
    throw new ApiError(404, 'Oda bulunamadı');
  }

  return room;
}

async function auth(room: Row, creds: Creds): Promise<Row> {
  const player = check<Row | null>(
    await admin()
      .from('players')
      .select('*')
      .eq('id', creds.playerId)
      .eq('room_id', room.id)
      .maybeSingle()
  );

  const secretRow = check<Row | null>(
    await admin()
      .from('player_secrets')
      .select('secret')
      .eq('player_id', creds.playerId)
      .maybeSingle()
  );

  const a = Buffer.from(secretRow?.secret ?? '');
  const b = Buffer.from(creds.secret ?? '');

  if (
    !player ||
    !secretRow ||
    a.length !== b.length ||
    !timingSafeEqual(a, b)
  ) {
    throw new ApiError(401, 'Yetkisiz');
  }

  return player;
}

export function credsFrom(req: Request): Creds {
  return {
    playerId: req.headers.get('x-player-id') ?? '',
    secret: req.headers.get('x-player-secret') ?? '',
  };
}

function cleanNick(nickname: string): string {
  const value = nickname
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 20);

  if (!value) {
    throw new ApiError(400, 'Takma ad gerekli');
  }

  return value;
}

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

  const secret = randomBytes(24).toString('base64url');

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

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = Array.from(
      randomBytes(5),
      (byte) => ALPHABET[byte % ALPHABET.length]
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
      ...(await addPlayer(room.id, nick, true)),
    };
  }

  throw new ApiError(500, 'Oda kodu üretilemedi');
}

// ODAYA KATIL

export async function joinRoom(
  code: string,
  nickname: string
) {
  const room = await getRoom(code);

  if (room.status !== 'lobby') {
    throw new ApiError(409, 'Oyun çoktan başladı');
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
        player.nickname.toLowerCase() === nick.toLowerCase()
    )
  ) {
    throw new ApiError(409, 'Bu takma ad alınmış');
  }

  return addPlayer(room.id, nick, false);
}

// OYUNU BAŞLAT
// TÜM TURLAR HAZIR HAVUZDAN SEÇİLİR.

export async function startGame(
  code: string,
  creds: Creds
) {
  const room = await getRoom(code);
  const me = await auth(room, creds);

  if (!me.is_host) {
    throw new ApiError(
      403,
      'Sadece oda sahibi başlatabilir'
    );
  }

  const lock = check<Row[]>(
    await admin()
      .from('rooms')
      .update({ status: 'starting' })
      .eq('id', room.id)
      .eq('status', 'lobby')
      .select('id')
  );

  if (!lock.length) {
    throw new ApiError(409, 'Oyun zaten başlıyor');
  }

  try {
    const prepared = await pickPreparedRounds(
      room.total_rounds
    );

    const rounds = prepared.map((item, index) => ({
      room_id: room.id,
      round_no: index + 1,
      image_id: item.imageId,
      sequence_id: item.sequenceId,
      lat: item.location.lat,
      lng: item.location.lng,
    }));

    check(
      await admin()
        .from('room_rounds')
        .insert(rounds)
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
          round_ends_at: endsAt(room.time_limit_sec),
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
    .update({ status: 'results' })
    .eq('id', roomId)
    .eq('status', 'playing')
    .eq('current_round', roundNo);
}

// TAHMİN GÖNDER

export async function submitGuess(
  code: string,
  creds: Creds,
  lat: number,
  lng: number
) {
  const room = await getRoom(code);
  const me = await auth(room, creds);

  if (room.status !== 'playing') {
    throw new ApiError(409, 'Şu an tahmin alınmıyor');
  }

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    throw new ApiError(400, 'Geçersiz koordinat');
  }

  if (
    room.round_ends_at &&
    Date.now() >
      new Date(room.round_ends_at).getTime() + GRACE_MS
  ) {
    throw new ApiError(409, 'Süre doldu');
  }

  const round = check<Row>(
    await admin()
      .from('room_rounds')
      .select('lat,lng')
      .eq('room_id', room.id)
      .eq('round_no', room.current_round)
      .single()
  );

  const distanceKm = haversineKm(
    { lat, lng },
    {
      lat: round.lat,
      lng: round.lng,
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
    throw new ApiError(500, 'Veritabanı hatası');
  }

  const guesses = check<Row[]>(
    await admin()
      .from('guesses')
      .select('score')
      .eq('room_id', room.id)
      .eq('player_id', me.id)
  );

  const totalScore = guesses.reduce(
    (sum, guess) => sum + guess.score,
    0
  );

  check(
    await admin()
      .from('players')
      .update({
        total_score: totalScore,
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
    await finishRound(room.id, room.current_round);
  }
}

// SÜRE KONTROLÜ

export async function advanceIfExpired(
  code: string,
  creds: Creds
) {
  const room = await getRoom(code);

  await auth(room, creds);

  if (
    room.status === 'playing' &&
    room.round_ends_at &&
    Date.now() >
      new Date(room.round_ends_at).getTime() + GRACE_MS
  ) {
    await finishRound(room.id, room.current_round);
  }
}

// SONRAKİ TUR
// YENİ KONUM ARAMASI YAPILMAZ.

export async function nextRound(
  code: string,
  creds: Creds
) {
  const room = await getRoom(code);
  const me = await auth(room, creds);

  if (!me.is_host) {
    throw new ApiError(
      403,
      'Sadece oda sahibi ilerletebilir'
    );
  }

  if (room.status !== 'results') {
    throw new ApiError(409, 'Tur henüz bitmedi');
  }

  if (room.current_round >= room.total_rounds) {
    check(
      await admin()
        .from('rooms')
        .update({ status: 'finished' })
        .eq('id', room.id)
        .eq('status', 'results')
        .select('id')
    );

    return;
  }

  const nextRoundNo = room.current_round + 1;

  const existing = check<Row | null>(
    await admin()
      .from('room_rounds')
      .select('id')
      .eq('room_id', room.id)
      .eq('round_no', nextRoundNo)
      .maybeSingle()
  );

  if (!existing) {
    throw new ApiError(
      503,
      'Sonraki tur konumu hazır değil'
    );
  }

  const updated = check<Row[]>(
    await admin()
      .from('rooms')
      .update({
        status: 'playing',
        current_round: nextRoundNo,
        round_ends_at: endsAt(room.time_limit_sec),
      })
      .eq('id', room.id)
      .eq('status', 'results')
      .eq('current_round', room.current_round)
      .select('id')
  );

  if (updated.length) {
    check(
      await admin()
        .from('players')
        .update({ has_guessed: false })
        .eq('room_id', room.id)
        .select('id')
    );
  }
}

// ODA DURUMU

export async function getState(
  code: string,
  creds: Creds
): Promise<RoomState> {
  const room = await getRoom(code);
  const me = await auth(room, creds);

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
    ['playing', 'results', 'finished'].includes(
      room.status
    )
  ) {
    const roundRow = check<Row>(
      await admin()
        .from('room_rounds')
        .select('*')
        .eq('room_id', room.id)
        .eq('round_no', room.current_round)
        .single()
    );

    round = {
      roundNo: room.current_round,
      image: await getImageById(roundRow.image_id),
    };

    if (room.status !== 'playing') {
      const guesses = check<Row[]>(
        await admin()
          .from('guesses')
          .select('*')
          .eq('room_id', room.id)
          .eq('round_no', room.current_round)
      );

      reveal = {
        actual: {
          lat: roundRow.lat,
          lng: roundRow.lng,
        },
        guesses: guesses.map((guess) => ({
          playerId: guess.player_id,
          lat: guess.lat,
          lng: guess.lng,
          distanceKm: guess.distance_km,
          score: guess.score,
        })),
      };
    }
  }

  return {
    serverNow: Date.now(),

    room: {
      id: room.id,
      code: room.code,
      status: room.status,
      totalRounds: room.total_rounds,
      timeLimitSec: room.time_limit_sec,
      currentRound: room.current_round,
      roundEndsAt: room.round_ends_at,
    },

    players: players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      isHost: player.is_host,
      totalScore: player.total_score,
      hasGuessed: player.has_guessed,
    })),

    me: {
      id: me.id,
      isHost: me.is_host,
    },

    round,
    reveal,
  };
}
