
import 'server-only';

import { env } from './env';
import { ApiError } from './http';
import { SEEDS } from './locations';
import { randomJitter } from './geo';
import type { LatLng, RoundImage } from './types';

const BASE = 'https://graph.mapillary.com';

const IMG_FIELDS =
  'id,is_pano,captured_at,sequence,thumb_2048_url,thumb_original_url,geometry,computed_geometry,creator';

const MAX_CONCURRENT = 4;
const MAX_PICK_ATTEMPTS = 8;
const MOVE_STEP = 3;
const MIN_YEAR = 2014;

const SEED_JITTER_DEG = 0.12;
const BBOX_HALF_DEG = 0.035;

const REQUEST_TIMEOUT_MS = 4000;
const CACHE_TTL = 30 * 60 * 1000;
const MAX_CACHE_SIZE = 1000;

const POOL_MAX_SIZE = 250;
const POOL_TTL = 60 * 60 * 1000;

interface RawImage {
  id: string;
  is_pano?: boolean;
  captured_at?: number | string;
  sequence?: string;
  thumb_2048_url?: string;
  thumb_original_url?: string;
  geometry?: {
    coordinates: [number, number];
  };
  computed_geometry?: {
    coordinates: [number, number];
  };
  creator?: {
    username?: string;
    id?: string;
  };
}

interface LocationCandidate {
  image: RoundImage;
  location: LatLng;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// API istek sınırı
let active = 0;
const waiters: Array<() => void> = [];

async function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }

  await new Promise<void>((resolve) => {
    waiters.push(resolve);
  });
}

function release(): void {
  const next = waiters.shift();

  if (next) {
    next();
  } else {
    active--;
  }
}

let blockedUntil = 0;

function busy(seconds: number): ApiError {
  return new ApiError(
    503,
    'Mapillary şu an yoğun. Biraz sonra tekrar dene.',
    seconds
  );
}

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
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();

      const timer = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS
      );

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
          const retryAfter = Math.min(
            60,
            Math.max(
              1,
              Number(response.headers.get('retry-after')) || 10
            )
          );

          blockedUntil =
            Date.now() + retryAfter * 1000;

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

        if (response.status >= 500 && attempt === 0) {
          await sleep(200);
          continue;
        }

        throw new ApiError(
          502,
          `Mapillary API hatası (${response.status})`
        );
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }

        if (attempt === 1) {
          throw new ApiError(
            502,
            "Mapillary'ye ulaşılamadı"
          );
        }

        await sleep(200);
      } finally {
        clearTimeout(timer);
      }
    }

    throw new ApiError(
      502,
      'Mapillary yanıt vermedi'
    );
  } finally {
    release();
  }
}

// Genel önbellek
const cache = new Map<
  string,
  {
    value: unknown;
    expires: number;
  }
>();

function cacheGet<T>(key: string): T | undefined {
  const entry = cache.get(key);

  if (!entry) return undefined;

  if (entry.expires <= Date.now()) {
    cache.delete(key);
    return undefined;
  }

  return entry.value as T;
}

function cacheSet(
  key: string,
  value: unknown,
  ttl = CACHE_TTL
): void {
  if (cache.has(key)) {
    cache.delete(key);
  }

  while (cache.size >= MAX_CACHE_SIZE) {
    const oldest = cache.keys().next().value;

    if (oldest === undefined) break;

    cache.delete(oldest);
  }

  cache.set(key, {
    value,
    expires: Date.now() + ttl,
  });
}

// Hazır panorama havuzu
const locationPool = new Map<
  string,
  {
    candidate: LocationCandidate;
    expires: number;
  }
>();

const recentlyUsed = new Map<string, number>();

function addToPool(
  candidate: LocationCandidate
): void {
  const id = candidate.image.imageId;

  if (locationPool.has(id)) {
    return;
  }

  while (locationPool.size >= POOL_MAX_SIZE) {
    const oldest = locationPool.keys().next().value;

    if (oldest === undefined) break;

    locationPool.delete(oldest);
  }

  locationPool.set(id, {
    candidate,
    expires: Date.now() + POOL_TTL,
  });
}

function takeFromPool(): LocationCandidate | null {
  const now = Date.now();

  for (const [id, entry] of locationPool) {
    if (entry.expires <= now) {
      locationPool.delete(id);
    }
  }

  for (const [id, usedAt] of recentlyUsed) {
    if (now - usedAt > POOL_TTL) {
      recentlyUsed.delete(id);
    }
  }

  const available = [...locationPool.values()]
    .map((entry) => entry.candidate)
    .filter(
      (candidate) =>
        !recentlyUsed.has(candidate.image.imageId)
    );

  if (!available.length) {
    return null;
  }

  const selected =
    available[Math.floor(Math.random() * available.length)];

  locationPool.delete(selected.image.imageId);
  recentlyUsed.set(selected.image.imageId, now);

  return selected;
}

