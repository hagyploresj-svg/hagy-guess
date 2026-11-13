
'use client';

import { useEffect, useRef, useState } from 'react';
import type { Viewer } from '@photo-sphere-viewer/core';
import '@photo-sphere-viewer/core/index.css';
import type { RoundImage } from '@/lib/types';

interface Props {
  image: RoundImage;
}

const TRANSITION_MS = 550;

export default function StreetViewer({ image }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);

  const latestImage = useRef(image);
  latestImage.current = image;

  const previousUrl = useRef(image.imageUrl);

  const [flatPrevious, setFlatPrevious] = useState<
    string | null
  >(null);

  const [flatTransition, setFlatTransition] =
    useState(false);

  const transitionId = useRef(0);

  // 360 derece panorama görüntüleyicisini oluştur
  useEffect(() => {
    if (!image.isPano || !box.current) return;

    let cancelled = false;
    let instance: Viewer | null = null;

    import('@photo-sphere-viewer/core')
      .then(({ Viewer }) => {
        if (cancelled || !box.current) return;

        const firstUrl = latestImage.current.imageUrl;

        instance = new Viewer({
          container: box.current,
          panorama: firstUrl,
          navbar: ['zoom', 'fullscreen'],
          defaultZoomLvl: 25,
          mousewheelCtrlKey: false,
          loadingTxt: 'Panorama yükleniyor…',
        });

        viewer.current = instance;

        const newestUrl = latestImage.current.imageUrl;

        if (newestUrl !== firstUrl) {
          void instance
            .setPanorama(newestUrl, {
              transition: {
                duration: TRANSITION_MS,
              },
              showLoader: false,
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;

      if (instance) {
        instance.destroy();
      }

      if (viewer.current === instance) {
        viewer.current = null;
      }
    };
  }, [image.isPano]);

  // Yeni 360 derece görüntüye animasyonlu geç
  useEffect(() => {
    if (!image.isPano) return;

    const instance = viewer.current;

    if (!instance) return;

    void instance
      .setPanorama(image.imageUrl, {
        transition: {
          duration: TRANSITION_MS,
        },
        showLoader: false,
      })
      .catch(() => {});
  }, [image.imageUrl, image.isPano]);

  // Düz fotoğraflar için yumuşak geçiş
  useEffect(() => {
    if (image.isPano) {
      previousUrl.current = image.imageUrl;
      return;
    }

    if (previousUrl.current === image.imageUrl) {
      return;
    }

    const oldUrl = previousUrl.current;
    previousUrl.current = image.imageUrl;

    transitionId.current += 1;
    const currentId = transitionId.current;

    setFlatPrevious(oldUrl);
    setFlatTransition(false);

    let frame2 = 0;

    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        if (currentId === transitionId.current) {
          setFlatTransition(true);
        }
      });
    });

    const timer = setTimeout(() => {
      if (currentId === transitionId.current) {
        setFlatPrevious(null);
        setFlatTransition(false);
      }
    }, TRANSITION_MS + 80);

    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
      clearTimeout(timer);
    };
  }, [image.imageUrl, image.isPano]);

  if (image.isPano) {
    return (
      <div
        ref={box}
        className="h-full w-full bg-black"
      />
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* Yeni fotoğraf */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.imageUrl}
        alt="Sokak görüntüsü"
        draggable={false}
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full select-none object-contain"
      />

      {/* Eski fotoğraf yumuşak şekilde kaybolur */}
      {flatPrevious && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={flatPrevious}
            alt=""
            draggable={false}
            referrerPolicy="no-referrer"
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
            style={{
              opacity: flatTransition ? 0 : 1,
              transform: flatTransition
                ? 'scale(1.12)'
                : 'scale(1)',
              transition: `
                opacity ${TRANSITION_MS}ms ease-in-out,
                transform ${TRANSITION_MS}ms ease-in-out
              `,
            }}
          />
        </>
      )}

      <span className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-amber-300">
        Düz fotoğraf (360° değil)
      </span>
    </div>
  );
}
