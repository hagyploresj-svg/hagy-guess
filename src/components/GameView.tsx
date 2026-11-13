
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
      <div className="h-full w-full bg-black" />
    ),
  }
);

const MapPicker = dynamic(
  () => import('./MapPicker'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-slate-900" />
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

  // Önceden getirilen komşu görüntüler
  const neighborCache = useRef(
    new Map<string, RoundImage>()
  );

  // Aynı isteği tekrar göndermeyi önler
  const pending = useRef(
    new Map<string, Promise<RoundImage>>()
  );

  // Önceden yüklenmiş resimleri bellekte tut
  const preloadedImages = useRef(
    new Map<string, HTMLImageElement>()
  );

  const generation = useRef(0);

  const guessRef = useRef(guess);
  guessRef.current = guess;

  const keyFor = (
    img: RoundImage,
    dir: Direction
  ) => `${img.sequenceId}:${img.imageId}:${dir}`;

  const preloadImage = useCallback(
    (img: RoundImage) => {
      if (
        preloadedImages.current.has(img.imageId)
      ) {
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

  // Yeni tur geldiğinde eski tur önbelleğini temizle
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

  // Her görüntü değiştiğinde iki yönü önceden hazırla
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
        // Ön yükleme başarısızsa normal hareket
        // sırasında yeniden denenebilir.
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
      const next = await fetchNeighbor(
        from,
        dir
      );

      if (version !== generation.current) return;

      // Geri dönüşü anında mümkün kıl
      neighborCache.current.set(
        keyFor(next, opposite(dir)),
        from
      );

      currentRef.current = next;
      setCurrent(next);
      setBlocked({});
    } catch (error) {
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

  const canMove =
    !!current.sequenceId && !locked;

  const arrow =
    'pointer-events-auto flex h-11 min-w-24 items-center justify-center rounded-full bg-black/60 px-4 text-sm font-semibold text-white backdrop-blur transition hover:bg-black/80 disabled:opacity-30';

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <div className="absolute inset-0">
        <StreetViewer image={current} />
      </div>

      <div className="pointer-events-none absolute left-3 top-3 z-[1100] flex items-center gap-3 rounded-xl bg-black/60 px-4 py-2 text-sm font-semibold backdrop-blur">
        {hud}
      </div>

      {canMove && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-[1100] flex -translate-x-1/2 gap-3">
          <button
            className={arrow}
            disabled={moving || !!blocked.prev}
            onClick={() => void move('prev')}
          >
            ▼ Geri
          </button>

          <button
            className={arrow}
            disabled={moving || !!blocked.next}
            onClick={() => void move('next')}
          >
            ▲ İleri
          </button>

          {current.imageId !== image.imageId && (
            <button
              className={arrow}
              disabled={moving}
              onClick={() => {
                currentRef.current = image;
                setCurrent(image);
                setBlocked({});
              }}
            >
              ⟲ Başa dön
            </button>
          )}
        </div>
      )}

      {moving && (
        <div className="pointer-events-none absolute left-1/2 top-20 z-[1100] -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-xs text-white backdrop-blur">
          Görüntü hazırlanıyor…
        </div>
      )}

      <div className="pointer-events-none absolute bottom-2 left-2 z-[1100]">
        <Attribution image={current} />
      </div>

      <div
        className={`absolute bottom-4 right-3 z-[1100] flex flex-col gap-2 transition-[width] duration-200 ${
          open
            ? 'w-[min(94vw,780px)]'
            : 'w-64 sm:w-80'
        }`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div
          className={`relative overflow-hidden rounded-xl border border-slate-600 shadow-2xl transition-[height] duration-200 ${
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

          <button
            onClick={() => setOpen((value) => !value)}
            className="absolute right-2 top-2 z-[1200] rounded bg-black/60 px-2 py-1 text-xs sm:hidden"
          >
            ⤢
          </button>
        </div>

        {err && (
          <p className="rounded bg-rose-950/80 px-3 py-1 text-xs text-rose-300">
            {err}
          </p>
        )}

        {locked ? (
          <div className="rounded-xl bg-slate-800/90 px-4 py-3 text-center text-sm text-slate-300">
            {lockedMessage ?? 'Tahmin gönderildi'}
          </div>
        ) : (
          <button
            onClick={() => void submit()}
            disabled={!guess || busy}
            className="rounded-xl bg-brand py-3 font-bold text-slate-950 transition enabled:hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400"
          >
            {busy
              ? 'Gönderiliyor…'
              : guess
                ? 'Tahmin Et'
                : 'Haritada bir yer seç'}
          </button>
        )}
      </div>
    </div>
  );
}
