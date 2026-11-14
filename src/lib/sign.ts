
import 'server-only';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { env } from './env';

function encryptionKey(): Buffer {
  return createHash('sha256')
    .update(env.roundSecret)
    .digest();
}

export function signPayload(
  payload: object,
  ttlMs: number
): string {
  const iv = randomBytes(12);

  const cipher = createCipheriv(
    'aes-256-gcm',
    encryptionKey(),
    iv
  );

  const data = {
    ...payload,
    roundId: randomBytes(16).toString('hex'),
    exp: Date.now() + ttlMs,
  };

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    iv.toString('base64url'),
    encrypted.toString('base64url'),
    tag.toString('base64url'),
  ].join('.');
}

export function verifyPayload<T>(
  token: string
): (T & { roundId: string; exp: number }) | null {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) return null;

    const [ivPart, encryptedPart, tagPart] = parts;

    const iv = Buffer.from(ivPart, 'base64url');
    const encrypted = Buffer.from(
      encryptedPart,
      'base64url'
    );
    const tag = Buffer.from(tagPart, 'base64url');

    if (iv.length !== 12 || tag.length !== 16) {
      return null;
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      iv
    );

    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    const data = JSON.parse(
      decrypted.toString('utf8')
    );

    if (
      !data ||
      typeof data !== 'object' ||
      !Number.isFinite(data.exp) ||
      data.exp <= Date.now() ||
      typeof data.roundId !== 'string' ||
      !/^[a-f0-9]{32}$/.test(data.roundId)
    ) {
      return null;
    }

    return data as T & {
      roundId: string;
      exp: number;
    };
  } catch {
    return null;
  }
}
