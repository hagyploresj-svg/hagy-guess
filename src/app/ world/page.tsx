
'use client';

import dynamic from 'next/dynamic';

const House3D = dynamic(
  () => import('@/components/House3D'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[500px] items-center justify-center rounded-2xl bg-slate-900 text-cyan-400">
        HAGY WORLD yükleniyor...
      </div>
    ),
  }
);

export default function WorldPage() {
  return (
    <main className="min-h-screen bg-[#07111d] px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-xs font-bold tracking-[0.3em] text-cyan-400">
            HAGY GUESS
          </p>

          <h1 className="mt-2 text-3xl font-black">
            HAGY WORLD
          </h1>

          <p className="mt-2 text-slate-400">
            Kendi evini inşa et, geliştir ve dünyanı büyüt.
          </p>
        </div>

        <div className="mt-6">
          <House3D />
        </div>
      </div>
    </main>
  );
}
