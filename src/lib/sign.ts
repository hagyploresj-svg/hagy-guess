import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { env } from './env';

/** Tur token'ı: koordinatlar imzalı ve opak; istemci okuyamaz/değiştiremez gibi davranır. */
export function signPayload(payload: object, ttlMs: number): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlMs })).toString('base64url');
  const sig = createHmac('sha256', env.roundSecret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyPayload<T>(token: string): T | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', env.roundSecret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString()) as T & { exp: number };
    return data.exp > Date.now() ? data : null;
  } catch { return null; }
}
