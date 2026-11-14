
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

  // Aynı isteğin tekrar gönderilmesini önler
  const pending = useRef(
    new Map<string, Promise<RoundImage>>()
  );

  // Görüntüleri tarayıcı belleğinde tut
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

  // Yeni tur geldiğinde eski tur verilerini temizle
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

  // İleri ve geri görüntülerini önceden yükle
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
        // Ön yükleme başarısız olursa
        // normal hareket sırasında tekrar denenir.
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

  // İleri / geri hareket
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

      // Geri dönüşü hızlı yapabilmek için
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

  // Tahmini gönder
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

  // Süre dolunca seçilmiş tahmini gönder
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

  // Mobil için büyük dokunmatik butonlar
  const arrow =
    'pointer-events-auto flex h-14 w-14 touch-manipulation select-none items-center justify-center rounded-2xl border border-white/20 bg-slate-950/75 text-white shadow-xl backdrop-blur-md transition active:scale-95 active:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-30 sm:h-12 sm:w-20 sm:text-sm';

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">

      {/* Sokak görüntüsü */}
      <div className="absolute inset-0">
        <StreetViewer image={current} />
      </div>

      {/* Üst bilgi alanı */}
      <div className="pointer-events-none absolute left-3 top-3 z-[1100] flex items-center gap-3 rounded-xl bg-black/60 px-4 py-2 text-sm font-semibold backdrop-blur">
        {hud}
      </div>

      {/* MOBİL İLERİ / GERİ KONTROLLERİ */}
      {canMove && (
        <div className="pointer-events-none absolute right-3 top-1/2 z-[1100] flex -translate-y-1/2 flex-col items-center gap-3 sm:right-5">

          <button
            type="button"
            className={arrow}
            aria-label="İleri git"
            title="İleri git"
            disabled={moving || !!blocked.next}
            onClick={() => void move('next')}
          >
            <span className="flex flex-col items-center leading-tight">
              <span className="text-2xl sm:text-xl">
                ▲
              </span>
              <span className="text-[10px]">
                İleri
              </span>
            </span>
          </button>

          <button
            type="button"
            className={arrow}
            aria-label="Geri git"
            title="Geri git"
            disabled={moving || !!blocked.prev}
            onClick={() => void move('prev')}
          >
            <span className="flex flex-col items-center leading-tight">
              <span className="text-2xl sm:text-xl">
                ▼
              </span>
              <span className="text-[10px]">
                Geri
              </span>
            </span>
          </button>

          {current.imageId !== image.imageId && (
            <button
              type="button"
              className={arrow}
              aria-label="Başlangıç konumuna dön"
              title="Başa dön"
              disabled={moving}
              onClick={() => {
                currentRef.current = image;
                setCurrent(image);
                setBlocked({});
              }}
            >
              <span className="flex flex-col items-center leading-tight">
                <span className="text-2xl sm:text-xl">
                  ↺
                </span>
                <span className="text-[10px]">
                  Başa
                </span>
              </span>
            </button>
          )}
        </div>
      )}

      {/* Hareket yüklenme bildirimi */}
      {moving && (
        <div className="pointer-events-none absolute left-1/2 top-20 z-[1100] -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-xs text-white backdrop-blur">
          Görüntü hazırlanıyor…
        </div>
      )}

      {/* Mapillary lisans ve kaynak bilgisi */}
      <div className="pointer-events-none absolute bottom-2 left-2 z-[1100]">
        <Attribution image={current} />
      </div>

      {/* Tahmin haritası */}
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
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="absolute right-2 top-2 z-[1200] rounded bg-black/60 px-2 py-1 text-xs sm:hidden"
            aria-label="Haritayı büyüt veya küçült"
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
            type="button"
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
