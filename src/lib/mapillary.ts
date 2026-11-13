import 'server-only';
import { env } from './env';
import { ApiError } from './http';
import { SEEDS } from './locations';
import { randomJitter } from './geo';
import type { LatLng, RoundImage } from './types';

/**
 * Mapillary Graph API istemcisi (SADECE sunucu). Token tarayıcıya hiçbir zaman gitmez.
 * Docs: https://www.mapillary.com/developer/api-documentation
 */
const BASE = 'https://graph.mapillary.com';
const IMG_FIELDS = 'id,is_pano,captured_at,sequence,thumb_2048_url,geometry,computed_geometry,creator';

const MAX_CONCURRENT = 4;        // eşzamanlı Mapillary isteği sınırı
const MAX_PICK_ATTEMPTS = 10;    // yeni konum seçme denemesi
const PANO_ONLY_ATTEMPTS = 7;    // ilk N deneme sadece 360° panorama
const SEED_JITTER_DEG = 0.3;     // tohum etrafında rastgele sapma (~30 km)
const BBOX_HALF_DEG = 0.02;      // arama kutusu yarıçapı (API bbox alan sınırının altında)
const MOVE_STEP = 2;             // ileri/geri hareket: sekansta kaç kare atlanır
const MIN_YEAR = 2014;

interface RawImage {
  id: string;
  is_pano?: boolean;
  captured_at?: number | string;
  sequence?: string;
  thumb_2048_url?: string;
  geometry?: { coordinates: [number, number] };
  computed_geometry?: { coordinates: [number, number] };
  creator?: { username?: string; id?: string };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- eşzamanlılık sınırı + 429 koruması ----
let active = 0;
const waiters: (() => void)[] = [];
async function acquire() {
  if (active < MAX_CONCURRENT) { active++; return; }
  await new Promise<void>((r) => waiters.push(r));
  active++;
}
function release() { active--; waiters.shift()?.(); }

let blockedUntil = 0;
const busy = (sec: number) =>
  new ApiError(503, 'Mapillary şu an yoğun. Birkaç saniye sonra tekrar dene.', sec);

async function mly<T>(path: string, params: Record<string, string | number | boolean>): Promise<T> {
  if (Date.now() < blockedUntil) throw busy(Math.ceil((blockedUntil - Date.now()) / 1000));
  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  await acquire();
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        const res = await fetch(url, {
          headers: { Authorization: `OAuth ${env.mapillaryToken}` }, // URL'de token yok → loglara sızmaz
          signal: ctrl.signal,
          cache: 'no-store',
        });
        if (res.ok) return (await res.json()) as T;
        if (res.status === 429) {
          const ra = Number(res.headers.get('retry-after')) || 10;
          blockedUntil = Date.now() + ra * 1000;
          throw busy(ra);
        }
        if (res.status >= 500) { await sleep(400 * 2 ** attempt); continue; }
        if (res.status === 401 || res.status === 403) throw new ApiError(500, 'Mapillary token geçersiz veya yetkisiz');
        throw new ApiError(502, `Mapillary hatası (${res.status})`);
      } catch (e) {
        if (e instanceof ApiError) throw e;
        if (attempt === 2) throw new ApiError(502, "Mapillary'ye ulaşılamadı");
        await sleep(400 * 2 ** attempt);
      } finally {
        clearTimeout(timer);
      }
    }
    throw new ApiError(502, 'Mapillary yanıt vermedi');
  } finally {
    release();
  }
}

// ---- küçük bellek önbelleği ----
const cache = new Map<string, { v: unknown; exp: number }>();
function cget<T>(k: string): T | undefined {
  const e = cache.get(k);
  if (!e) return undefined;
  if (e.exp < Date.now()) { cache.delete(k); return undefined; }
  return e.v as T;
}
function cset(k: string, v: unknown, ttlMs: number) {
  if (cache.size > 800) cache.delete(cache.keys().next().value as string);
  cache.set(k, { v, exp: Date.now() + ttlMs });
}

