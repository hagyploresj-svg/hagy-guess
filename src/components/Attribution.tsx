
import type { RoundImage } from '@/lib/types';

/**
 * HAGY GUESS - Mapillary görüntü atıfları
 * Görüntü sahibi, kaynak ve lisans bağlantıları.
 */
export default function Attribution({
  image,
}: {
  image: RoundImage;
}) {
  const imageUrl =
    `https://www.mapillary.com/app/?pKey=${encodeURIComponent(image.imageId)}`;

  const year = image.capturedAt
    ? new Date(image.capturedAt).getUTCFullYear()
    : null;

  const linkClass =
    'underline underline-offset-2 hover:text-white transition-colors';

  return (
    <div className="pointer-events-auto max-w-[95vw] rounded-lg border border-white/10 bg-slate-950/85 px-3 py-2 text-[11px] leading-relaxed text-slate-200 shadow-lg backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <span className="font-semibold text-white">
          360° Görüntü:
        </span>

        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Mapillary
          {image.creator ? ` / ${image.creator}` : ''}
        </a>

        {year && Number.isFinite(year) ? (
          <span className="text-slate-400">
            ({year})
          </span>
        ) : null}

        <span className="text-slate-500">•</span>

        <a
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          CC BY-SA 4.0
        </a>

        <span className="text-slate-500">•</span>

        <span className="text-slate-400">
          Görüntü kaynağı ve lisans bilgisi
        </span>
      </div>
    </div>
  );
}
