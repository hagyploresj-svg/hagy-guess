import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyPayload } from '@/lib/sign';
import { haversineKm, scoreFor } from '@/lib/geo';
import { limit } from '@/lib/ratelimit';
import { ApiError, fail } from '@/lib/http';

export const dynamic = 'force-dynamic';

const Body = z.object({
  roundToken: z.string().max(600),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function POST(req: Request) {
  try {
    limit(req, 'guess', 60);
    const b = Body.parse(await req.json());
    const t = verifyPayload<{ lat: number; lng: number }>(b.roundToken);
    if (!t) throw new ApiError(400, 'Tur süresi doldu veya geçersiz');
    const actual = { lat: t.lat, lng: t.lng };
    const distanceKm = haversineKm({ lat: b.lat, lng: b.lng }, actual);
    return NextResponse.json({ actual, distanceKm, score: scoreFor(distanceKm) });
  } catch (e) { return fail(e); }
}
