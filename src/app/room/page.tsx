
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { credsKey } from '@/hooks/useRoom';

type CreateRoomResponse = {
  code: string;
  playerId: string;
  secret: string;
};

export default function RoomEntry() {
  const router = useRouter();

  const [nick, setNick] = useState('');
  const [rounds, setRounds] = useState(5);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async () => {
    if (!nick.trim() || busy) return;

    setBusy(true);
    setErr(null);

    try {
      const result = await api<CreateRoomResponse>(
        '/api/rooms',
        {
          method: 'POST',
          body: {
            nickname: nick.trim(),
            totalRounds: rounds,

            // Geçici test değeri.
            // Sunucu süresiz modu destekleyince 0 yapılacak.
            timeLimitSec: 120,
          },
        }
      );

      localStorage.setItem(
        credsKey(result.code),
        JSON.stringify({
          playerId: result.playerId,
          secret: result.secret,
        })
      );

      router.push(`/room/${result.code}`);
    } catch (error) {
      console.error('Oda oluşturma hatası:', error);

      setErr(
        error instanceof Error
          ? error.message
          : 'Sunucu hatası. Tekrar dene.'
      );

      setBusy(false);
    }
  };

  const join = () => {
    const roomCode = code.trim().toUpperCase();

    if (roomCode.length !== 5) return;

    router.push(`/room/${roomCode}`);
  };

  const field =
    'w-full rounded-xl border border-slate-700 ' +
    'bg-slate-900 px-4 py-3 text-white ' +
    'outline-none transition focus:border-emerald-400';

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#070d1b] px-5 py-10 text-white">
      {/* Arka plan */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -right-32 bottom-20 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-lg flex-col gap-7">
        <Link
          href="/"
          className="w-fit text-sm text-slate-400 transition hover:text-white"
        >
          ← Ana sayfaya dön
        </Link>

        {/* Başlık */}
        <div className="text-center">
          <div className="mb-4 text-6xl">⚔️</div>

          <h1 className="text-4xl font-black">
            ÇOK{' '}
            <span className="text-violet-400">
              OYUNCULU
            </span>
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            Arkadaşlarınla dünyayı keşfet,
            en iyi tahmini yap ve kazan!
          </p>
        </div>

        {/* Oda oluşturma */}
        <section className="space-y-5 rounded-3xl border border-emerald-400/20 bg-slate-900/70 p-6 shadow-2xl">
          <div>
            <h2 className="text-xl font-black">
              🌍 ODA OLUŞTUR
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Yeni bir oyun başlat ve arkadaşlarını davet et.
            </p>
          </div>

          <div>
            <label
              htmlFor="nickname"
              className="mb-2 block text-sm font-semibold text-slate-300"
            >
              Oyuncu adın
            </label>

            <input
              id="nickname"
              className={field}
              placeholder="Takma adını yaz"
              maxLength={20}
              value={nick}
              onChange={(event) =>
                setNick(event.target.value)
              }
            />
          </div>

          <div>
            <label
              htmlFor="rounds"
              className="mb-2 block text-sm font-semibold text-slate-300"
            >
              Tur sayısı
            </label>

            <select
              id="rounds"
              className={field}
              value={rounds}
              onChange={(event) =>
                setRounds(Number(event.target.value))
              }
            >
              {[3, 5, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n} tur
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <span className="text-2xl">♾️</span>

            <div>
              <p className="text-sm font-bold text-emerald-300">
                Süresiz oyun hedefi
              </p>

              <p className="text-xs text-slate-400">
                Şu anda sunucu uyumluluğunu test ediyoruz.
                Süresiz modu sonraki adımda etkinleştireceğiz.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!nick.trim() || busy}
            onClick={create}
            className="w-full rounded-xl bg-emerald-400 py-4 font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy
              ? 'ODA OLUŞTURULUYOR...'
              : '🚀 ODA OLUŞTUR'}
          </button>
        </section>

        {/* Odaya katılma */}
        <section className="space-y-5 rounded-3xl border border-violet-400/20 bg-slate-900/70 p-6 shadow-2xl">
          <div>
            <h2 className="text-xl font-black">
              🔑 ODAYA KATIL
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Arkadaşının gönderdiği oda kodunu gir.
            </p>
          </div>

          <input
            aria-label="Oda kodu"
            className={`${field} text-center text-xl font-black uppercase tracking-[0.3em]`}
            placeholder="ODA KODU"
            maxLength={5}
            value={code}
            onChange={(event) =>
              setCode(event.target.value.toUpperCase())
            }
          />

          <button
            type="button"
            disabled={code.trim().length !== 5}
            onClick={join}
            className="w-full rounded-xl bg-violet-500 py-4 font-black text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ⚔️ ODAYA KATIL
          </button>
        </section>

        {err && (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center text-sm text-rose-300"
          >
            {err}
          </div>
        )}

        <p className="text-center text-xs text-slate-500">
          HAGY GUESS · Arkadaşlarınla keşfet!
        </p>
      </div>
    </main>
  );
}
