
import { NextResponse } from 'next/server';
import { pickRandomLocation } from '@/lib/mapillary';
import { signPayload } from '@/lib/sign';
import { limit } from '@/lib/ratelimit';
import { fail } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Tek kişilik: yeni tur. Yanıtta koordinat YOK; yalnızca imzalı opak token var. */
export async function GET(req: Request) {
  try {
    limit(req, 'round', 40);

    const { image, location } = await pickRandomLocation();

    const roundToken = signPayload(
      {
        lat: location.lat,
        lng: location.lng,
        imageId: image.imageId,
      },
      2 * 60 * 60_000
    );

    return NextResponse.json({
      image,
      roundToken,
    });
  } catch (e) {
    return fail(e);
  }
}
