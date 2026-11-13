
import 'server-only';

import { env } from './env';
import { admin } from './supabase-server';
import { ApiError } from './http';
import { SEEDS } from './locations';
import { randomJitter, haversineKm } from './geo';
import type { LatLng, RoundImage } from './types';

const BASE = 'https://graph.mapillary.com';

const IMG_FIELDS =
  'id,is_pano,captured_at,sequence,thumb_2048_url,thumb_original_url,geometry,computed_geometry,creator';

const MAX_CONCURRENT = 4;
const REQUEST_TIMEOUT_MS = 5000;
const MOVE_STEP = 3;
const MIN_YEAR = 2014;

const SEED_JITTER_DEG = 0.12;
const BBOX_HALF_DEG = 0.035;
const MIN_DISTANCE_KM = 25;

const CACHE_TTL = 30 * 60 * 1000;
const MAX_CACHE_SIZE = 1000;
const RECENT_TTL = 60 * 60 * 1000;

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

interface PoolRow {
  image_id: string;
  sequence_id: string | null;
  lat: number;
  lng: number;
  region: string | null;
  last_used_at?: string | null;
  use_count?: number;
}

// --------------------------------------------------
// ÖNBELLEK
// --------------------------------------------------

const cache = new Map<
  string,
  {
    value: unknown;
    expires: number;
  }
>();

function cacheGet<T>(key: string): T | undefined {
  const item = cache.get(key);

  if (!item) return undefined;

  if (item.expires <= Date.now()) {
    cache.delete(key);
    return undefined;
  }

  return item.value as T;
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
    const first = cache.keys().next().value;

    if (first === undefined) break;

    cache.delete(first);
  }

  cache.set(key, {
    value,
    expires: Date.now() + ttl,
  });
}

// --------------------------------------------------
// MAPILLARY API SINIRLAMA
// --------------------------------------------------

let activeRequests = 0;

const waiters: Array<() => void> = [];

async function acquire(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++;
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
    activeRequests--;
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
  params: Record<
    string,
    string | number | boolean
  >
): Promise<T> {
  if (Date.now() < blockedUntil) {
    throw busy(
      Math.ceil(
        (blockedUntil - Date.now()) / 1000
      )
    );
  }

  const url = new URL(path, BASE);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  await acquire();

  try {
    const controller = new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    try {
      const response = await fetch(
        url.toString(),
        {
          headers: {
            Authorization:
              `OAuth ${env.mapillaryToken}`,
          },
          signal: controller.signal,
          cache: 'no-store',
        }
      );

      if (response.status === 429) {
        const retryAfter = Math.min(
          60,
          Math.max(
            1,
            Number(
              response.headers.get(
                'retry-after'
              )
            ) || 10
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
          'Mapillary API token geçersiz'
        );
      }

      if (!response.ok) {
        throw new ApiError(
          502,
          `Mapillary API hatası (${response.status})`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        502,
        'Mapillary bağlantısı başarısız'
      );
    } finally {
      clearTimeout(timer);
    }
  } finally {
    release();
  }
}

// --------------------------------------------------
// PANORAMA VERİSİNİ DÖNÜŞTÜR
// --------------------------------------------------

function parse(
  raw: RawImage
): LocationCandidate | null {
  const coordinates =
    (
      raw.computed_geometry ??
      raw.geometry
    )?.coordinates;

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
    new Date(capturedAt).getUTCFullYear() <
      MIN_YEAR
  ) {
    return null;
  }

  return {
    image: {
      imageId: raw.id,
      sequenceId:
        raw.sequence ?? null,
      isPano: true,
      imageUrl,
      creator:
        raw.creator?.username ?? null,
      capturedAt,
    },
    location: {
      lat,
      lng,
    },
  };
}

// --------------------------------------------------
// RASTGELE ARAMA BÖLGELERİ
// --------------------------------------------------

// SEEDS yalnızca arama başlangıç noktalarıdır.
// Oyunda gösterilen gerçek konumlar Mapillary'den gelir.

function regionKey(index: number): string {
  return `seed-${index}`;
}

function shuffledSeedIndexes(): number[] {
  const indexes = SEEDS.map(
    (_, index) => index
  );

  for (
    let i = indexes.length - 1;
    i > 0;
    i--
  ) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [
      indexes[i],
      indexes[j],
    ] = [
      indexes[j],
      indexes[i],
    ];
  }

  return indexes;
}

// --------------------------------------------------
// SUPABASE PANORAMA HAVUZU
// --------------------------------------------------

async function readPool(
  region: string
): Promise<PoolRow[]> {
  const result = await admin()
    .from('panorama_pool')
    .select(
      'image_id,sequence_id,lat,lng,region,last_used_at,use_count'
    )
    .eq('region', region)
    .order('last_used_at', {
      ascending: true,
      nullsFirst: true,
    })
    .limit(100);

  if (result.error) {
    console.error(
      'Panorama havuzu okunamadı:',
      result.error
    );

    return [];
  }

  return (result.data ?? []) as PoolRow[];
}

