
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import Countdown from '@/components/Countdown';
import GameView from '@/components/GameView';
import ResultView, {
  PLAYER_COLORS,
} from '@/components/ResultView';
import RoomChat from '@/components/RoomChat';

import { useRoom } from '@/hooks/useRoom';
import type { LatLng, RoomState } from '@/lib/types';

const GRACE_MS = 3000;

function Center({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 py-10 text-center">
      {children}
    </main>
  );
}

export default function RoomPage({
  params,
}: {
  params: { code: string };
}) {
  const code = params.code.toUpperCase();

  const {
    creds,
    state,
    error,
    now,
    act,
    join,
  } = useRoom(code);

  const [nick, setNick] = useState('');
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setActErr(null);

    try {
      await fn();
    } catch (e) {
      setActErr(
        e instanceof Error ? e.message : 'İşlem başarısız'
      );
    }
  };

  // Oyuncu bilgileri yükleniyor
  if (creds === undefined) {
    return (
      <Center>
        <p className="text-slate-400">
          Yükleniyor…
        </p>
      </Center>
    );
  }

  // Odaya henüz katılmamış oyuncu
  if (creds === null) {
    return (
      <Center>
        <div className="rounded-2xl border border-cyan-400/20 bg-[#102638] p-4">
          <span className="text-3xl">🧭</span>
        </div>

        <p className="text-xs font-bold tracking-[0.25em] text-cyan-400">
          HAGY EXPLORER
        </p>

        <h1 className="text-3xl font-black text-white">
          Odaya Katıl
        </h1>

        <p className="text-sm text-slate-400">
          Oda kodu
        </p>

        <h2 className="text-4xl font-black tracking-[0.2em] text-cyan-300">
          {code}
        </h2>

        <input
          className="w-full rounded-xl border border-cyan-400/20 bg-[#102638] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
          placeholder="Takma adın"
          maxLength={20}
          value={nick}
          onChange={(e) => setNick(e.target.value)}
        />

        <button
          disabled={!nick.trim()}
          onClick={() => {
            setJoinErr(null);
            join(nick).catch((e) => {
              setJoinErr(
                e instanceof Error
                  ? e.message
                  : 'Odaya katılınamadı'
              );
            });
          }}
          className="w-full rounded-xl bg-cyan-400 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-40"
        >
          Odaya Katıl
        </button>

        {joinErr && (
          <p className="text-sm text-rose-300">
            {joinErr}
          </p>
        )}

        <Link
          href="/room"
          className="text-sm text-slate-400 hover:text-cyan-300"
        >
          Geri dön
        </Link>
      </Center>
    );
  }

  // Oda durumunu bekle
  if (!state) {
    return (
      <Center>
        {error ? (
          <>
            <p className="text-rose-300">
              {error}
            </p>

            <Link
              href="/room"
              className="text-cyan-300 underline"
            >
              Geri dön
            </Link>
          </>
        ) : (
          <p className="text-slate-400">
            Odaya bağlanılıyor…
          </p>
        )}
      </Center>
    );
  }

  const { room, players, me } = state;

  // Sohbet tüm oyun aşamalarında açık kalabilir.
  const chat = (
    <RoomChat
      code={room.code}
      creds={creds}
      playerCount={players.length}
    />
  );

  // LOBİ
  if (room.status === 'lobby') {
    const link =
      typeof window !== 'undefined'
        ? `${window.location.origin}/room/${room.code}`
        : '';

    return (
      <>
        <Center>
          <div className="rounded-2xl border border-cyan-400/20 bg-[#102638] p-4">
            <span className="text-3xl">🌍</span>
          </div>

          <p className="text-xs font-bold tracking-[0.25em] text-cyan-400">
            HAGY EXPLORER
          </p>

          <h1 className="text-2xl font-black text-white">
            Oyun Lobisi
          </h1>

          <p className="text-sm text-slate-400">
            Oda kodu
          </p>

          <h2 className="text-5xl font-black tracking-[0.2em] text-cyan-300">
            {room.code}
          </h2>

          <button
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(link).catch(() => {
                  setActErr('Bağlantı kopyalanamadı');
                });
              }
            }}
            className="rounded-xl border border-cyan-400/20 bg-[#102638] px-5 py-3 text-sm text-cyan-200 transition hover:bg-[#194057]"
          >
            🔗 Davet bağlantısını kopyala
          </button>

          <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-400">
            <span className="rounded-lg bg-[#102638] px-3 py-2">
              🎯 {room.totalRounds} tur
            </span>

            <span className="rounded-lg bg-[#102638] px-3 py-2">
              ⏱️{' '}
              {room.timeLimitSec
                ? `${room.timeLimitSec} sn`
                : 'Süresiz'}
            </span>

            <span className="rounded-lg bg-[#102638] px-3 py-2">
              👥 {players.length}/8
            </span>
          </div>

          <div className="w-full overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#0d2030]">
            <div className="border-b border-white/10 px-4 py-3 text-left">
              <h3 className="font-bold text-white">
                Oyuncular
              </h3>

              <p className="text-xs text-slate-400">
                Oyun başlamadan önce arkadaşlarını davet et.
              </p>
            </div>

            <ul className="space-y-2 p-3">
              {players.map((p, index) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-[#152d40] px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 font-bold text-cyan-300">
                      {index + 1}
                    </span>

                    <span
                      className={
                        p.id === me.id
                          ? 'font-bold text-white'
                          : 'text-slate-200'
                      }
                    >
                      {p.nickname}
                      {p.id === me.id ? ' (sen)' : ''}
                    </span>
                  </div>

                  {p.isHost && (
                    <span className="text-xs text-amber-300">
                      👑 Sahip
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {me.isHost ? (
            <button
              onClick={() => run(() => act('start'))}
              className="w-full rounded-xl bg-cyan-400 py-4 font-black text-slate-950 transition hover:bg-cyan-300"
            >
              Oyunu Başlat
            </button>
          ) : (
            <p className="text-sm text-slate-400">
              Oda sahibinin oyunu başlatması bekleniyor…
            </p>
          )}

          {actErr && (
            <p className="text-sm text-rose-300">
              {actErr}
            </p>
          )}
        </Center>

        {chat}
      </>
    );
  }

  // OYUN HAZIRLANIYOR
  if (room.status === 'starting') {
    return (
      <>
        <Center>
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />

          <h2 className="text-xl font-bold text-white">
            Dünya hazırlanıyor…
          </h2>

          <p className="text-sm text-slate-400">
            Oyun için konumlar seçiliyor.
          </p>
        </Center>

        {chat}
      </>
    );
  }

  // OYUN EKRANI
  if (room.status === 'playing' && state.round) {
    return (
      <>
        <RoundScreen
          key={state.round.roundNo}
          state={state}
          now={now}
          act={act}
        />

        {chat}
      </>
    );
  }

  // TUR SONUÇLARI VE FİNAL
  if (
    (room.status === 'results' ||
      room.status === 'finished') &&
    state.round &&
    state.reveal
  ) {
    const last =
      room.currentRound >= room.totalRounds;

    const entries = players.map((p, i) => {
      const g = state.reveal!.guesses.find(
        (x) => x.playerId === p.id
      );

      return {
        name: p.nickname,
        you: p.id === me.id,
        color:
          PLAYER_COLORS[i % PLAYER_COLORS.length],
        pos: g
          ? ({
              lat: g.lat,
              lng: g.lng,
            } as LatLng)
          : null,
        distanceKm: g?.distanceKm ?? null,
        score: g?.score ?? 0,
      };
    });

    // FİNAL
    if (room.status === 'finished') {
      const board = [...players].sort(
        (a, b) => b.totalScore - a.totalScore
      );

      return (
        <>
          <Center>
            <div className="text-5xl">
              🏆
            </div>

            <p className="text-xs font-bold tracking-[0.25em] text-cyan-400">
              HAGY EXPLORER
            </p>

            <h1 className="text-3xl font-black text-white">
              Final Sıralaması
            </h1>

            <p className="text-sm text-slate-400">
              {room.totalRounds} tur tamamlandı.
            </p>

            <ol className="w-full space-y-2">
              {board.map((p, i) => (
                <li
                  key={p.id}
                  className={`flex items-center justify-between rounded-xl border px-4 py-4 ${
                    i === 0
                      ? 'border-amber-400/30 bg-amber-400/10'
                      : 'border-white/10 bg-[#102638]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-black text-cyan-300">
                      {i === 0
                        ? '🥇'
                        : i === 1
                        ? '🥈'
                        : i === 2
                        ? '🥉'
                        : `${i + 1}.`}
                    </span>

                    <span className="text-sm text-white">
                      {p.nickname}
                      {p.id === me.id ? ' (sen)' : ''}
                    </span>
                  </div>

                  <b className="text-cyan-300">
                    {p.totalScore.toLocaleString('tr-TR')}
                  </b>
                </li>
              ))}
            </ol>

            <Link
              href="/room"
              className="rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              Yeni Oyun
            </Link>
          </Center>

          {chat}
        </>
      );
    }

    // TUR SONUCU
    return (
      <>
        <ResultView
          title={`Tur ${room.currentRound}/${room.totalRounds} sonucu`}
          actual={state.reveal.actual}
          entries={entries}
          footer={
            me.isHost ? (
              <button
                onClick={() => run(() => act('next'))}
                className="w-full rounded-xl bg-cyan-400 py-3 font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                {last
                  ? 'Final Sonuçları'
                  : 'Sonraki Tur'}
              </button>
            ) : (
              <p className="text-center text-sm text-slate-400">
                Oda sahibi devam ettirecek…
              </p>
            )
          }
        />

        {actErr && (
          <p className="fixed left-1/2 top-5 z-[1100] -translate-x-1/2 rounded-xl bg-rose-950 px-4 py-2 text-sm text-rose-200">
            {actErr}
          </p>
        )}

        {chat}
      </>
    );
  }

  return (
    <>
      <Center>
        <p className="text-slate-400">
          Senkronize ediliyor…
        </p>
      </Center>

      {chat}
    </>
  );
}

// OYUN TURU
function RoundScreen({
  state,
  now,
  act,
}: {
  state: RoomState;
  now: () => number;
  act: (
    action: string,
    body?: unknown
  ) => Promise<unknown>;
}) {
  const { room, players, me, round } = state;

  const meP = players.find(
    (p) => p.id === me.id
  );

  const [submitted, setSubmitted] =
    useState(false);

  const deadline = room.roundEndsAt
    ? new Date(room.roundEndsAt).getTime()
    : null;

  const guessedCount = players.filter(
    (p) => p.hasGuessed
  ).length;

  // Süre dolduğunda turu ilerlet
  useEffect(() => {
    if (!deadline) return;

    const timer = setTimeout(() => {
      act('advance').catch(() => {});
    }, Math.max(0, deadline + GRACE_MS + 500 - now()));

    return () => clearTimeout(timer);
  }, [deadline, act, now]);

  return (
    <GameView
      image={round!.image}
      deadline={deadline}
      getNow={now}
      locked={
        submitted || !!meP?.hasGuessed
      }
      lockedMessage={`Tahmin gönderildi — bekleniyor (${guessedCount}/${players.length})`}
      onSubmit={async (guess) => {
        await act('guess', guess);
        setSubmitted(true);
      }}
      hud={
        <>
          <span>
            Tur {room.currentRound}/{room.totalRounds}
          </span>

          {deadline && (
            <Countdown
              deadline={deadline}
              getNow={now}
            />
          )}

          <span className="text-slate-400">
            {guessedCount}/{players.length} tahmin
          </span>
        </>
      }
    />
  );
}
