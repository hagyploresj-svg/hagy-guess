
import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  credsFrom,
  getRoomMessages,
  sendRoomMessage,
} from '@/lib/rooms';

import { limit } from '@/lib/ratelimit';
import { fail } from '@/lib/http';

export const dynamic = 'force-dynamic';

type Ctx = {
  params: { code: string };
};

const MessageSchema = z.object({
  content: z.string().min(1).max(300),
});

export async function GET(
  req: Request,
  { params }: Ctx
) {
  try {
    limit(req, 'chat-read', 120);

    const messages = await getRoomMessages(
      params.code,
      credsFrom(req)
    );

    return NextResponse.json(
      { messages },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return fail(error);
  }
}

export async function POST(
  req: Request,
  { params }: Ctx
) {
  try {
    limit(req, 'chat-send', 30);

    const body = MessageSchema.parse(
      await req.json()
    );

    await sendRoomMessage(
      params.code,
      credsFrom(req),
      body.content
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
