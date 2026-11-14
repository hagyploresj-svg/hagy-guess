
'use client';

import dynamic from 'next/dynamic';

const Character3D = dynamic(
  () => import('@/components/Character3D'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[500px] items-center justify-center rounded-2xl bg-slate-900 text-cyan-400">
        3D karakter hazırlanıyor...
      </div>
    ),
  }
);

export default function CharacterPage() {
  return (
    <main className="min-h-screen bg-[#060c17] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-bold tracking-widest text-cyan-400">
            HAGY WORLD
          </p>

          <h1 className="mt-2 text-3xl font-black">
            KARAKTER OLUŞTURUCU
          </h1>

          <p className="mt-2 text-slate-400">
            3D karakterini 360° döndürerek incele.
          </p>
        </div>

        <div className="mt-6">
          <Character3D />
        </div>
      </div>
    </main>
  );
}
