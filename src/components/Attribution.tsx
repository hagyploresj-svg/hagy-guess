import type { RoundImage } from '@/lib/types';

/** Mapillary CC BY-SA 4.0 atfı: katkıcı adı + kaynak + lisans bağlantıları. */
export default function Attribution({ image }: { image: RoundImage }) {
  const link = 'underline hover:text-white';
  return (
    <div className="pointer-events-auto max-w-[90vw] rounded-md bg-black/60 px-2 py-1 text-[11px] text-slate-300 backdrop-blur">
      Görüntü:{' '}
      <a className={link} href={`https://www.mapillary.com/app/?pKey=${image.imageId}`} target="_blank" rel="noreferrer">
        © Mapillary{image.creator ? ` / ${image.creator}` : ''}
      </a>
      {image.capturedAt ? ` (${new Date(image.capturedAt).getUTCFullYear()})` : ''},{' '}
      <a className={link} href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>
    </div>
  );
}
