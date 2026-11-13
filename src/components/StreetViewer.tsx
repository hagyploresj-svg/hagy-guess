
'use client';

import { useEffect, useRef, useState } from 'react';
import type { Viewer } from '@photo-sphere-viewer/core';
import '@photo-sphere-viewer/core/index.css';
import type { RoundImage } from '@/lib/types';

const TRANSITION_MS = 500;

export default function StreetViewer({
  image,
}: {
  image: RoundImage;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const latestImageRef = useRef(image);
  latestImageRef.current = image;

  const [previousPhoto, setPreviousPhoto] = useState<
    string | null
  >(null);

  const [animating, setAnimating] = useState(false);
  const previousUrlRef = useRef(image.imageUrl);

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

        const initialUrl = latestImageRef.current.imageUrl;

        localViewer = new Viewer({
          container: containerRef.current,
          panorama: initialUrl,
          navbar: ['zoom', 'fullscreen'],
          defaultZoomLvl: 25,
          mousewheelCtrlKey: false,
          loadingTxt: 'Panorama yükleniyor…',
        });

        viewerRef.current = localViewer;

        // Başlatma sırasında fotoğraf değişmişse güncelle
        const newestUrl = latestImageRef.current.imageUrl;

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

  if (image.isPano) {
    return (
      <div
        ref={containerRef}
        className="h-full w-full bg-black"
      />
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* Yeni sokak fotoğrafı */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.imageUrl}
        alt="Sokak görüntüsü"
        draggable={false}
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full select-none object-contain"
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
    </div>
  );
}
