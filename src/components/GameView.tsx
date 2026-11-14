
'use client';

import dynamic from 'next/dynamic';
import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import Attribution from './Attribution';
import { api } from '@/lib/api-client';
import type { LatLng, RoundImage } from '@/lib/types';

const StreetViewer = dynamic(
  () => import('./StreetViewer'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-[#07111d]" />
    ),
  }
);

const MapPicker = dynamic(
  () => import('./MapPicker'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-[#0d1b2a]" />
    ),
  }
);

type Direction = 'next' | 'prev';

interface Props {
  image: RoundImage;
  hud: ReactNode;
  locked?: boolean;
  lockedMessage?: string;
  deadline?: number | null;
  getNow?: () => number;
  onSubmit: (g: LatLng) => Promise<void>;
}

function opposite(dir: Direction): Direction {
  return dir === 'next' ? 'prev' : 'next';
}

function ControlIcon({
  name,
}: {
  name: 'forward' | 'back' | 'reset';
}) {
  if (name === 'reset') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-6 w-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 11a9 9 0 1 1 2.5 6.2" />
        <path d="M3 4v7h7" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'forward' ? (
        <>
          <path d="m6 15 6-6 6 6" />
          <path d="M12 9v11" />
        </>
      ) : (
        <>
          <path d="m6 9 6 6 6-6" />
          <path d="M12 4v11" />
        </>
      )}
    </svg>
  );
}

