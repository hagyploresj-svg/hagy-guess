'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Countdown from '@/components/Countdown';
import GameView from '@/components/GameView';
import ResultView, { PLAYER_COLORS } from '@/components/ResultView';
import { useRoom } from '@/hooks/useRoom';
import type { LatLng, RoomState } from '@/lib/types';

const GRACE_MS = 3000; // sunucudaki GRACE_MS ile aynı

function Center({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">{children}</main>;
}

export default function RoomPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const { creds, state, error, now, act, join } = useRoom(code);
  const [nick, setNick] = useState('');
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setActErr(null);
    try { await fn(); } catch (e) { setActErr((e as Error).message); }
  };

  if (creds === undefined) return <Center><p className="text-slate-400">Yükleniyor…</p></Center>;

  if (creds === null) {
    return (
      <Center>
        <h1 className="text-2xl font-black">Oda <span className="tracking-widest text-brand">{code}</span></h1>
        <input className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-brand"
          placeholder="Takma adın" maxLength={20} value={nick} onChange={(e) => setNick(e.target.value)} />
        <button disabled={!nick.trim()} onClick={() => join(nick).catch((e) => setJoinErr(e.message))}
          className="w-full rounded-xl bg-brand py-3 font-bold text-slate-950 disabled:opacity-40">Katıl</button>
        {joinErr && <p className="text-sm text-rose-300">{joinErr}</p>}
      </Center>
    );
  }

  if (!state) {
    return (
      <Center>
        {error ? <><p className="text-rose-300">{error}</p><Link href="/room" className="underline">Geri dön</Link></> : <p className="text-slate-400">Odaya bağlanılıyor…</p>}
      </Center>
    );
  }

  const { room, players, me } = state;

  if (room.status === 'lobby') {
    const link = typeof window !== 'undefined' ? `${window.location.origin}/room/${room.code}` : '';
    return (
      <Center>
        <p className="text-sm text-slate-400">Oda kodu</p>
        <h1 className="text-5xl font-black tracking-[0.3em] text-brand">{room.code}</h1>
        <button onClick={() => navigator.clipboard?.writeText(link)} className="text-sm text-slate-400 underline">Davet bağlantısını kopyala</button>
        <p className="text-xs text-slate-500">{room.totalRounds} tur · {room.timeLimitSec ? `${room.timeLimitSec} sn` : 'süresiz'}</p>
        <ul className="w-full space-y-1">
          {players.map((p) => (
            <li key={p.id} className="flex justify-between rounded-lg bg-slate-900 px-4 py-2 text-sm">
              <span className={p.id === me.id ? 'font-bold' : ''}>{p.nickname}</span>{p.isHost && <span className="text-amber-400">👑 sahip</span>}
            </li>
          ))}
        </ul>
        {me.isHost
          ? <button onClick={() => run(() => act('start'))} className="w-full rounded-xl bg-brand py-3 font-bold text-slate-950">Oyunu başlat</button>
          : <p className="text-slate-400">Oda sahibinin başlatması bekleniyor…</p>}
        {actErr && <p className="text-sm text-rose-300">{actErr}</p>}
      </Center>
    );
  }

  if (room.status === 'starting') {
    return <Center><span className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" /><p className="text-slate-300">Dünya genelinde konumlar seçiliyor…</p></Center>;
  }

  if (room.status === 'playing' && state.round) {
    return <RoundScreen key={state.round.roundNo} state={state} now={now} act={act} />;
  }

  if ((room.status === 'results' || room.status === 'finished') && state.round && state.reveal) {
    const last = room.currentRound >= room.totalRounds;
    const entries = players.map((p, i) => {
      const g = state.reveal!.guesses.find((x) => x.playerId === p.id);
      return {
        name: p.nickname, you: p.id === me.id, color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        pos: g ? ({ lat: g.lat, lng: g.lng } as LatLng) : null, distanceKm: g?.distanceKm ?? null, score: g?.score ?? 0,
      };
    });

    if (room.status === 'finished') {
      const board = [...players].sort((a, b) => b.totalScore - a.totalScore);
      return (
        <Center>
          <h1 className="text-3xl font-black">🏆 Final</h1>
          <ol className="w-full space-y-2">
            {board.map((p, i) => (
              <li key={p.id} className="flex justify-between rounded-lg bg-slate-900 px-4 py-3">
                <span>{i + 1}. {p.nickname}{p.id === me.id ? ' (sen)' : ''}</span>
                <b className="text-brand">{p.totalScore.toLocaleString('tr-TR')}</b>
              </li>
            ))}
          </ol>
          <Link href="/room" className="rounded-xl bg-brand px-6 py-3 font-bold text-slate-950">Yeni oyun</Link>
        </Center>
      );
    }

    return (
      <ResultView
        title={`Tur ${room.currentRound}/${room.totalRounds} sonucu`}
        actual={state.reveal.actual}
        entries={entries}
        footer={
          me.isHost
            ? <button onClick={() => run(() => act('next'))} className="w-full rounded-xl bg-brand py-3 font-bold text-slate-950">{last ? 'Final sonuçları' : 'Sonraki tur'}</button>
            : <p className="text-center text-sm text-slate-400">Oda sahibi devam ettirecek…</p>
        }
      />
    );
  }

  return <Center><p className="text-slate-400">Senkronize ediliyor…</p></Center>;
}

function RoundScreen({ state, now, act }: {
  state: RoomState; now: () => number; act: (a: string, b?: unknown) => Promise<unknown>;
}) {
  const { room, players, me, round } = state;
  const meP = players.find((p) => p.id === me.id);
  const [submitted, setSubmitted] = useState(false);
  const deadline = room.roundEndsAt ? new Date(room.roundEndsAt).getTime() : null;
  const guessedCount = players.filter((p) => p.hasGuessed).length;

  // Süre bitince turu bitirmeyi tetikle (sunucu idempotent)
  useEffect(() => {
    if (!deadline) return;
    const t = setTimeout(() => { act('advance').catch(() => {}); }, Math.max(0, deadline + GRACE_MS + 500 - now()));
    return () => clearTimeout(t);
  }, [deadline, act, now]);

  return (
    <GameView
      image={round!.image}
      deadline={deadline}
      getNow={now}
      locked={submitted || !!meP?.hasGuessed}
      lockedMessage={`Tahmin gönderildi — bekleniyor (${guessedCount}/${players.length})`}
      onSubmit={async (g) => { await act('guess', g); setSubmitted(true); }}
      hud={<>
        <span>Tur {room.currentRound}/{room.totalRounds}</span>
        {deadline && <Countdown deadline={deadline} getNow={now} />}
        <span className="text-slate-400">{guessedCount}/{players.length} tahmin</span>
      </>}
    />
  );
}