async function savePool(
  region: string,
  candidates: LocationCandidate[]
): Promise<void> {
  if (!candidates.length) return;

  const rows = candidates.map(
    (item) => ({
      image_id:
        item.image.imageId,
      sequence_id:
        item.image.sequenceId,
      lat:
        item.location.lat,
      lng:
        item.location.lng,
      region,
    })
  );

  const result = await admin()
    .from('panorama_pool')
    .upsert(rows, {
      onConflict: 'image_id',
      ignoreDuplicates: true,
    });

  if (result.error) {
    console.error(
      'Panorama kaydetme hatası:',
      result.error
    );
  }
}

// --------------------------------------------------
// YENİ PANORAMA KEŞFET
// --------------------------------------------------

async function discoverRegion(
  seedIndex: number
): Promise<LocationCandidate[]> {
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

  const response = await mly<{
    data?: RawImage[];
  }>('/images', {
    bbox,
    fields: IMG_FIELDS,
    limit: 100,
    is_pano: true,
  });

  const candidates = (
    response.data ?? []
  )
    .map(parse)
    .filter(
      (
        item
      ): item is LocationCandidate =>
        item !== null
    );

  for (const candidate of candidates) {
    cacheSet(
      `img:${candidate.image.imageId}`,
      candidate.image
    );
  }

  await savePool(
    regionKey(seedIndex),
    candidates
  );

  return candidates;
}

// Aynı bölge için tekrar eden
// eşzamanlı API çağrılarını birleştir.

const pendingRegions = new Map<
  number,
  Promise<LocationCandidate[]>
>();

async function loadRegion(
  seedIndex: number
): Promise<LocationCandidate[]> {
  const existing =
    pendingRegions.get(seedIndex);

  if (existing) {
    return existing;
  }

  const request =
    discoverRegion(seedIndex);

  pendingRegions.set(
    seedIndex,
    request
  );

  try {
    return await request;
  } finally {
    pendingRegions.delete(seedIndex);
  }
}

// --------------------------------------------------
// TEKRAR EDEN KONUM KONTROLÜ
// --------------------------------------------------

const recentIds = new Map<
  string,
  number
>();

function isRecent(id: string): boolean {
  const usedAt = recentIds.get(id);

  return (
    usedAt !== undefined &&
    Date.now() - usedAt < RECENT_TTL
  );
}

function rememberUsed(id: string): void {
  recentIds.set(id, Date.now());

  while (recentIds.size > 1000) {
    const first =
      recentIds.keys().next().value;

    if (first === undefined) break;

    recentIds.delete(first);
  }

  // Kullanım zamanını kalıcı kaydet.
  // Oyun bu güncellemeyi beklemez.

  void admin()
    .from('panorama_pool')
    .update({
      last_used_at:
        new Date().toISOString(),
    })
    .eq('image_id', id)
    .then(({ error }) => {
      if (error) {
        console.error(
          'Kullanım zamanı güncellenemedi:',
          error
        );
      }
    });
}

function sufficientlyDifferent(
  candidate: LocationCandidate,
  selected: LocationCandidate[]
): boolean {
  return selected.every(
    (previous) => {
      if (
        previous.image.imageId ===
        candidate.image.imageId
      ) {
        return false;
      }

      return (
        haversineKm(
          previous.location,
          candidate.location
        ) >= MIN_DISTANCE_KM
      );
    }
  );
}

function randomItem<T>(
  items: T[]
): T {
  return items[
    Math.floor(
      Math.random() * items.length
    )
  ];
}

// --------------------------------------------------
// BÖLGEDEN KONUM SEÇ
// --------------------------------------------------

async function pickFromRegion(
  seedIndex: number,
  selected: LocationCandidate[]
): Promise<LocationCandidate | null> {
  const region =
    regionKey(seedIndex);

  // Önce Supabase'deki hazır
  // panoramaları kontrol et.

  const stored =
    await readPool(region);

  const usable = stored.filter(
    (row) => {
      if (isRecent(row.image_id)) {
        return false;
      }

      return selected.every(
        (previous) => {
          if (
            previous.image.imageId ===
            row.image_id
          ) {
            return false;
          }

          return (
            haversineKm(
              previous.location,
              {
                lat: row.lat,
                lng: row.lng,
              }
            ) >= MIN_DISTANCE_KM
          );
        }
      );
    }
  );

  if (usable.length) {
    // En eski kullanılanlardan
    // rastgele seçim yap.

    const choices = usable
      .slice(0, 20)
      .sort(
        () => Math.random() - 0.5
      );

    for (const row of choices) {
      try {
        const image =
          await getImageById(
            row.image_id
          );

        return {
          image,
          location: {
            lat: row.lat,
            lng: row.lng,
          },
        };
      } catch {
        // Görüntü geçersizse
        // diğerini dene.
      }
    }
  }

  // Havuz boşsa yeni panorama ara.

  const discovered =
    await loadRegion(seedIndex);

  const valid = discovered.filter(
    (candidate) =>
      !isRecent(
        candidate.image.imageId
      ) &&
      sufficientlyDifferent(
        candidate,
        selected
      )
  );

  return valid.length
    ? randomItem(valid)
    : null;
}

