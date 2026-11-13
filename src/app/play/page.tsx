'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import GameView from '@/components/GameView';
import ResultView from '@/components/ResultView';
import { api } from '@/lib/api-client';
import type { GuessResult, LatLng, RoundImage } from '@/lib/types';

const TOTAL = 5;
interface RoundData { image: RoundImage; roundToken: string }
interface Done extends GuessResult { guess: LatLng }

export default function SoloPage() {
  const [round, setRound] = useState(1);
  const [data, setData] = useState<RoundData | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [history, setHistory] = useState<Done[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const started = useRef(false);

  const load = useCallback(async () => {
    setError(null); setData(null); setDone(null);
    try { setData(await api<RoundData>('/api/round')); } catch (e) { setError((e as Error).message); }
  }, []);

  useEffect(() => { if (started.current) return; started.current = true; load(); }, [load]);

  const total = history.reduce((s, h) => s + h.score, 0);

  const submit = async (g: LatLng) => {
    if (!data) return;
    const r = await api<GuessResult>('/api/guess', { method: 'POST', body: { roundToken: data.roundToken, ...g } });
    const d = { guess: g, ...r };
    setDone(d); setHistory((h) => [...h, d]);
  };

  const next = () => {
    if (round >= TOTAL) { setFinished(true); return; }
    setRound((r) => r + 1); load();
  };

  const restart = () => { setRound(1); setHistory([]); setFinished(false); load(); };

  if (finished) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-3xl font-black">Oyun bitti!</h1>
        <p className="text-5xl font-black text-brand">{total.toLocaleString('tr-TR')}</p>
        <ul className="w-full space-y-1 text-sm">
          {history.map((h, i) => (
            <li key={i} className="flex justify-between rounded-lg bg-slate-900 px-4 py-2">
              <span>Tur {i + 1}</span><span>{Math.round(h.distanceKm).toLocaleString('tr-TR')} km · <b>{h.score}</b></span>
            </li>
          ))}
        </ul>
        <div className="flex gap-3">
          <button onClick={restart} className="rounded-xl bg-brand px-6 py-3 font-bold text-slate-950">Tekrar oyna</button>
          <Link href="/" className="rounded-xl border border-slate-700 px-6 py-3 font-bold">Ana sayfa</Link>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-rose-300">{error}</p>
        <button onClick={load} className="rounded-xl bg-brand px-6 py-3 font-bold text-slate-950">Tekrar dene</button>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-slate-400">
        <div className="flex items-center gap-3"><span className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />Konum aranıyor…</div>
      </main>
    );
  }

  if (done) {
    return (
      <ResultView
        title={`Tur ${round}/${TOTAL} · ${done.distanceKm < 1 ? 'Tam isabet!' : 'Sonuç'}`}
        actual={done.actual}
        entries={[{ name: 'Tahminin', pos: done.guess, distanceKm: done.distanceKm, score: done.score, color: '#3b82f6', you: true }]}
        footer={
          <button onClick={next} className="w-full rounded-xl bg-brand py-3 font-bold text-slate-950">
            {round >= TOTAL ? 'Sonuçları gör' : 'Sonraki tur'}
          </button>
        }
      />
    );
  }

  return (
    <GameView
      key={data.roundToken}
      image={data.image}
      onSubmit={submit}
      hud={<><span>Tur {round}/{TOTAL}</span><span className="text-emerald-400">{total.toLocaleString('tr-TR')} puan</span></>}
    />
  );
}
