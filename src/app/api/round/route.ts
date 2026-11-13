
import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase-server';
import { getImageById } from '@/lib/mapillary';
import { signPayload } from '@/lib/sign';
import { limit } from '@/lib/ratelimit';
import { fail, ApiError } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Tek oyunculu yeni tur:
 * Konum Supabase panorama havuzundan seçilir.
 * Gerçek koordinatlar istemciye gönderilmez.
 */
export async function GET(req: Request) {
  try {
    limit(req, 'round', 40);

    // Hazır panorama havuzundan rastgele bir kayıt seç.
    const { data, error } = await admin().rpc(
      'pick_random_panoramas',
      { p_count: 5 }
    );

    if (error) {
      console.error('[round pool]', error);
      throw new ApiError(
        500,
        'Panorama havuzuna erişilemiyor'
      );
    }

    if (!data || data.length === 0) {
      throw new ApiError(
        503,
        'Panorama havuzu boş'
      );
    }

    // Rastgele seçilen kayıtları sırayla dene.
    // Bir görüntü silinmişse diğerine geç.
    let image = null;
    let location = null;

    for (const row of data) {
      try {
        image = await getImageById(row.image_id);

        location = {
          lat: Number(row.lat),
          lng: Number(row.lng),
        };

        break;
      } catch (err) {
        console.error(
          '[round image]',
          row.image_id,
          err
        );
      }
    }

    if (!image || !location) {
      throw new ApiError(
        503,
        'Hazır panoramaların görüntüleri alınamadı'
      );
    }

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