function parse(raw: RawImage): { image: RoundImage; location: LatLng } | null {
  const c = (raw.computed_geometry ?? raw.geometry)?.coordinates;
  if (!raw.thumb_2048_url || !c) return null;
  return {
    image: {
      imageId: raw.id,
      sequenceId: raw.sequence ?? null,
      isPano: raw.is_pano === true,
      imageUrl: raw.thumb_2048_url,
      creator: raw.creator?.username ?? null,
      capturedAt: raw.captured_at ? new Date(raw.captured_at).toISOString() : null,
    },
    location: { lat: c[1], lng: c[0] },
  };
}

async function reachable(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch { return false; }
}

// ---- tohum seçimi (başarısız bölgelerin ağırlığı düşer) ----
const seedFails = new Map<number, number>();
function pickSeedIndex(): number {
  const w = SEEDS.map((_, i) => 1 / (1 + (seedFails.get(i) ?? 0)));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
  return 0;
}

/** Rastgele, doğrulanmış (URL erişilebilir) bir Mapillary görüntüsü + gerçek konumu. */
export async function pickRandomLocation(): Promise<{ image: RoundImage; location: LatLng }> {
  for (let i = 0; i < MAX_PICK_ATTEMPTS; i++) {
    const si = pickSeedIndex();
    const [, lat, lng] = SEEDS[si];
    const c = randomJitter({ lat, lng }, SEED_JITTER_DEG);
    const bbox = [c.lng - BBOX_HALF_DEG, c.lat - BBOX_HALF_DEG, c.lng + BBOX_HALF_DEG, c.lat + BBOX_HALF_DEG]
      .map((n) => n.toFixed(5)).join(',');
    const panoOnly = i < PANO_ONLY_ATTEMPTS;

    let raws: RawImage[] = [];
    try {
      const r = await mly<{ data?: RawImage[] }>('/images', {
        bbox, fields: IMG_FIELDS, limit: 100, ...(panoOnly ? { is_pano: true } : {}),
      });
      raws = r.data ?? [];
    } catch (e) {
      if (e instanceof ApiError && e.status !== 502) throw e; // 429/401 vb. → hemen bildir
      seedFails.set(si, (seedFails.get(si) ?? 0) + 1);
      continue;
    }

    const candidates = raws
      .map(parse)
      .filter((p): p is NonNullable<ReturnType<typeof parse>> => !!p)
      .filter((p) => !p.image.capturedAt || new Date(p.image.capturedAt).getUTCFullYear() >= MIN_YEAR)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    for (const cand of candidates) {
      if (await reachable(cand.image.imageUrl)) return cand;
    }
    seedFails.set(si, (seedFails.get(si) ?? 0) + 1); // bu bölgede görüntü yok → otomatik yeni konum
  }
  throw new ApiError(503, 'Uygun görüntü bulunamadı. Lütfen tekrar dene.', 3);
}

/** Taze imza/URL için görüntüyü id ile getirir (CDN URL'leri süreli olabilir). */
export async function getImageById(id: string): Promise<RoundImage> {
  const hit = cget<RoundImage>(`img:${id}`);
  if (hit) return hit;
  const raw = await mly<RawImage>(`/${encodeURIComponent(id)}`, { fields: IMG_FIELDS });
  const p = parse(raw);
  if (!p) throw new ApiError(502, 'Görüntü alınamadı');
  cset(`img:${id}`, p.image, 10 * 60_000);
  return p.image;
}

async function sequenceIds(seq: string): Promise<string[]> {
  const hit = cget<string[]>(`seq:${seq}`);
  if (hit) return hit;
  const r = await mly<{ data?: { id: string }[] }>('/image_ids', { sequence_id: seq });
  const ids = (r.data ?? []).map((d) => d.id);
  cset(`seq:${seq}`, ids, 10 * 60_000);
  return ids;
}

/** Aynı sekans üzerinde ileri/geri hareket. Konum bilgisi döndürülmez. */
export async function moveAlong(imageId: string, sequenceId: string, dir: 'next' | 'prev'): Promise<RoundImage> {
  const ids = await sequenceIds(sequenceId);
  const idx = ids.indexOf(imageId);
  if (idx < 0) throw new ApiError(404, 'Görüntü bu sekansta değil');
  const target = idx + (dir === 'next' ? MOVE_STEP : -MOVE_STEP);
  if (target < 0 || target >= ids.length) throw new ApiError(404, 'Bu yönde görüntü yok');
  return getImageById(ids[target]);
}
