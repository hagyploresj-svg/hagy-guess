
import 'server-only';
import { env } from './env';
import { ApiError } from './http';
import { SEEDS } from './locations';
import { randomJitter } from './geo';
import type { LatLng, RoundImage } from './types';

const BASE = 'https://graph.mapillary.com';

const IMG_FIELDS =
  'id,is_pano,captured_at,sequence,thumb_2048_url,geometry,computed_geometry,creator';

const MAX_CONCURRENT = 4;
const MAX_PICK_ATTEMPTS = 10;
const PANO_ONLY_ATTEMPTS = 7;
const SEED_JITTER_DEG = 0.3;
const BBOX_HALF_DEG = 0.02;
const MOVE_STEP = 1;
const MIN_YEAR = 2014;

const CACHE_TTL = 10 * 60 * 1000;
const MAX_CACHE_SIZE = 800;

interface RawImage {
  id: string;
  is_pano?: boolean;
  captured_at?: number | string;
  sequence?: string;
  thumb_2048_url?: string;
  geometry?: { coordinates: [number, number] };
  computed_geometry?: { coordinates: [number, number] };
  creator?: {
    username?: string;
    id?: string;
  };
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

let active = 0;
const waiters: Array<() => void> = [];

async function acquire() {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }

  await new Promise<void>((resolve) => {
    waiters.push(resolve);
  });

  active++;
}

function release() {
  active--;
  waiters.shift()?.();
}

let blockedUntil = 0;

function busy(seconds: number) {
  return new ApiError(
    503,
    'Mapillary şu an yoğun. Biraz sonra tekrar dene.',
    seconds
  );
}

// Mapillary API istekleri
async function mly<T>(
  path: string,
  params: Record<string, string | number | boolean>
): Promise<T> {
  if (Date.now() < blockedUntil) {
    throw busy(
      Math.ceil((blockedUntil - Date.now()) / 1000)
    );
  }

  const url = new URL(path, BASE);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  await acquire();

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();

      const timer = setTimeout(() => {
        controller.abort();
      }, 5000);

      try {
        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `OAuth ${env.mapillaryToken}`,
          },
          signal: controller.signal,
          cache: 'no-store',
        });

        if (response.ok) {
          return (await response.json()) as T;
        }

        if (response.status === 429) {
          const retryAfter =
            Number(response.headers.get('retry-after')) || 10;

          blockedUntil = Date.now() + retryAfter * 1000;

          throw busy(retryAfter);
        }

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          throw new ApiError(
            500,
            'Mapillary API token geçersiz veya yetkisiz'
          );
        }

        if (response.status >= 500) {
          if (attempt < 2) {
            await sleep(300 * 2 ** attempt);
            continue;
          }
        }

        throw new ApiError(
          502,
          `Mapillary API hatası (${response.status})`
        );
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }

        if (attempt === 2) {
          throw new ApiError(
            502,
            "Mapillary'ye ulaşılamadı"
          );
        }

        await sleep(300 * 2 ** attempt);
      } finally {
        clearTimeout(timer);
      }
    }

    throw new ApiError(502, 'Mapillary yanıt vermedi');
  } finally {
    release();
  }
}

// Bellek önbelleği
const cache = new Map<
  string,
  { value: unknown; expires: number }
>();

function cacheGet<T>(key: string): T | undefined {
  const entry = cache.get(key);

  if (!entry) return undefined;

  if (entry.expires < Date.now()) {
    cache.delete(key);
    return undefined;
  }

  return entry.value as T;
}

function cacheSet(
  key: string,
  value: unknown,
  ttl = CACHE_TTL
) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = cache.keys().next().value;

    if (oldest) cache.delete(oldest);
  }

  cache.set(key, {
    value,
    expires: Date.now() + ttl,
  });
}

// Aynı görüntü için eşzamanlı API isteklerini birleştir
const pendingImages = new Map<
  string,
  Promise<RoundImage>
>();

function parse(
  raw: RawImage
): { image: RoundImage; location: LatLng } | null {
  const coordinates =
    (raw.computed_geometry ?? raw.geometry)?.coordinates;

  if (!raw.thumb_2048_url || !coordinates) {
    return null;
  }

  const [lng, lat] = coordinates;

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return null;
  }

  return {
    image: {
      imageId: raw.id,
      sequenceId: raw.sequence ?? null,
      isPano: raw.is_pano === true,
      imageUrl: raw.thumb_2048_url,
      creator: raw.creator?.username ?? null,
      capturedAt: raw.captured_at
        ? new Date(raw.captured_at).toISOString()
        : null,
    },
    location: { lat, lng },
  };
}

// Görüntü bağlantısı erişilebilir mi?
async function reachable(url: string): Promise<boolean> {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, 3000);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Rastgele bölge seçimi
const seedFails = new Map<number, number>();

