
'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { Viewer } from '@photo-sphere-viewer/core';
import '@photo-sphere-viewer/core/index.css';

import type { RoundImage } from '@/lib/types';

const TRANSITION_MS = 500;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

export default function StreetViewer({
  image,
}: {
  image: RoundImage;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const flatRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  const latestImageRef = useRef(image);
  latestImageRef.current = image;

  const previousUrlRef = useRef(image.imageUrl);

  const [previousPhoto, setPreviousPhoto] = useState<
    string | null
  >(null);

  const [animating, setAnimating] = useState(false);
  const [zoom, setZoom] = useState(1);

  const zoomRef = useRef(1);
  const touchDistanceRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef(1);

  const setFlatZoom = useCallback((value: number) => {
    const next = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, value)
    );

    zoomRef.current = next;
    setZoom(next);
  }, []);

  const changeZoom = useCallback(
    (direction: number) => {
      if (image.isPano) {
        const viewer = viewerRef.current;

        if (!viewer) return;

        const current = viewer.getZoomLevel();

        viewer.zoom(
          Math.min(
            100,
            Math.max(0, current + direction * 15)
          )
        );

        return;
      }

      setFlatZoom(
        zoomRef.current + direction * ZOOM_STEP
      );
    },
    [image.isPano, setFlatZoom]
  );

  const resetZoom = useCallback(() => {
    if (image.isPano) {
      viewerRef.current?.zoom(25);
      return;
    }

    setFlatZoom(1);
  }, [image.isPano, setFlatZoom]);

  // 360 derece görüntüleyiciyi başlat
  useEffect(() => {
    if (!image.isPano || !containerRef.current) {
      return;
    }

    let cancelled = false;
    let localViewer: Viewer | null = null;

    import('@photo-sphere-viewer/core')
      .then(({ Viewer }) => {
        if (cancelled || !containerRef.current) {
          return;
        }

        const initialUrl =
          latestImageRef.current.imageUrl;

        localViewer = new Viewer({
          container: containerRef.current,
          panorama: initialUrl,
          navbar: ['zoom', 'fullscreen'],
          defaultZoomLvl: 25,
          mousewheelCtrlKey: false,
          loadingTxt: 'Panorama yükleniyor…',
        });

        viewerRef.current = localViewer;

        const newestUrl =
          latestImageRef.current.imageUrl;

        if (newestUrl !== initialUrl) {
          void localViewer
            .setPanorama(newestUrl, {
              transition: true,
              showLoader: false,
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;

      if (localViewer) {
        localViewer.destroy();
      }

      if (viewerRef.current === localViewer) {
        viewerRef.current = null;
      }
    };
  }, [image.isPano]);

  // Panorama değiştiğinde yumuşak geçiş
  useEffect(() => {
    if (!image.isPano) return;

    const viewer = viewerRef.current;

    if (!viewer) return;

    void viewer
      .setPanorama(image.imageUrl, {
        transition: true,
        showLoader: false,
      })
      .catch(() => {});
  }, [image.imageUrl, image.isPano]);

  // Düz fotoğraf değiştiğinde zoom sıfırla
  useEffect(() => {
    if (image.isPano) return;

    setFlatZoom(1);
  }, [image.imageUrl, image.isPano, setFlatZoom]);

  // Düz fotoğraf geçiş animasyonu
  useEffect(() => {
    if (image.isPano) {
      previousUrlRef.current = image.imageUrl;
      return;
    }

    if (previousUrlRef.current === image.imageUrl) {
      return;
    }

    const oldPhoto = previousUrlRef.current;
    previousUrlRef.current = image.imageUrl;

    setPreviousPhoto(oldPhoto);
    setAnimating(false);

    let secondFrame = 0;

    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        setAnimating(true);
      });
    });

    const timer = setTimeout(() => {
      setPreviousPhoto(null);
      setAnimating(false);
    }, TRANSITION_MS + 100);

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      clearTimeout(timer);
    };
  }, [image.imageUrl, image.isPano]);

  // Düz fotoğraf için fare tekerleği
  useEffect(() => {
    if (image.isPano) return;

    const element = flatRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const direction = event.deltaY < 0 ? 1 : -1;

      setFlatZoom(
        zoomRef.current + direction * ZOOM_STEP
      );
    };

    element.addEventListener('wheel', handleWheel, {
      passive: false,
    });

    return () => {
      element.removeEventListener(
        'wheel',
        handleWheel
      );
    };
  }, [image.isPano, setFlatZoom]);

  // İki parmak arasındaki mesafe
  const getTouchDistance = (
    touches: React.TouchList
  ) => {
    const first = touches[0];
    const second = touches[1];

    if (!first || !second) return 0;

    return Math.hypot(
      second.clientX - first.clientX,
      second.clientY - first.clientY
    );
  };

  const handleTouchStart = (
    event: React.TouchEvent<HTMLDivElement>
  ) => {
    if (event.touches.length === 2) {
      touchDistanceRef.current =
        getTouchDistance(event.touches);

      touchStartZoomRef.current = zoomRef.current;
    }
  };

  const handleTouchMove = (
    event: React.TouchEvent<HTMLDivElement>
  ) => {
    if (
      event.touches.length !== 2 ||
      touchDistanceRef.current === null
    ) {
      return;
    }

    const distance = getTouchDistance(event.touches);

    if (touchDistanceRef.current > 0) {
      const ratio =
        distance / touchDistanceRef.current;

      setFlatZoom(
        touchStartZoomRef.current * ratio
      );
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
  };

  const zoomButtons = (
    <div className="absolute bottom-5 right-5 z-20 flex flex-col gap-2">
      <button
        type="button"
        onClick={() => changeZoom(1)}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/75 text-2xl font-bold text-white shadow-lg transition hover:bg-black"
        aria-label="Yakınlaştır"
        title="Yakınlaştır"
      >
        +
      </button>

      <button
        type="button"
        onClick={() => changeZoom(-1)}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/75 text-2xl font-bold text-white shadow-lg transition hover:bg-black"
        aria-label="Uzaklaştır"
        title="Uzaklaştır"
      >
        −
      </button>

      <button
        type="button"
        onClick={resetZoom}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/75 text-xl font-bold text-white shadow-lg transition hover:bg-black"
        aria-label="Zoom sıfırla"
        title="Zoom sıfırla"
      >
        ↺
      </button>
    </div>
  );

  if (image.isPano) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-black">
        <div
          ref={containerRef}
          className="h-full w-full"
        />

        {zoomButtons}
      </div>
    );
  }

  return (
    <div
      ref={flatRef}
      className="relative h-full w-full overflow-hidden bg-black"
      style={{
        touchAction: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Yeni sokak fotoğrafı */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.imageUrl}
        alt="Sokak görüntüsü"
        draggable={false}
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full select-none object-contain"
        style={{
          transform: `scale(${zoom})`,
          transition: 'transform 150ms ease-out',
          transformOrigin: 'center center',
        }}
      />

      {/* Eski fotoğrafın yumuşak geçişi */}
      {previousPhoto && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previousPhoto}
            alt=""
            draggable={false}
            referrerPolicy="no-referrer"
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
            style={{
              opacity: animating ? 0 : 1,
              transform: animating
                ? 'scale(1.1)'
                : 'scale(1)',
              transition:
                'opacity 500ms ease-in-out, transform 500ms ease-in-out',
            }}
          />
        </>
      )}

      <span className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-amber-300">
        Düz fotoğraf (360° değil)
      </span>

      {zoomButtons}
    </div>
  );
}
