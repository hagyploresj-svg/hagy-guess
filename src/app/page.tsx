
import Link from "next/link";

const features = [
  {
    number: "01",
    icon: "◎",
    title: "Çevreni incele",
    description: "Sokakları, yapıları, tabelaları ve doğayı keşfet.",
  },
  {
    number: "02",
    icon: "⌖",
    title: "İpuçlarını birleştir",
    description: "Gördüklerinden yola çıkarak nerede olduğunu düşün.",
  },
  {
    number: "03",
    icon: "↗",
    title: "Konumu işaretle",
    description: "Haritada tahminini yap ve ne kadar yaklaştığını gör.",
  },
];

function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 ${
        large ? "h-20 w-20" : "h-11 w-11"
      }`}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className={large ? "h-14 w-14" : "h-8 w-8"}
        aria-hidden="true"
      >
        <circle
          cx="32"
          cy="32"
          r="24"
          stroke="#67E8F9"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <path
          d="M32 9L40 27L55 32L40 37L32 55L24 37L9 32L24 27L32 9Z"
          fill="#22D3EE"
          fillOpacity=".16"
          stroke="#67E8F9"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="32" r="5" fill="#A5F3FC" />
      </svg>
    </div>
  );
}

export default function Home() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#07111d] text-white">
      {/* Arka plan */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-48 top-24 h-[520px] w-[520px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute -right-48 top-1/3 h-[520px] w-[520px] rounded-full bg-teal-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-blue-500/10 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(#ffffff 1px,transparent 1px),linear-gradient(90deg,#ffffff 1px,transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      {/* Üst menü */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark />
          <div className="leading-tight">
            <span className="block text-lg font-black tracking-tight">
              HAGY<span className="text-cyan-300">GUESS</span>
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Explore the unknown
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/auth"
            className="rounded-xl border border-white/15 px-3 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/10 sm:px-5 sm:text-sm"
          >
            Giriş Yap
          </Link>
          <Link
            href="/auth"
            className="rounded-xl bg-cyan-300 px-3 py-2.5 text-xs font-black text-slate-950 transition hover:bg-cyan-200 sm:px-5 sm:text-sm"
          >
            Kayıt Ol
          </Link>
          <Link
            href="/profile"
            className="hidden rounded-xl border border-cyan-300/30 px-4 py-2.5 text-sm font-bold text-cyan-200 transition hover:bg-cyan-300/10 md:inline-flex"
          >
            Profilim
          </Link>
        </nav>
      </header>

      {/* Ana bölüm */}
      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:pb-28 lg:pt-24">
        <div className="max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold tracking-widest text-cyan-200">
            <span className="h-2 w-2 rounded-full bg-cyan-300" />
            SINIRSIZ DÜNYA KEŞFİ
          </div>

          <h1 className="text-5xl font-black leading-[1.07] tracking-tight sm:text-6xl lg:text-7xl">
            HER SOKAK
            <span className="mt-2 block text-cyan-300">
              BİR HİKÂYE.
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
            Bilmediğin bir yerde gözlerini aç. Çevrendeki
            ayrıntıları keşfet, ipuçlarını takip et ve
            dünyanın neresinde olduğunu tahmin et.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/play"
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-8 py-4 text-base font-black text-slate-950 transition hover:-translate-y-1 hover:bg-cyan-200"
            >
              Keşfe Başla <span aria-hidden="true">↗</span>
            </Link>

            <Link
              href="/room"
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-base font-bold transition hover:border-cyan-300/40 hover:bg-white/10"
            >
              Arkadaşlarla Oyna
            </Link>
          </div>

          <div className="mt-9 flex flex-wrap gap-2">
            {[
              "Ücretsiz",
              "Dünya çapında",
              "Tekli ve çoklu oyun",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300"
              >
                ✓ {item}
              </span>
            ))}
          </div>
        </div>

        {/* Keşif paneli */}
        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-5 rounded-[40px] bg-cyan-400/10 blur-3xl" />

          <div className="relative overflow-hidden rounded-[30px] border border-cyan-200/15 bg-[#0d1b2a] p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrandMark large />
                <div>
                  <div className="text-sm font-black tracking-widest text-cyan-200">
                    HAGY EXPLORER
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Keşif terminali
                  </div>
                </div>
              </div>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-bold text-cyan-200">
                ONLINE
              </span>
            </div>

            <div className="relative mt-7 flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#091624]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_65%)]" />

              <svg
                viewBox="0 0 320 320"
                className="relative h-full w-full max-w-[360px]"
                fill="none"
                aria-label="HAGY keşif rotası çizimi"
                role="img"
              >
                {[50, 95, 140].map((r) => (
                  <circle
                    key={r}
                    cx="160"
                    cy="160"
                    r={r}
                    stroke="#67E8F9"
                    strokeOpacity=".13"
                    strokeDasharray="4 8"
                  />
                ))}

                <path
                  d="M40 215C85 185 85 100 145 118S210 242 278 85"
                  stroke="#67E8F9"
                  strokeWidth="3"
                  strokeDasharray="7 8"
                  strokeLinecap="round"
                />

                <circle cx="40" cy="215" r="7" fill="#67E8F9" />
                <circle cx="145" cy="118" r="7" fill="#67E8F9" />
                <circle cx="278" cy="85" r="11" fill="#22D3EE" />
                <circle
                  cx="278"
                  cy="85"
                  r="22"
                  stroke="#22D3EE"
                  strokeOpacity=".4"
                />

                <path
                  d="M160 145L175 160L160 175L145 160L160 145Z"
                  fill="#A5F3FC"
                />
                <path
                  d="M160 130V190M130 160H190"
                  stroke="#A5F3FC"
                  strokeOpacity=".5"
                />
              </svg>

              <span className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-[10px] font-semibold tracking-widest text-cyan-200">
                UNKNOWN DESTINATION
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                ["01", "GÖZLE"],
                ["02", "KEŞFET"],
                ["03", "TAHMİN ET"],
              ].map(([number, title]) => (
                <div
                  key={number}
                  className="rounded-xl border border-white/10 bg-white/[0.035] px-2 py-3 text-center"
                >
                  <div className="text-lg font-black text-cyan-300">
                    {number}
                  </div>
                  <div className="mt-1 text-[10px] font-bold tracking-wide text-slate-400">
                    {title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Oyun modları */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
            OYUN MODLARI
          </p>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            Kendi yolunu seç.
          </h2>
          <p className="mt-3 text-slate-400">
            Tek başına keşfet veya arkadaşlarınla yarış.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Link
            href="/play"
            className="group rounded-[28px] border border-cyan-300/20 bg-gradient-to-br from-cyan-400/10 to-slate-900/70 p-7 transition hover:-translate-y-1 hover:border-cyan-300/60 sm:p-9"
          >
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-300/10 text-3xl text-cyan-200">
              ◎
            </div>
            <div className="text-xs font-bold tracking-widest text-cyan-300">
              SOLO EXPEDITION
            </div>
            <h3 className="mt-3 text-2xl font-black">
              Tek Başına Keşfet
            </h3>
            <p className="mt-3 max-w-md leading-7 text-slate-400">
              Yeni sokaklar, yeni ipuçları, yeni tahminler.
              Kendi keşif yolculuğuna çık.
            </p>
            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5 font-bold text-cyan-200">
              Oyuna Gir <span className="text-xl">↗</span>
            </div>
          </Link>

          <Link
            href="/room"
            className="group rounded-[28px] border border-blue-300/20 bg-gradient-to-br from-blue-400/10 to-slate-900/70 p-7 transition hover:-translate-y-1 hover:border-blue-300/60 sm:p-9"
          >
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-300/10 text-3xl text-blue-200">
              ◈
            </div>
            <div className="text-xs font-bold tracking-widest text-blue-300">
              CREW EXPEDITION
            </div>
            <h3 className="mt-3 text-2xl font-black">
              Ekibinle Keşfet
            </h3>
            <p className="mt-3 max-w-md leading-7 text-slate-400">
              Bir oda oluştur, arkadaşlarını davet et ve
              en iyi konum tahminini yap.
            </p>
            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5 font-bold text-blue-200">
              Oda Kur veya Katıl <span className="text-xl">↗</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Nasıl oynanır */}
      <section className="relative z-10 border-y border-white/10 bg-white/[0.025] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold tracking-[0.25em] text-cyan-300">
            KEŞİF REHBERİ
          </p>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            Üç adımda dünyayı keşfet.
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.number}
                className="rounded-2xl border border-white/10 bg-[#0d1b2a] p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-light text-cyan-300">
                    {feature.icon}
                  </span>
                  <span className="text-xs font-black text-slate-600">
                    {feature.number}
                  </span>
                </div>
                <h3 className="mt-8 text-xl font-black">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Alt bölüm */}
      <section className="relative z-10 mx-auto max-w-5xl px-5 py-20 text-center">
        <div className="rounded-[30px] border border-cyan-300/20 bg-cyan-300/[0.055] px-6 py-12 sm:px-12">
          <p className="text-xs font-bold tracking-[0.25em] text-cyan-300">
            HAGY GUESS
          </p>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">
            Sıradaki durak bilinmiyor.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-slate-400">
            Dünyanın herhangi bir noktasında yeni bir
            macera seni bekliyor.
          </p>
          <Link
            href="/play"
            className="mt-8 inline-flex min-h-14 items-center justify-center rounded-2xl bg-cyan-300 px-9 py-4 font-black text-slate-950 transition hover:bg-cyan-200"
          >
            Şimdi Keşfet ↗
          </Link>
        </div>
      </section>

      {/* Alt bilgi */}
      <footer className="relative z-10 border-t border-white/10 px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 text-xs text-slate-400 md:flex-row">
          <div>
            <div className="font-black text-white">
              HAGY <span className="text-cyan-300">GUESS</span>
            </div>
            <p className="mt-2">Bağımsız dünya keşif oyunu.</p>
          </div>

          <div className="max-w-xl leading-6">
            Sokak görüntüleri:{" "}
            <a
              href="https://www.mapillary.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              Mapillary
            </a>{" "}
            katkıcıları ·{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              CC BY-SA 4.0
            </a>
            . Harita verileri:{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              © OpenStreetMap contributors
            </a>
            .
          </div>
        </div>
      </footer>
    </main>
  );
}
