'use client';
import dynamic from 'next/dynamic';
import { ReactNode } from 'react';
import { formatKm } from '@/lib/geo';
import type { LatLng } from '@/lib/types';

const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false, loading: () => <div className="h-full w-full bg-slate-900" /> });

export const PLAYER_COLORS = ['#3b82f6', '#f43f5e', '#f59e0b', '#a855f7', '#14b8a6', '#ec4899', '#84cc16', '#06b6d4'];

export interface ResultEntry {
  name: string; pos: LatLng | null; distanceKm?: number | null; score?: number | null; color: string; you?: boolean;
}

export default function ResultView({ title, actual, entries, footer }: {
  title: string; actual: LatLng; entries: ResultEntry[]; footer: ReactNode;
}) {
  const mine = entries.find((e) => e.you && e.pos);
  const others = entries.filter((e) => !e.you && e.pos).map((e) => ({ pos: e.pos as LatLng, color: e.color, label: e.name }));
  const sorted = [...entries].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  return (
    <div className="relative h-dvh w-full">
      <MapPicker guess={mine?.pos ?? null} actual={actual} others={others} />
      <div className="absolute inset-x-0 bottom-0 z-[1100] flex justify-center p-3">
        <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900/95 p-5 shadow-2xl backdrop-blur">
          <h2 className="mb-3 text-center text-lg font-bold">{title}</h2>
          <ul className="mb-4 max-h-48 space-y-1 overflow-auto">
            {sorted.map((e, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-slate-800/70 px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: e.you ? '#3b82f6' : e.color }} />
                  <span className={e.you ? 'font-bold' : ''}>{e.name}</span>
                </span>
                <span className="text-slate-300">
                  {e.pos ? `${formatKm(e.distanceKm ?? 0)} · ` : 'Tahmin yok · '}
                  <b className="text-emerald-400">{(e.score ?? 0).toLocaleString('tr-TR')}</b>
                </span>
              </li>
            ))}
          </ul>
          {footer}
        </div>
      </div>
    </div>
  );
}
