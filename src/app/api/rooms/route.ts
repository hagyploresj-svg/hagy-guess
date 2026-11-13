import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createRoom } from '@/lib/rooms';
import { limit } from '@/lib/ratelimit';
import { fail } from '@/lib/http';

export const dynamic = 'force-dynamic';

const Body = z.object({
  nickname: z.string().min(1).max(40),
  totalRounds: z.number().int().min(1).max(10).default(5),
  timeLimitSec: z.number().int().min(0).max(600).default(120),
});

export async function POST(req: Request) {
  try {
    limit(req, 'room-create', 10);
    const b = Body.parse(await req.json());
    return NextResponse.json(await createRoom(b.nickname, b.totalRounds, b.timeLimitSec));
  } catch (e) { return fail(e); }
}
