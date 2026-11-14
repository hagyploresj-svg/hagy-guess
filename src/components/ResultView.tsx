
'use client';

import dynamic from 'next/dynamic';
import { ReactNode, useState } from 'react';
import { formatKm } from '@/lib/geo';
import type { LatLng } from '@/lib/types';

const MapPicker = dynamic(
  () => import('./MapPicker'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-[#0d1b2a]" />
    ),
  }
);

export const PLAYER_COLORS = [
  '#3b82f6',
  '#f43f5e',
  '#f59e0b',
  '#a855f7',
  '#14b8a6',
  '#ec4899',
  '#84cc16',
  '#06b6d4',
];

export interface ResultEntry {
  name: string;
  pos: LatLng | null;
  distanceKm?: number | null;
  score?: number | null;
  color: string;
  you?: boolean;
}

function getAchievement(distance?: number | null) {
  if (distance == null) {
    return {
      title: 'KEŞİF TAMAMLANDI',
      description: 'Yeni bir rota seni bekliyor.',
      icon: '◎',
    };
  }

  if (distance < 1) {
    return {
      title: 'EFSANEVİ KEŞİF',
      description: 'Neredeyse tam isabet!',
      icon: '✦',
    };
  }

  if (distance < 25) {
    return {
      title: 'USTA KÂŞİF',
      description: 'Konuma oldukça yaklaştın.',
      icon: '◈',
    };
  }

  if (distance < 200) {
    return {
      title: 'BAŞARILI KEŞİF',
      description: 'İpuçlarını iyi değerlendirdin.',
      icon: '⌖',
    };
  }

  return {
    title: 'YENİ BİR DENEYİM',
    description: 'Her keşif seni biraz daha geliştirir.',
    icon: '↗',
  };
}

export default function ResultView({
  title,
  actual,
  entries,
  footer,
}: {
  title: string;
  actual: LatLng;
  entries: ResultEntry[];
  footer: ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);

  const mine = entries.find(
    (entry) => entry.you && entry.pos
  );

  const myEntry = entries.find(
    (entry) => entry.you
  );

  const others = entries
    .filter((entry) => !entry.you && entry.pos)
    .map((entry) => ({
      pos: entry.pos as LatLng,
      color: entry.color,
      label: entry.name,
    }));

  const sorted = [...entries].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1)
  );

  const achievement = getAchievement(
    myEntry?.pos ? myEntry.distanceKm : null
  );

  const myRank = myEntry
    ? sorted.findIndex((entry) => entry === myEntry) + 1
    : null;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#07111d] text-white">

      {/* Sonuç haritası */}
      <div className="absolute inset-0">
        <MapPicker
          guess={mine?.pos ?? null}
          actual={actual}
          others={others}
        />
      </div>

      {/* Üst HAGY markası */}
      <div className="pointer-events-none absolute left-3 top-3 z-[1100] flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-[#071522]/90 px-4 py-3 shadow-xl backdrop-blur-xl sm:left-5 sm:top-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-2xl text-cyan-200">
          ◈
        </div>

        <div>
          <div className="text-xs font-black tracking-[0.15em] text-cyan-300">
            HAGY EXPLORER
          </div>
          <div className="mt-1 text-[10px] font-semibold text-slate-300">
            KEŞİF RAPORU
          </div>
        </div>
      </div>

      {/* Sonuç paneli */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1100] flex justify-center p-3 sm:p-5">
        <section className="pointer-events-auto w-full max-w-xl overflow-hidden rounded-[26px] border border-cyan-300/20 bg-[#071522]/95 shadow-2xl backdrop-blur-xl">

          {/* Panel başlığı */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black tracking-[0.2em] text-cyan-300">
                HAGY / SONUÇLAR
              </p>
              <h2 className="mt-1 truncate text-lg font-black sm:text-xl">
                {title}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="ml-3 shrink-0 touch-manipulation rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/20"
              aria-expanded={expanded}
              aria-label={
                expanded
                  ? 'Sonuç panelini küçült'
                  : 'Sonuç panelini büyüt'
              }
            >
              {expanded ? 'Haritayı Gör ↓' : 'Sonuçları Aç ↑'}
            </button>
          </div>

          {expanded && (
            <div className="max-h-[min(72dvh,640px)] overflow-y-auto">

              {/* Başarı alanı */}
              <div className="border-b border-white/10 px-5 py-5 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-3xl text-cyan-300">
                  {achievement.icon}
                </div>

                <h3 className="mt-3 text-sm font-black tracking-[0.12em] text-cyan-200">
                  {achievement.title}
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  {achievement.description}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-4">
                    <div className="text-[10px] font-bold tracking-widest text-slate-400">
                      KAZANILAN PUAN
                    </div>

                    <div className="mt-2 text-3xl font-black tabular-nums text-cyan-300 sm:text-4xl">
                      {(myEntry?.score ?? 0).toLocaleString('tr-TR')}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4">
                    <div className="text-[10px] font-bold tracking-widest text-slate-400">
                      TAHMİN MESAFESİ
                    </div>

                    <div className="mt-2 text-2xl font-black tabular-nums text-white sm:text-3xl">
                      {myEntry?.pos &&
                      myEntry.distanceKm != null
                        ? formatKm(myEntry.distanceKm)
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Oyuncu sıralaması */}
              <div className="px-5 py-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-black tracking-wide text-white">
                    KEŞİF SIRALAMASI
                  </h3>

                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold text-slate-400">
                    {entries.length} OYUNCU
                  </span>
                </div>

                {myRank !== null && entries.length > 1 && (
                  <p className="mb-3 text-xs text-cyan-200">
                    Senin sıran: #{myRank}
                  </p>
                )}

                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {sorted.map((entry, index) => (
                    <li
                      key={index}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 ${
                        entry.you
                          ? 'border-cyan-300/30 bg-cyan-300/10'
                          : 'border-white/5 bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="w-6 shrink-0 text-center text-xs font-black text-slate-400">
                          {String(index + 1).padStart(2, '0')}
                        </span>

                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{
                            backgroundColor: entry.you
                              ? '#67e8f9'
                              : entry.color,
                          }}
                        />

                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-white">
                            {entry.name}
                            {entry.you && (
                              <span className="ml-2 text-[10px] text-cyan-300">
                                SEN
                              </span>
                            )}
                          </div>

                          <div className="mt-1 text-[11px] text-slate-400">
                            {entry.pos
                              ? entry.distanceKm != null
                                ? formatKm(entry.distanceKm)
                                : 'Mesafe bilinmiyor'
                              : 'Tahmin yapılmadı'}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-base font-black tabular-nums text-cyan-300">
                          {(entry.score ?? 0).toLocaleString('tr-TR')}
                        </div>
                        <div className="text-[9px] font-bold tracking-widest text-slate-500">
                          PUAN
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mevcut sonraki tur / devam butonları */}
              <div className="border-t border-white/10 bg-white/[0.025] px-5 py-4">
                {footer}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
