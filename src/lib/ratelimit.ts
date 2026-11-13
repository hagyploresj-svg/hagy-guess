import 'server-only';
import { ApiError } from './http';

// Basit sabit pencereli sınırlayıcı. Serverless'ta her instance kendi sayacını tutar;
// yoğun trafikte Upstash Redis / Vercel KV ile değiştir.
const buckets = new Map<string, { n: number; reset: number }>();

export function limit(req: Request, name: string, max: number, windowMs = 60_000) {
  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  const key = `${name}:${ip}`;
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset < now) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
  if (++b.n > max) throw new ApiError(429, 'Çok fazla istek. Biraz bekle.', Math.ceil((b.reset - now) / 1000));
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
}
