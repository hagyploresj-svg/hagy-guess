'use client';
import { useEffect, useRef } from 'react';
import type { Viewer } from '@photo-sphere-viewer/core';
import '@photo-sphere-viewer/core/index.css';
import type { RoundImage } from '@/lib/types';

/**
 * Yalnızca is_pano=true görüntüler küresel (360°) görüntüleyicide açılır.
 * Diğerleri düz fotoğraf olarak gösterilir ve etiketlenir — 360° gibi sunulmaz.
 */
export default function StreetViewer({ image }: { image: RoundImage }) {
  const box = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const urlRef = useRef(image.imageUrl);
  urlRef.current = image.imageUrl;

  useEffect(() => {
    if (!image.isPano || !box.current) return;
    let dead = false;
    import('@photo-sphere-viewer/core').then(({ Viewer }) => {
      if (dead || !box.current) return;
      viewer.current = new Viewer({
        container: box.current,
        panorama: urlRef.current,
        navbar: ['zoom', 'fullscreen'],
        defaultZoomLvl: 25,
        mousewheelCtrlKey: false,
        loadingTxt: 'Panorama yükleniyor…',
      });
    });
    return () => { dead = true; viewer.current?.destroy(); viewer.current = null; };
  }, [image.isPano]);

  useEffect(() => {
    viewer.current?.setPanorama(image.imageUrl, { transition: false, showLoader: false }).catch(() => {});
  }, [image.imageUrl]);

  if (image.isPano) return <div ref={box} className="h-full w-full" />;

  return (
    <div className="relative h-full w-full bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.imageUrl} alt="" draggable={false} referrerPolicy="no-referrer"
        className="h-full w-full select-none object-contain" />
      <span className="absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-amber-300">
        Düz fotoğraf (360° değil)
      </span>
    </div>
  );
}
