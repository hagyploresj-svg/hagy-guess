'use client';
import dynamic from 'next/dynamic';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import Attribution from './Attribution';
import { api } from '@/lib/api-client';
import type { LatLng, RoundImage } from '@/lib/types';

const StreetViewer = dynamic(() => import('./StreetViewer'), { ssr: false, loading: () => <div className="h-full w-full bg-black" /> });
const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false, loading: () => <div className="h-full w-full bg-slate-900" /> });

interface Props {
  image: RoundImage;
  hud: ReactNode;
  locked?: boolean;
  lockedMessage?: string;
  /** epoch ms (sunucu saatine göre düzeltilmiş); süre dolunca işaretli konum otomatik gönderilir */
  deadline?: number | null;
  getNow?: () => number;
  onSubmit: (g: LatLng) => Promise<void>;
}

export default function GameView({ image, hud, locked = false, lockedMessage, deadline, getNow = Date.now, onSubmit }: Props) {
  const [current, setCurrent] = useState(image);
  const [moving, setMoving] = useState(false);
  const [blocked, setBlocked] = useState<{ next?: boolean; prev?: boolean }>({});
  const [guess, setGuess] = useState<LatLng | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const guessRef = useRef(guess);
  guessRef.current = guess;

  const submit = useCallback(async () => {
    const g = guessRef.current;
    if (!g || busy || locked) return;
    setBusy(true); setErr(null);
    try { await onSubmit(g); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }, [busy, locked, onSubmit]);
  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    if (!deadline || locked) return;
    const t = setTimeout(() => { if (guessRef.current) submitRef.current(); }, Math.max(0, deadline - getNow()));
    return () => clearTimeout(t);
  }, [deadline, locked, getNow]);

  const move = async (dir: 'next' | 'prev') => {
    if (moving || !current.sequenceId) return;
    setMoving(true);
    try {
      const r = await api<{ image: RoundImage }>('/api/move', {
        method: 'POST', body: { imageId: current.imageId, sequenceId: current.sequenceId, dir },
      });
      setCurrent(r.image);
      setBlocked({});
    } catch { setBlocked((b) => ({ ...b, [dir]: true })); } finally { setMoving(false); }
  };

  const canMove = !!current.sequenceId;
  const arrow = 'pointer-events-auto flex h-11 w-24 items-center justify-center rounded-full bg-black/60 text-sm font-semibold backdrop-blur transition hover:bg-black/80 disabled:opacity-30';

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <div className="absolute inset-0"><StreetViewer image={current} /></div>

      <div className="pointer-events-none absolute left-3 top-3 z-[1100] flex items-center gap-3 rounded-xl bg-black/60 px-4 py-2 text-sm font-semibold backdrop-blur">
        {hud}
      </div>

      {canMove && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-[1100] flex -translate-x-1/2 gap-3">
          <button className={arrow} disabled={moving || blocked.prev} onClick={() => move('prev')}>▼ Geri</button>
          <button className={arrow} disabled={moving || blocked.next} onClick={() => move('next')}>▲ İleri</button>
          {current.imageId !== image.imageId && (
            <button className={arrow} onClick={() => { setCurrent(image); setBlocked({}); }}>⟲ Başa dön</button>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-2 left-2 z-[1100]"><Attribution image={current} /></div>

      <div
        className={`absolute bottom-4 right-3 z-[1100] flex flex-col gap-2 transition-[width] duration-200 ${open ? 'w-[min(94vw,780px)]' : 'w-64 sm:w-80'}`}
        onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      >
        <div className={`relative overflow-hidden rounded-xl border border-slate-600 shadow-2xl transition-[height] duration-200 ${open ? 'h-[min(58vh,520px)]' : 'h-44'}`}>
          <MapPicker guess={guess} onPick={locked ? undefined : setGuess} />
          <button onClick={() => setOpen((o) => !o)} className="absolute right-2 top-2 z-[1200] rounded bg-black/60 px-2 py-1 text-xs sm:hidden">⤢</button>
        </div>
        {err && <p className="rounded bg-rose-950/80 px-3 py-1 text-xs text-rose-300">{err}</p>}
        {locked ? (
          <div className="rounded-xl bg-slate-800/90 px-4 py-3 text-center text-sm text-slate-300">{lockedMessage ?? 'Tahmin gönderildi'}</div>
        ) : (
          <button onClick={submit} disabled={!guess || busy}
            className="rounded-xl bg-brand py-3 font-bold text-slate-950 transition enabled:hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400">
            {busy ? 'Gönderiliyor…' : guess ? 'Tahmin Et' : 'Haritada bir yer seç'}
          </button>
        )}
      </div>
    </div>
  );
}