// --------------------------------------------------
// TEK OYUNCULU KONUM SEÇİMİ
// --------------------------------------------------

export async function pickRandomLocation(): Promise<{
  image: RoundImage;
  location: LatLng;
}> {
  const indexes =
    shuffledSeedIndexes();

  for (
    const index of indexes.slice(0, 12)
  ) {
    try {
      const candidate =
        await pickFromRegion(
          index,
          []
        );

      if (candidate) {
        rememberUsed(
          candidate.image.imageId
        );

        return candidate;
      }
    } catch (error) {
      console.error(
        'Bölge seçilemedi:',
        index,
        error
      );
    }
  }

  throw new ApiError(
    503,
    '360° panorama bulunamadı. Tekrar dene.',
    3
  );
}

// --------------------------------------------------
// MULTIPLAYER KONUM SEÇİMİ
// --------------------------------------------------

export async function pickGameLocations(
  count: number
): Promise<LocationCandidate[]> {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 20
  ) {
    throw new ApiError(
      400,
      'Geçersiz tur sayısı'
    );
  }

  const selected:
    LocationCandidate[] = [];

  const indexes =
    shuffledSeedIndexes();

  // Dörder farklı arama bölgesini
  // paralel olarak kontrol et.

  for (
    let offset = 0;
    offset < indexes.length &&
    selected.length < count;
    offset += MAX_CONCURRENT
  ) {
    const group = indexes.slice(
      offset,
      offset + MAX_CONCURRENT
    );

    const results =
      await Promise.allSettled(
        group.map(
          (index) =>
            pickFromRegion(
              index,
              selected
            )
        )
      );

    for (const result of results) {
      if (
        selected.length >= count
      ) {
        break;
      }

      if (
        result.status !== 'fulfilled' ||
        !result.value
      ) {
        continue;
      }

      const candidate =
        result.value;

      if (
        sufficientlyDifferent(
          candidate,
          selected
        )
      ) {
        selected.push(
          candidate
        );

        rememberUsed(
          candidate.image.imageId
        );
      }
    }
  }

  if (
    selected.length < count
  ) {
    throw new ApiError(
      503,
      'Yeterince farklı 360° panorama bulunamadı.',
      3
    );
  }

  return selected;
}

// --------------------------------------------------
// ID İLE PANORAMA GETİR
// --------------------------------------------------

const pendingImages = new Map<
  string,
  Promise<RoundImage>
>();

export async function getImageById(
  id: string
): Promise<RoundImage> {
  const cached =
    cacheGet<RoundImage>(
      `img:${id}`
    );

  if (cached) {
    return cached;
  }

  const existing =
    pendingImages.get(id);

  if (existing) {
    return existing;
  }

  const request = (async () => {
    const raw =
      await mly<RawImage>(
        `/${encodeURIComponent(id)}`,
        {
          fields: IMG_FIELDS,
        }
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

  pendingImages.set(
    id,
    request
  );

  try {
    return await request;
  } finally {
    pendingImages.delete(id);
  }
}

// --------------------------------------------------
// SEKANS ÖNBELLEĞİ
// --------------------------------------------------

const pendingSequences = new Map<
  string,
  Promise<string[]>
>();

async function sequenceIds(
  sequenceId: string
): Promise<string[]> {
  const key =
    `seq:${sequenceId}`;

  const cached =
    cacheGet<string[]>(key);

  if (cached) {
    return cached;
  }

  const existing =
    pendingSequences.get(
      sequenceId
    );

  if (existing) {
    return existing;
  }

  const request = (async () => {
    const response =
      await mly<{
        data?: {
          id: string;
        }[];
      }>('/image_ids', {
        sequence_id: sequenceId,
      });

    const ids = (
      response.data ?? []
    ).map(
      (item) => item.id
    );

    cacheSet(
      key,
      ids
    );

    return ids;
  })();

  pendingSequences.set(
    sequenceId,
    request
  );

  try {
    return await request;
  } finally {
    pendingSequences.delete(
      sequenceId
    );
  }
}

// --------------------------------------------------
// 3 KARE İLERİ / GERİ
// --------------------------------------------------

export async function moveAlong(
  imageId: string,
  sequenceId: string,
  direction: 'next' | 'prev'
): Promise<RoundImage> {
  const ids =
    await sequenceIds(
      sequenceId
    );

  const index =
    ids.indexOf(imageId);

  if (index < 0) {
    throw new ApiError(
      404,
      'Görüntü bu sekansta bulunamadı'
    );
  }

  const targetIndex =
    index +
    (
      direction === 'next'
        ? MOVE_STEP
        : -MOVE_STEP
    );

  if (
    targetIndex < 0 ||
    targetIndex >= ids.length
  ) {
    throw new ApiError(
      404,
      'Bu yönde başka görüntü yok'
    );
  }

  return getImageById(
    ids[targetIndex]
  );
}
