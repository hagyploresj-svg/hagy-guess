import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
        Ücretsiz · Sınırsız oyun
      </div>
      <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
        HAGY <span className="text-brand">GUESS</span>
      </h1>
      <p className="mt-5 max-w-xl text-lg text-slate-400">
        Dünyanın bir yerine bırakıl, çevreni incele ve haritada nerede olduğunu tahmin et.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/play" className="rounded-xl bg-brand px-8 py-4 text-lg font-bold text-slate-950 transition hover:bg-emerald-400">
          Tek Kişilik
        </Link>
        <Link href="/room" className="rounded-xl border border-slate-700 bg-slate-900 px-8 py-4 text-lg font-bold transition hover:border-slate-500">
          Çok Oyunculu
        </Link>
      </div>
      <footer className="mt-16 max-w-xl text-xs leading-relaxed text-slate-500">
        Sokak görüntüleri ©{' '}
        <a className="underline" href="https://www.mapillary.com" target="_blank" rel="noreferrer">Mapillary</a>{' '}
        katkıcıları,{' '}
        <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.
        Harita verisi © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> katkıcıları.
      </footer>
    </main>
  );
}
