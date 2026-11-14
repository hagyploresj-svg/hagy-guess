
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Creds } from '@/lib/types';

type ChatMessage = {
  id: string;
  playerId: string;
  nickname: string;
  content: string;
  createdAt: string;
};

type Props = {
  code: string;
  creds: Creds;
  playerCount?: number;
};

export default function RoomChat({
  code,
  creds,
  playerCount,
}: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [unread, setUnread] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSeenRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
    if (open) setUnread(0);
  }, [open]);

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/rooms/${encodeURIComponent(code)}/chat`,
        {
          headers: {
            'x-player-id': creds.playerId,
            'x-player-secret': creds.secret,
          },
          cache: 'no-store',
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      const next: ChatMessage[] = data.messages ?? [];

      if (initializedRef.current && !openRef.current) {
        const oldIndex = next.findIndex(
          (m) => m.id === lastSeenRef.current
        );

        if (oldIndex >= 0) {
          const newCount = next
            .slice(oldIndex + 1)
            .filter((m) => m.playerId !== creds.playerId)
            .length;

          if (newCount > 0) {
            setUnread((count) => count + newCount);
          }
        }
      }

      initializedRef.current = true;
      lastSeenRef.current = next.at(-1)?.id ?? null;
      setMessages(next);
    } catch {
      // Bağlantı kesilirse sonraki yenilemede tekrar dene.
    }
  }, [code, creds.playerId, creds.secret]);

  useEffect(() => {
    void load();

    const interval = setInterval(() => {
      if (!document.hidden) void load();
    }, 3000);

    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }
  }, [open, messages]);

  async function sendMessage() {
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setError('');

    try {
      const response = await fetch(
        `/api/rooms/${encodeURIComponent(code)}/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-player-id': creds.playerId,
            'x-player-secret': creds.secret,
          },
          body: JSON.stringify({ content }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || data.message || 'Mesaj gönderilemedi'
        );
      }

      setDraft('');
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Bağlantı hatası'
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 left-4 z-[1000] flex flex-col items-start gap-3 sm:bottom-6 sm:left-6">
      {open && (
        <section className="flex h-[min(470px,70dvh)] w-[min(350px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-cyan-400/25 bg-[#081725] text-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-white/10 bg-[#102638] px-4 py-3">
            <div>
              <h2 className="text-sm font-black tracking-wide text-cyan-300">
                HAGY CHAT
              </h2>
              <p className="text-xs text-slate-400">
                Oda {code}
                {playerCount !== undefined
                  ? ` · ${playerCount} oyuncu`
                  : ''}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Sohbeti kapat"
              className="rounded-lg px-3 py-2 text-slate-300 hover:bg-white/10"
            >
              ✕
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
            {messages.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">
                Henüz mesaj yok.
                İlk mesajı sen gönder!
              </p>
            )}

            {messages.map((message) => {
              const mine = message.playerId === creds.playerId;

              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${
                    mine ? 'items-end' : 'items-start'
                  }`}
                >
                  <span className="mb-1 px-1 text-[11px] text-cyan-300">
                    {mine ? 'Sen' : message.nickname}
                  </span>

                  <div
                    className={`max-w-[90%] break-words rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? 'rounded-br-sm bg-cyan-700 text-white'
                        : 'rounded-bl-sm bg-[#1a3447] text-slate-100'
                    }`}
                  >
                    {message.content}
                  </div>

                  <span className="mt-1 px-1 text-[10px] text-slate-500">
                    {new Date(message.createdAt).toLocaleTimeString(
                      'tr-TR',
                      {
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}
                  </span>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>

          <div className="border-t border-white/10 p-3">
            {error && (
              <p className="mb-2 text-xs text-rose-300">
                {error}
              </p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage();
              }}
              className="flex gap-2"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={300}
                placeholder="Mesaj yaz..."
                aria-label="Mesaj yaz"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#06111d] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
              />

              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="rounded-xl bg-cyan-400 px-4 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-40"
              >
                {sending ? '...' : '➤'}
              </button>
            </form>

            <p className="mt-2 text-right text-[10px] text-slate-500">
              {draft.length}/300
            </p>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-[#102638] px-5 py-3 font-bold text-cyan-200 shadow-xl transition hover:bg-[#194057]"
      >
        <span>💬</span>
        <span>{open ? 'Kapat' : 'Sohbet'}</span>

        {!open && unread > 0 && (
          <span className="rounded-full bg-cyan-400 px-2 py-0.5 text-xs text-slate-950">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}
