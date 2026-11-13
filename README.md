# HAGY GUESS

GeoGuessr mantığında, ücretsiz ve sınırsız oynanabilen coğrafya tahmin oyunu.
Next.js (App Router) · TypeScript · Tailwind · Mapillary Graph API · Leaflet/OSM · Supabase · Vercel

## Kurulum

```bash
npm install
cp .env.example .env.local     # değerleri doldur
npm run dev
```

`.env.local` içeriği:

| Değişken | Nerede kullanılır |
|---|---|
| `MAPILLARY_TOKEN` | **Sadece sunucu** (API route'ları). Tarayıcıya/GitHub'a gitmez. |
| `ROUND_SECRET` | Tek kişilik tur token'ı imzası (`openssl rand -base64 32`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sadece sunucu |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tarayıcı (yalnızca Realtime dinleme) |

Çok oyunculu için: Supabase projesi aç → SQL Editor'de `supabase/schema.sql` dosyasını çalıştır.
Tek kişilik mod Supabase olmadan da çalışır (Supabase env'leri boş kalabilir).

## Vercel
Repo'yu bağla, yukarıdaki 5 değişkeni Project → Settings → Environment Variables'a ekle. Başka ayar gerekmez.

## Mimari

- **Token gizliliği:** Mapillary çağrıları yalnızca `src/lib/mapillary.ts` içinde (`server-only`), `Authorization: OAuth …` başlığıyla yapılır.
  Bu yüzden resmi MapillaryJS görüntüleyicisi (tarayıcıda token ister) yerine,
  Mapillary'nin `thumb_2048_url` CDN görüntüleri **Photo Sphere Viewer** ile gösterilir.
- **Hile önleme:** İstemciye koordinat gitmez. Tek kişilikte konum imzalı opak token içindedir;
  çok oyunculuda `room_rounds` tablosunu anon rol okuyamaz (RLS). İleri/geri hareket de koordinat döndürmez.
- **Rastgele konum:** `locations.ts` içindeki ~130 dünya şehri etrafında rastgele sapma → küçük bbox → `is_pano=true` arama →
  rastgele aday → CDN URL'si `HEAD` ile doğrulanır. Görüntü yoksa otomatik yeni konum (10 deneme; ilk 7'si yalnızca 360°).
  Başarısız bölgelerin seçilme ağırlığı düşer.
- **360° dürüstlüğü:** Yalnızca `is_pano=true` olanlar küresel görüntüleyicide açılır; diğerleri "Düz fotoğraf (360° değil)" etiketiyle gösterilir.
- **Hareket:** `/image_ids?sequence_id=` ile sekans alınır, `MOVE_STEP` kare ileri/geri gidilir.
- **Limit koruması:** eşzamanlı istek sınırı (4), zaman aşımı, 5xx'te üstel geri çekilme, 429'da `Retry-After`'a saygı + genel bekleme,
  kısa süreli önbellek, IP başına istek sınırı (`ratelimit.ts`).
- **Çok oyunculu:** Tüm yazmalar API route'larından (service role). İstemciler `rooms`/`players` değişimlerini Supabase Realtime ile dinler
  ve durumu `/api/rooms/[code]/state`'ten çeker (+5 sn yedek yoklama). Süre dolunca `advance` ile tur kapanır.
- **Puan:** `5000·e^(−km/1492.7)`.

## Lisans / atıf
- Mapillary görüntüleri **CC BY-SA 4.0**: oyun içinde katkıcı adı, Mapillary bağlantısı ve lisans bağlantısı her zaman görünür (`Attribution.tsx`).
- Harita: © OpenStreetMap katkıcıları. Üretimde yoğun trafik için `tile.openstreetmap.org` yerine bir döşeme sağlayıcısı kullan
  ([OSM tile politikası](https://operations.osmfoundation.org/policies/tiles/)).
- Mapillary API [kullanım koşullarını](https://www.mapillary.com/developer/api-documentation) kontrol et.

## Bilinen sınırlar / yapılacaklar
- Rate limit bellek içi (instance başına); ölçeklenince Upstash/Vercel KV'ye taşı.
- Tek kişilik skor sunucuda tutulmaz (liderlik tablosu yok).
- Oyuncu ayrılırsa tur süre dolana kadar bekler; eski odaları temizlemek için pg_cron (schema.sql'de yorum satırı).
- Sekans sırası `image_ids` yanıt sırasına güvenir; gerekirse `captured_at` ile sıralayın.
