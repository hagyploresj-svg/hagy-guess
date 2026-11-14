
'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import GameView from '@/components/GameView';
import ResultView from '@/components/ResultView';
import { api } from '@/lib/api-client';
import { browserSupabase } from '@/lib/supabase-browser';

import type {
  GuessResult,
  LatLng,
  RoundImage,
} from '@/lib/types';

const TOTAL = 5;

interface RoundData {
  image: RoundImage;
  roundToken: string;
}

interface Reward {
  awarded: boolean;
  xp: number;
  coins: number;
  totalXp: number;
  level: number;
  balance: number;
}

interface Done extends GuessResult {
  guess: LatLng;
  reward?: Reward;
}

interface GuessResponse extends GuessResult {
  reward?: Reward;
}

export default function SoloPage() {
  const [round, setRound] = useState(1);
  const [data, setData] = useState<RoundData | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [history, setHistory] = useState<Done[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const started = useRef(false);
  const submittingRef = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    setData(null);
    setDone(null);

    try {
      const result = await api<RoundData>('/api/round');
      setData(result);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void load();
  }, [load]);

  const total = history.reduce(
    (sum, item) => sum + item.score,
    0
  );

  const totalXp = history.reduce(
    (sum, item) => sum + (item.reward?.xp ?? 0),
    0
  );

  const totalCoins = history.reduce(
    (sum, item) => sum + (item.reward?.coins ?? 0),
    0
  );

  const submit = async (guess: LatLng) => {
    if (!data || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const supabase = browserSupabase();

      const { data: sessionData } = supabase
        ? await supabase.auth.getSession()
        : { data: { session: null } };

      const token = sessionData.session?.access_token;

      const response = await api<GuessResponse>(
        '/api/guess',
        {
          method: 'POST',
          body: {
            roundToken: data.roundToken,
            lat: guess.lat,
            lng: guess.lng,
          },
          ...(token
            ? {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            : {}),
        }
      );

      const result: Done = {
        guess,
        ...response,
      };

      setDone(result);
      setHistory((previous) => [
        ...previous,
        result,
      ]);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const next = () => {
    if (round >= TOTAL) {
      setFinished(true);
      return;
    }

    setRound((previous) => previous + 1);
    void load();
  };

  const restart = () => {
    setRound(1);
    setHistory([]);
    setFinished(false);
    void load();
  };

  if (finished) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 bg-[#07111d] px-6 text-center text-white">
        <h1 className="text-3xl font-black">
          Oyun bitti! 🏆
        </h1>

        <p className="text-5xl font-black text-cyan-300">
          {total.toLocaleString('tr-TR')}
        </p>

        <p className="text-sm text-slate-400">
          Toplam tahmin puanın
        </p>

        <div className="grid w-full grid-cols-2 gap-3">
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5">
            <div className="text-2xl font-black text-cyan-300">
              +{totalXp}
            </div>
            <div className="mt-1 text-xs text-slate-300">
              Kazanılan XP
            </div>
          </div>

          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
            <div className="text-2xl font-black text-amber-300">
              +{totalCoins}
            </div>
            <div className="mt-1 text-xs text-slate-300">
              HAGY Coin
            </div>
          </div>
        </div>

        <ul className="w-full space-y-2 text-sm">
          {history.map((item, index) => (
            <li
              key={index}
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
            >
              <div className="flex justify-between">
                <span>Tur {index + 1}</span>
                <strong>{item.score} puan</strong>
              </div>

              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>
                  {Math.round(item.distanceKm)} km
                </span>

                <span>
                  +{item.reward?.xp ?? 0} XP ·
                  +{item.reward?.coins ?? 0} Coin
                </span>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={restart}
            className="rounded-xl bg-cyan-300 px-6 py-3 font-bold text-slate-950"
          >
            Tekrar Oyna
          </button>

          <Link
            href="/profile"
            className="rounded-xl border border-cyan-300/30 px-6 py-3 font-bold text-cyan-200"
          >
            Profilim
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-slate-700 px-6 py-3 font-bold"
          >
            Ana Sayfa
          </Link>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#07111d] px-6 text-center text-white">
        <p className="text-rose-300">{error}</p>

        <button
          onClick={() => void load()}
          className="rounded-xl bg-cyan-300 px-6 py-3 font-bold text-slate-950"
        >
          Tekrar Dene
        </button>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#07111d] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
          Konum aranıyor…
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <ResultView
        title={`Tur ${round}/${TOTAL} · ${
          done.distanceKm < 1
            ? 'Tam isabet!'
            : 'Sonuç'
        }`}
        actual={done.actual}
        entries={[
          {
            name: 'Tahminin',
            pos: done.guess,
            distanceKm: done.distanceKm,
            score: done.score,
            color: '#3b82f6',
            you: true,
          },
        ]}
        footer={
          <div className="space-y-3">
            {done.reward?.awarded && (
              <div className="rounded-xl border border-cyan-300/20 bg-[#071522] p-3 text-center text-sm font-bold text-cyan-200">
                +{done.reward.xp} XP ·
                +{done.reward.coins} HAGY Coin
              </div>
            )}

            <button
              onClick={next}
              className="w-full rounded-xl bg-cyan-300 py-3 font-bold text-slate-950"
            >
              {round >= TOTAL
                ? 'Sonuçları Gör'
                : 'Sonraki Tur'}
            </button>
          </div>
        }
      />
    );
  }

  return (
    <GameView
      key={data.roundToken}
      image={data.image}
      onSubmit={submit}
      locked={submitting}
      lockedMessage="Tahmin gönderiliyor..."
      hud={
        <div className="flex items-center gap-3">
          <span>Tur {round}/{TOTAL}</span>

          <span className="text-emerald-400">
            {total.toLocaleString('tr-TR')} puan
          </span>
        </div>
      }
    />
  );
}