function parse(raw: RawImage): LocationCandidate | null {
  const coordinates =
    (raw.computed_geometry ?? raw.geometry)?.coordinates;

  const imageUrl =
    raw.thumb_2048_url ??
    raw.thumb_original_url;

  if (
    !raw.id ||
    !raw.is_pano ||
    !imageUrl ||
    !coordinates
  ) {
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

  let capturedAt: string | null = null;

  if (raw.captured_at) {
    const date = new Date(raw.captured_at);

    if (!Number.isNaN(date.getTime())) {
      capturedAt = date.toISOString();
    }
  }

  if (
    capturedAt &&
    new Date(capturedAt).getUTCFullYear() < MIN_YEAR
  ) {
    return null;
  }

  return {
    image: {
      imageId: raw.id,
      sequenceId: raw.sequence ?? null,
      isPano: true,
      imageUrl,
      creator: raw.creator?.username ?? null,
      capturedAt,
    },
    location: { lat, lng },
  };
}

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

    if (random <= 0) {
      return i;
    }
  }

  return 0;
}

// Mapillary'den birden fazla panorama al
async function fetchLocationBatch():
  Promise<LocationCandidate[]> {
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

  try {
    const response = await mly<{
      data?: RawImage[];
    }>('/images', {
      bbox,
      fields: IMG_FIELDS,
      limit: 100,
      is_pano: true,
    });

    const candidates = (response.data ?? [])
      .map(parse)
      .filter(
        (item): item is LocationCandidate =>
          item !== null
      );

    if (!candidates.length) {
      seedFails.set(
        seedIndex,
        (seedFails.get(seedIndex) ?? 0) + 1
      );

      return [];
    }

    seedFails.set(
      seedIndex,
      Math.max(
        0,
        (seedFails.get(seedIndex) ?? 0) - 1
      )
    );

    // Tek API isteğinden çok sayıda konum sakla.
    for (const candidate of candidates) {
      addToPool(candidate);

      cacheSet(
        `img:${candidate.image.imageId}`,
        candidate.image
      );
    }

    return candidates;
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

    return [];
  }
}

// Aynı anda gelen havuz doldurma isteklerini birleştir
let pendingBatch: Promise<LocationCandidate[]> | null = null;

function loadBatch(): Promise<LocationCandidate[]> {
  if (pendingBatch) {
    return pendingBatch;
  }

  const request = fetchLocationBatch();

  pendingBatch = request;

  void request.finally(() => {
    if (pendingBatch === request) {
      pendingBatch = null;
    }
  }).catch(() => {});

  return request;
}

// Rastgele 360 derece panorama seç
export async function pickRandomLocation(): Promise<{
  image: RoundImage;
  location: LatLng;
}> {
  const pooled = takeFromPool();

  if (pooled) {
    return pooled;
  }

  for (
    let attempt = 0;
    attempt < MAX_PICK_ATTEMPTS;
    attempt++
  ) {
    await loadBatch();

    const candidate = takeFromPool();

    if (candidate) {
      return candidate;
    }
  }

  throw new ApiError(
    503,
    '360° panorama bulunamadı. Tekrar dene.',
    3
  );
}

// ID ile panorama getir
const pendingImages = new Map<
  string,
  Promise<RoundImage>
>();

export async function getImageById(
  id: string
): Promise<RoundImage> {
  const cached = cacheGet<RoundImage>(
    `img:${id}`
  );

  if (cached) {
    return cached;
  }

  const existing = pendingImages.get(id);

  if (existing) {
    return existing;
  }

  const request = (async () => {
    const raw = await mly<RawImage>(
      `/${encodeURIComponent(id)}`,
      { fields: IMG_FIELDS }
    );

    const parsed = parse(raw);

    if (!parsed) {
      throw new ApiError(
        502,
        '360° görüntü alınamadı'
      );
    }

    cacheSet(
      `img:${id}`,
      parsed.image
    );

    return parsed.image;
  })();

  pendingImages.set(id, request);

  try {
    return await request;
  } finally {
    pendingImages.delete(id);
  }
}

// Sekans bilgilerini önbellekle
const pendingSequences = new Map<
  string,
  Promise<string[]>
>();

async function sequenceIds(
  sequenceId: string
): Promise<string[]> {
  const cacheKey = `seq:${sequenceId}`;

  const cached = cacheGet<string[]>(
    cacheKey
  );

  if (cached) {
    return cached;
  }

  const existing = pendingSequences.get(sequenceId);

  if (existing) {
    return existing;
  }

  const request = (async () => {
    const response = await mly<{
      data?: { id: string }[];
    }>('/image_ids', {
      sequence_id: sequenceId,
    });

    const ids = (response.data ?? [])
      .map((item) => item.id);

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

// 3 kare ileri veya geri
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
