
import Link from 'next/link';

export default function Home() {
  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-[#070d1b] text-white">
      {/* Arka plan ışıkları */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[110px]" />
        <div className="absolute -right-40 top-1/3 h-[550px] w-[550px] rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[350px] w-[350px] rounded-full bg-blue-500/10 blur-[100px]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
            backgroundSize: '65px 65px',
          }}
        />
      </div>

      {/* Üst menü */}
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-2xl">
            🌍
          </div>

          <span className="text-xl font-black tracking-tight">
            HAGY <span className="text-emerald-400">GUESS</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 sm:inline-flex">
            ● ÜCRETSİZ OYNA
          </span>

          <Link
            href="/play"
            className="rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-bold transition hover:bg-white/20"
          >
            Oyuna Başla
          </Link>
        </div>
      </header>

      {/* Ana içerik */}
      <section className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-6 pb-20 pt-10 text-center sm:pt-16">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-5 py-2 text-xs font-bold tracking-widest text-emerald-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          DÜNYA SENİ BEKLİYOR
        </div>

        {/* Dünya görseli */}
        <div className="relative mb-4 flex h-52 w-52 items-center justify-center sm:h-64 sm:w-64">
          <div className="absolute inset-4 animate-pulse rounded-full bg-cyan-400/20 blur-3xl" />

          <div className="absolute inset-0 rounded-full border border-emerald-400/15" />
          <div className="absolute inset-5 rounded-full border border-cyan-400/15" />

          <div
            className="relative flex h-40 w-40 items-center justify-center rounded-full sm:h-52 sm:w-52"
            style={{
              background:
                'radial-gradient(circle at 30% 25%, #38bdf8 0%, #0e7490 25%, #164e63 50%, #052e2b 75%, #020617 100%)',
              boxShadow:
                '0 0 65px rgba(16,185,129,0.25), inset -20px -15px 35px rgba(0,0,0,0.6)',
              animation: 'floatGlobe 6s ease-in-out infinite',
            }}
          >
            <span
              className="select-none text-[105px] drop-shadow-2xl sm:text-[140px]"
              role="img"
              aria-label="Dünya"
            >
              🌍
            </span>
          </div>

          <span className="absolute left-0 top-12 text-2xl">
            ✨
          </span>
          <span className="absolute bottom-10 right-0 text-xl">
            ✦
          </span>
        </div>

        <h1 className="max-w-4xl text-5xl font-black leading-[1.05] tracking-tight sm:text-7xl lg:text-8xl">
          DÜNYAYI
          <br />
          <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
            KEŞFET!
          </span>
        </h1>

        <p className="mt-7 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-xl">
          Dünyanın rastgele bir noktasına ışınlan.
          Sokakları incele, ipuçlarını yakala ve
          haritada nerede olduğunu tahmin et.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-400 sm:text-sm">
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
            🌐 Dünya çapında keşif
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
            🎯 Konum tahmini
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
            ♾️ Sınırsız oyun
          </span>
        </div>

        {/* Oyun kartları */}
        <div className="mt-14 grid w-full max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
          <Link
            href="/play"
            className="group relative overflow-hidden rounded-3xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/15 via-slate-900/90 to-slate-950 p-7 text-left shadow-2xl transition duration-300 hover:-translate-y-2 hover:border-emerald-400/70 hover:shadow-emerald-500/10 sm:p-9"
          >
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl transition group-hover:bg-emerald-400/20" />

            <div className="relative">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-4xl">
                🎯
              </div>

              <h2 className="text-2xl font-black sm:text-3xl">
                TEK OYUNCULU
              </h2>

              <p className="mt-3 min-h-[48px] text-sm leading-relaxed text-slate-400">
                Dünyayı tek başına keşfet.
                Tahminlerini geliştir ve kendi
                rekorunu kır.
              </p>

              <div className="mt-8 flex items-center justify-between rounded-2xl bg-emerald-400 px-6 py-4 font-black text-slate-950 transition group-hover:bg-emerald-300">
                <span>HEMEN OYNA</span>
                <span className="text-xl transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>
            </div>
          </Link>

          <Link
            href="/room"
            className="group relative overflow-hidden rounded-3xl border border-violet-400/25 bg-gradient-to-br from-violet-500/15 via-slate-900/90 to-slate-950 p-7 text-left shadow-2xl transition duration-300 hover:-translate-y-2 hover:border-violet-400/70 hover:shadow-violet-500/10 sm:p-9"
          >
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-violet-400/10 blur-3xl transition group-hover:bg-violet-400/20" />

            <div className="relative">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/10 text-4xl">
                ⚔️
              </div>

              <h2 className="text-2xl font-black sm:text-3xl">
                ÇOK OYUNCULU
              </h2>

              <p className="mt-3 min-h-[48px] text-sm leading-relaxed text-slate-400">
                Arkadaşlarınla aynı dünyaya
                ışınlan. En iyi tahmini yaparak
                rekabeti kazan.
              </p>

              <div className="mt-8 flex items-center justify-between rounded-2xl bg-violet-500 px-6 py-4 font-black text-white transition group-hover:bg-violet-400">
                <span>ODA KUR / KATIL</span>
                <span className="text-xl transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Nasıl oynanır */}
        <div className="mt-24 w-full max-w-5xl">
          <div className="mb-10 text-center">
            <span className="text-xs font-bold tracking-[0.3em] text-emerald-400">
              3 BASİT ADIM
            </span>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              NASIL OYNANIR?
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                number: '01',
                icon: '🌍',
                title: 'KEŞFET',
                description:
                  'Rastgele bir sokak görüntüsüne bırakıl ve çevreni incele.',
              },
              {
                number: '02',
                icon: '🔍',
                title: 'İPUÇLARINI BUL',
                description:
                  'Tabelalara, yollara, doğaya ve mimariye dikkat et.',
              },
              {
                number: '03',
                icon: '📍',
                title: 'TAHMİN ET',
                description:
                  'Haritada bir nokta seç ve gerçek konuma ne kadar yaklaştığını gör.',
              },
            ].map((step) => (
              <div
                key={step.number}
                className="relative rounded-2xl border border-white/10 bg-white/[0.035] p-7 text-left transition hover:border-emerald-400/30 hover:bg-white/[0.06]"
              >
                <span className="absolute right-6 top-5 text-4xl font-black text-white/5">
                  {step.number}
                </span>

                <div className="mb-5 text-4xl">
                  {step.icon}
                </div>

                <h3 className="text-lg font-black">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Alt çağrı */}
        <div className="mt-20 w-full max-w-4xl rounded-3xl border border-emerald-400/20 bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-violet-500/10 px-6 py-12 text-center sm:px-12">
          <h2 className="text-3xl font-black sm:text-4xl">
            MACERAYA HAZIR MISIN?
          </h2>

          <p className="mt-4 text-slate-400">
            Bir sonraki durağın dünyanın herhangi
            bir yeri olabilir.
          </p>

          <Link
            href="/play"
            className="mt-8 inline-flex items-center justify-center gap-3 rounded-2xl bg-emerald-400 px-10 py-4 text-lg font-black text-slate-950 transition hover:scale-105 hover:bg-emerald-300"
          >
            🌍 ŞİMDİ OYNA
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center text-xs text-slate-500 md:flex-row md:text-left">
          <div>
            <span className="font-black text-slate-300">
              HAGY GUESS
            </span>
            <p className="mt-1">
              Dünyayı keşfet. Konumunu tahmin et.
            </p>
          </div>

          <div className="max-w-xl leading-relaxed">
            Sokak görüntüleri ©{' '}
            <a
              href="https://www.mapillary.com"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-slate-300"
            >
              Mapillary
            </a>{' '}
            katkıcıları,{' '}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-slate-300"
            >
              CC BY-SA 4.0
            </a>
            . Harita verisi ©{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-slate-300"
            >
              OpenStreetMap
            </a>{' '}
            katkıcıları.
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes floatGlobe {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-14px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </main>
  );
}
