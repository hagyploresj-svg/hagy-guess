import { NextResponse } from 'next/server';
import { z } from 'zod';
import { advanceIfExpired, credsFrom, getState, joinRoom, nextRound, startGame, submitGuess } from '@/lib/rooms';
import { limit } from '@/lib/ratelimit';
import { ApiError, fail } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // start: birden fazla Mapillary konumu seçilir

type Ctx = { params: { code: string; action: string } };

const Join = z.object({ nickname: z.string().min(1).max(40) });
const Guess = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

export async function GET(req: Request, { params }: Ctx) {
  try {
    limit(req, 'room-state', 240);
    if (params.action !== 'state') throw new ApiError(404, 'Bulunamadı');
    return NextResponse.json(await getState(params.code, credsFrom(req)));
  } catch (e) { return fail(e); }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    limit(req, 'room-act', 120);
    const { code, action } = params;
    const c = credsFrom(req);
    switch (action) {
      case 'join': {
        const b = Join.parse(await req.json());
        return NextResponse.json(await joinRoom(code, b.nickname));
      }
      case 'start': await startGame(code, c); break;
      case 'guess': {
        const b = Guess.parse(await req.json());
        await submitGuess(code, c, b.lat, b.lng);
        break;
      }
      case 'advance': await advanceIfExpired(code, c); break;
      case 'next': await nextRound(code, c); break;
      default: throw new ApiError(404, 'Bulunamadı');
    }
    return NextResponse.json({ ok: true });
  } catch (e) { return fail(e); }
}
