import { NextResponse } from 'next/server';
import { z } from 'zod';
import { moveAlong } from '@/lib/mapillary';
import { limit } from '@/lib/ratelimit';
import { fail } from '@/lib/http';

export const dynamic = 'force-dynamic';

const Body = z.object({
  imageId: z.string().regex(/^\d{5,25}$/),
  sequenceId: z.string().regex(/^[\w-]{5,80}$/),
  dir: z.enum(['next', 'prev']),
});

/** Sekans üzerinde ileri/geri. Koordinat döndürmez (hile önleme). */
export async function POST(req: Request) {
  try {
    limit(req, 'move', 120);
    const b = Body.parse(await req.json());
    const image = await moveAlong(b.imageId, b.sequenceId, b.dir);
    return NextResponse.json({ image });
  } catch (e) { return fail(e); }
}