export default function GameView({
  image,
  hud,
  locked = false,
  lockedMessage,
  deadline,
  getNow = Date.now,
  onSubmit,
}: Props) {
  const [current, setCurrent] = useState(image);
  const [moving, setMoving] = useState(false);
  const [blocked, setBlocked] = useState<{
    next?: boolean;
    prev?: boolean;
  }>({});

  const [guess, setGuess] = useState<LatLng | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const currentRef = useRef(current);
  currentRef.current = current;

  const movingRef = useRef(false);
  const generation = useRef(0);

  const neighborCache = useRef(
    new Map<string, RoundImage>()
  );

  const pending = useRef(
    new Map<string, Promise<RoundImage>>()
  );

  const preloadedImages = useRef(
    new Map<string, HTMLImageElement>()
  );

  const guessRef = useRef(guess);
  guessRef.current = guess;

  const keyFor = (
    img: RoundImage,
    dir: Direction
  ) => `${img.sequenceId}:${img.imageId}:${dir}`;

  const preloadImage = useCallback(
    (img: RoundImage) => {
      if (preloadedImages.current.has(img.imageId)) {
        return;
      }

      const element = new window.Image();
      element.referrerPolicy = 'no-referrer';
      element.src = img.imageUrl;

      preloadedImages.current.set(
        img.imageId,
        element
      );

      if (preloadedImages.current.size > 12) {
        const oldest =
          preloadedImages.current.keys().next().value;

        if (oldest) {
          preloadedImages.current.delete(oldest);
        }
      }
    },
    []
  );

  const fetchNeighbor = useCallback(
    (
      img: RoundImage,
      dir: Direction
    ): Promise<RoundImage> => {
      const key = keyFor(img, dir);
      const cached = neighborCache.current.get(key);

      if (cached) {
        return Promise.resolve(cached);
      }

      const existing = pending.current.get(key);

      if (existing) {
        return existing;
      }

      const request = api<{ image: RoundImage }>(
        '/api/move',
        {
          method: 'POST',
          body: {
            imageId: img.imageId,
            sequenceId: img.sequenceId,
            dir,
          },
        }
      ).then((response) => {
        neighborCache.current.set(
          key,
          response.image
        );
        return response.image;
      });

      pending.current.set(key, request);

      void request.then(
        () => pending.current.delete(key),
        () => pending.current.delete(key)
      );

      return request;
    },
    []
  );

  // Yeni tur
  useEffect(() => {
    generation.current++;
    neighborCache.current.clear();
    pending.current.clear();
    preloadedImages.current.clear();

    currentRef.current = image;
    movingRef.current = false;

    setCurrent(image);
    setMoving(false);
    setBlocked({});
    setGuess(null);
    setErr(null);
    setOpen(false);
  }, [image.imageId]);

  // Komşu görüntüleri önceden hazırla
  useEffect(() => {
    if (!current.sequenceId || locked) return;

    const version = generation.current;
    let cancelled = false;

    const prepare = async (dir: Direction) => {
      try {
        const neighbor = await fetchNeighbor(
          current,
          dir
        );

        if (
          cancelled ||
          version !== generation.current
        ) {
          return;
        }

        preloadImage(neighbor);
      } catch {
        // Normal hareket sırasında tekrar denenebilir.
      }
    };

    void prepare('next');
    void prepare('prev');

    return () => {
      cancelled = true;
    };
  }, [
    current.imageId,
    current.sequenceId,
    locked,
    fetchNeighbor,
    preloadImage,
  ]);

  const move = async (dir: Direction) => {
    const from = currentRef.current;

    if (
      movingRef.current ||
      !from.sequenceId ||
      locked ||
      blocked[dir]
    ) {
      return;
    }

    movingRef.current = true;
    setMoving(true);

    const version = generation.current;

    try {
      const next = await fetchNeighbor(from, dir);

      if (version !== generation.current) return;

      neighborCache.current.set(
        keyFor(next, opposite(dir)),
        from
      );

      currentRef.current = next;
      setCurrent(next);
      setBlocked({});
    } catch {
      if (version !== generation.current) return;

      setBlocked((previous) => ({
        ...previous,
        [dir]: true,
      }));
    } finally {
      if (version === generation.current) {
        movingRef.current = false;
        setMoving(false);
      }
    }
  };

  const resetPosition = () => {
    if (movingRef.current) return;

    currentRef.current = image;
    setCurrent(image);
    setBlocked({});
  };

  const submit = useCallback(async () => {
    const selected = guessRef.current;

    if (!selected || busy || locked) return;

    setBusy(true);
    setErr(null);

    try {
      await onSubmit(selected);
    } catch (error) {
      setErr((error as Error).message);
    } finally {
      setBusy(false);
    }
  }, [busy, locked, onSubmit]);

  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    if (!deadline || locked) return;

    const timer = setTimeout(() => {
      if (guessRef.current) {
        void submitRef.current();
      }
    }, Math.max(0, deadline - getNow()));

    return () => clearTimeout(timer);
  }, [deadline, locked, getNow]);

  const canMove = !!current.sequenceId && !locked;

  const controlClass =
    'pointer-events-auto flex h-14 w-14 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-2xl border border-cyan-200/25 bg-[#071522]/85 text-cyan-100 shadow-xl backdrop-blur-xl transition hover:border-cyan-300/60 hover:bg-[#123047] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 sm:h-16 sm:w-16';

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#07111d] text-white">
      {/* Sokak görüntüsü */}
      <div className="absolute inset-0">
        <StreetViewer image={current} />
      </div>

      {/* Üst HAGY paneli */}
      <div className="pointer-events-none absolute left-3 right-3 top-3 z-[1100] flex flex-wrap items-start justify-between gap-2 sm:left-5 sm:right-5 sm:top-5">
        <div className="pointer-events-none flex max-w-full items-center gap-3 rounded-2xl border border-cyan-300/20 bg-[#071522]/85 px-3 py-2.5 shadow-xl backdrop-blur-xl sm:px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-xl font-black text-cyan-300">
            ◈
          </div>

          <div className="min-w-0">
            <div className="text-[10px] font-black tracking-[0.16em] text-cyan-300">
              HAGY EXPLORER
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-100 sm:text-sm">
              {hud}
            </div>
          </div>
        </div>

        <div className="hidden rounded-full border border-cyan-300/20 bg-[#071522]/80 px-4 py-2 text-[10px] font-bold tracking-[0.18em] text-cyan-200 backdrop-blur-xl sm:block">
          DISCOVER THE UNKNOWN
        </div>
      </div>

      {/* Keşif kontrol paneli */}
      {canMove && (
     
<div className="pointer-events-none absolute right-3 top-24 z-[1100] flex flex-col items-center gap-2 sm:right-5 sm:top-1/2 sm:-translate-y-1/2">
          <div className="mb-1 rounded-full border border-cyan-300/20 bg-[#071522]/85 px-3 py-1.5 text-[9px] font-black tracking-widest text-cyan-200 backdrop-blur">
            KEŞİF
          </div>

          <button
            type="button"
            className={controlClass}
            aria-label="İleri git"
            title="İleri git"
            disabled={moving || !!blocked.next}
            onClick={() => void move('next')}
          >
            <ControlIcon name="forward" />
            <span className="text-[10px] font-bold">
              İleri
            </span>
          </button>

          <button
            type="button"
            className={controlClass}
            aria-label="Geri git"
            title="Geri git"
            disabled={moving || !!blocked.prev}
            onClick={() => void move('prev')}
          >
            <ControlIcon name="back" />
            <span className="text-[10px] font-bold">
              Geri
            </span>
          </button>

          {current.imageId !== image.imageId && (
            <button
              type="button"
              className={controlClass}
              aria-label="Başlangıç konumuna dön"
              title="Başa dön"
              disabled={moving}
              onClick={resetPosition}
            >
              <ControlIcon name="reset" />
              <span className="text-[10px] font-bold">
                Başa
              </span>
            </button>
          )}
        </div>
      )}

      {/* Hareket durumu */}
      {moving && (
        <div
          role="status"
          className="pointer-events-none absolute left-1/2 top-24 z-[1100] -translate-x-1/2 rounded-full border border-cyan-300/20 bg-[#071522]/90 px-4 py-2 text-xs font-semibold text-cyan-100 shadow-xl backdrop-blur"
        >
          Yeni görüntü hazırlanıyor…
        </div>
      )}

      {/* Kaynak gösterimi */}
      <div className="pointer-events-none absolute bottom-2 left-2 z-[1100]">
        <Attribution image={current} />
      </div>

      {/* Tahmin terminali */}
      <div
        className={`absolute bottom-4 right-3 z-[1100] flex flex-col gap-2 transition-[width] duration-200 ${
          open
            ? 'w-[min(94vw,780px)]'
            : 'w-64 sm:w-80'
        }`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="flex items-center justify-between rounded-xl border border-cyan-300/20 bg-[#071522]/90 px-3 py-2 shadow-lg backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="text-lg text-cyan-300">
              ⌖
            </span>
            <div>
              <div className="text-[10px] font-black tracking-widest text-cyan-200">
                KONUM TERMİNALİ
              </div>
              <div className="text-[10px] text-slate-400">
                Haritada tahminini işaretle
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="touch-manipulation rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
            aria-label={
              open ? 'Haritayı küçült' : 'Haritayı büyüt'
            }
            aria-expanded={open}
          >
            {open ? 'Küçült' : 'Büyüt'}
          </button>
        </div>

        <div
          className={`relative overflow-hidden rounded-2xl border border-cyan-300/25 bg-[#0d1b2a] shadow-2xl transition-[height] duration-200 ${
            open
              ? 'h-[min(58vh,520px)]'
              : 'h-44'
          }`}
        >
          <MapPicker
            guess={guess}
            onPick={
              locked ? undefined : setGuess
            }
          />
        </div>

        {err && (
          <p
            role="alert"
            className="rounded-xl border border-rose-400/20 bg-rose-950/90 px-3 py-2 text-xs text-rose-200"
          >
            {err}
          </p>
        )}

        {locked ? (
          <div className="rounded-xl border border-white/10 bg-[#071522]/95 px-4 py-3 text-center text-sm font-semibold text-slate-300">
            {lockedMessage ?? 'Tahmin gönderildi'}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!guess || busy}
            className="min-h-12 touch-manipulation rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-[#07111d] shadow-xl transition enabled:hover:bg-cyan-200 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#172b3a] disabled:text-slate-400"
          >
            {busy
              ? 'Tahmin gönderiliyor…'
              : guess
                ? 'TAHMİNİ ONAYLA ↗'
                : 'HARİTADAN KONUM SEÇ'}
          </button>
        )}
      </div>
    </div>
  );
}
