
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { refillPanoramaPool } from '@/lib/mapillary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function validSecret(provided: string): boolean {
  const expected =
    process.env.PANORAMA_REFILL_SECRET;

  if (!expected || expected.length < 24) {
    return false;
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  return (
    a.length === b.length &&
    timingSafeEqual(a, b)
  );
}

export async function POST(req: NextRequest) {
  const provided =
    req.headers.get('x-refill-secret') ?? '';

  if (!validSecret(provided)) {
    return NextResponse.json(
      { error: 'Yetkisiz istek' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));

    const requestedCount = Number(body.count ?? 3);

    if (
      !Number.isInteger(requestedCount) ||
      requestedCount < 1 ||
      requestedCount > 5
    ) {
      return NextResponse.json(
        { error: 'count 1 ile 5 arasında olmalı' },
        { status: 400 }
      );
    }

    const result = await refillPanoramaPool(
      requestedCount
    );

    return NextResponse.json({
      success: true,
      message: 'Panorama taraması tamamlandı',
      ...result,
    });
  } catch (error) {
    console.error('[panorama/refill]', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Panorama taraması başarısız',
      },
      { status: 500 }
    );
  }
}
