import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(public status: number, message: string, public retryAfter?: number) {
    super(message);
  }
}

export function fail(e: unknown) {
  if (e instanceof ApiError) {
    return NextResponse.json(
      { error: e.message },
      { status: e.status, headers: e.retryAfter ? { 'Retry-After': String(e.retryAfter) } : undefined },
    );
  }
  if (e instanceof ZodError) return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
  console.error(e);
  return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
}
