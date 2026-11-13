
import 'server-only';

import { admin } from './supabase-server';
import { ApiError } from './http';
import { haversineKm } from './geo';
import type { LatLng } from './types';

export interface PreparedPanorama {
  imageId: string;
  sequenceId: string | null;
  location: LatLng;
}

// Konumları Supabase'den seçer.
// Oyun sırasında Mapillary'de yeni arama yapmaz.
export async function pickPreparedRounds(
  count: number
): Promise<PreparedPanorama[]> {
  const { data, error } = await admin().rpc(
    'pick_random_panoramas',
    { p_count: count }
  );

  if (error) {
    console.error('[pick_random_panoramas]', error);

    throw new ApiError(
      500,
      'Panorama havuzu sorgulanamadı'
    );
  }

  const result: PreparedPanorama[] = [];

  for (const row of data ?? []) {
    const location: LatLng = {
      lat: Number(row.lat),
      lng: Number(row.lng),
    };

    // Aynı oyunda birbirine çok yakın
    // konumların seçilmesini engelle.
    if (
      result.every(
        (previous) =>
          haversineKm(
            previous.location,
            location
          ) >= 25
      )
    ) {
      result.push({
        imageId: row.image_id,
        sequenceId: row.sequence_id,
        location,
      });
    }
  }

  if (result.length < count) {
    throw new ApiError(
      503,
      `Hazır havuzda ${count} farklı konum yok. Önce panorama havuzunu doldur.`
    );
  }

  return result;
}