function pickSeedIndex(): number {
  const weights = SEEDS.map(
    (_, index) =>
      1 / (1 + (seedFails.get(index) ?? 0))
  );

  const total = weights.reduce(
    (sum, weight) => sum + weight,
    0
  );

  let random = Math.random() * total;

  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];

    if (random <= 0) return i;
  }

  return 0;
}

// Rastgele sokak görüntüsü seç
export async function pickRandomLocation(): Promise<{
  image: RoundImage;
  location: LatLng;
}> {
  for (let attempt = 0; attempt < MAX_PICK_ATTEMPTS; attempt++) {
    const seedIndex = pickSeedIndex();

    const [, lat, lng] = SEEDS[seedIndex];

    const center = randomJitter(
      { lat, lng },
      SEED_JITTER_DEG
    );

    const bbox = [
      center.lng - BBOX_HALF_DEG,
      center.lat - BBOX_HALF_DEG,
      center.lng + BBOX_HALF_DEG,
      center.lat + BBOX_HALF_DEG,
    ]
      .map((value) => value.toFixed(5))
      .join(',');

    const panoOnly =
      attempt < PANO_ONLY_ATTEMPTS;

    let rawImages: RawImage[] = [];

    try {
      const response = await mly<{
        data?: RawImage[];
      }>('/images', {
        bbox,
        fields: IMG_FIELDS,
        limit: 100,
        ...(panoOnly ? { is_pano: true } : {}),
      });

      rawImages = response.data ?? [];
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status !== 502
      ) {
        throw error;
      }

      seedFails.set(
        seedIndex,
        (seedFails.get(seedIndex) ?? 0) + 1
      );

      continue;
    }

    const candidates = rawImages
      .map(parse)
      .filter(
        (
          item
        ): item is NonNullable<
          ReturnType<typeof parse>
        > => item !== null
      )
      .filter(
        (item) =>
          !panoOnly || item.image.isPano
      )
      .filter(
        (item) =>
          !item.image.capturedAt ||
          new Date(
            item.image.capturedAt
          ).getUTCFullYear() >= MIN_YEAR
      )
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    for (const candidate of candidates) {
      if (
        await reachable(candidate.image.imageUrl)
      ) {
        cacheSet(
          `img:${candidate.image.imageId}`,
          candidate.image
        );

        return candidate;
      }
    }

    seedFails.set(
      seedIndex,
      (seedFails.get(seedIndex) ?? 0) + 1
    );
  }

  throw new ApiError(
    503,
    'Uygun sokak görüntüsü bulunamadı. Tekrar dene.',
    3
  );
}

// Görüntüyü ID ile getir
export async function getImageById(
  id: string
): Promise<RoundImage> {
  const cached = cacheGet<RoundImage>(`img:${id}`);

  if (cached) return cached;

  const existing = pendingImages.get(id);

  if (existing) return existing;

  const request = (async () => {
    const raw = await mly<RawImage>(
      `/${encodeURIComponent(id)}`,
      { fields: IMG_FIELDS }
    );

    const parsed = parse(raw);

    if (!parsed) {
      throw new ApiError(
        502,
        'Görüntü alınamadı'
      );
    }

    cacheSet(`img:${id}`, parsed.image);

    return parsed.image;
  })();

  pendingImages.set(id, request);

  try {
    return await request;
  } finally {
    pendingImages.delete(id);
  }
}

// Sekans kimliklerini önbellekle
const pendingSequences = new Map<
  string,
  Promise<string[]>
>();

async function sequenceIds(
  sequenceId: string
): Promise<string[]> {
  const cacheKey = `seq:${sequenceId}`;

  const cached = cacheGet<string[]>(cacheKey);

  if (cached) return cached;

  const existing = pendingSequences.get(sequenceId);

  if (existing) return existing;

  const request = (async () => {
    const response = await mly<{
      data?: { id: string }[];
    }>('/image_ids', {
      sequence_id: sequenceId,
    });

    const ids = (response.data ?? []).map(
      (item) => item.id
    );

    cacheSet(cacheKey, ids);

    return ids;
  })();

  pendingSequences.set(sequenceId, request);

  try {
    return await request;
  } finally {
    pendingSequences.delete(sequenceId);
  }
}

// İleri ve geri hareket
export async function moveAlong(
  imageId: string,
  sequenceId: string,
  direction: 'next' | 'prev'
): Promise<RoundImage> {
  const ids = await sequenceIds(sequenceId);

  const index = ids.indexOf(imageId);

  if (index < 0) {
    throw new ApiError(
      404,
      'Görüntü bu sekansta bulunamadı'
    );
  }

  const targetIndex =
    index +
    (direction === 'next'
      ? MOVE_STEP
      : -MOVE_STEP);

  if (
    targetIndex < 0 ||
    targetIndex >= ids.length
  ) {
    throw new ApiError(
      404,
      'Bu yönde başka görüntü yok'
    );
  }

  return getImageById(ids[targetIndex]);
}
