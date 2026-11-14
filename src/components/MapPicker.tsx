
'use client';

import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';

import L from 'leaflet';
import type { LatLng } from '@/lib/types';

export interface OtherPin {
  pos: LatLng;
  color: string;
  label: string;
}

interface Props {
  guess?: LatLng | null;
  onPick?: (p: LatLng) => void;
  actual?: LatLng | null;
  others?: OtherPin[];
}

interface PlaceLabel {
  name: string;
  lat: number;
  lng: number;
  minZoom?: number;
  maxZoom?: number;
  type?: 'country' | 'region' | 'city';
}

const pin = (color: string) => {
  const safeColor = /^#[0-9a-fA-F]{3,8}$/.test(color)
    ? color
    : '#67e8f9';

  return L.divIcon({
    className: 'hagy-explorer-pin',
    html: `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);background:${safeColor};border:3px solid #ffffff;box-shadow:0 3px 12px rgba(7,17,29,.55)"><span style="display:block;width:7px;height:7px;border-radius:50%;background:#07111d;transform:rotate(45deg)"></span></div>`,
    iconSize: [28, 32],
    iconAnchor: [14, 30],
  });
};

// Türkçe ülke, bölge ve şehir isimleri
const PLACES: PlaceLabel[] = [
  // Avrupa
  { name: 'Türkiye', lat: 39, lng: 35 },
  { name: 'Rusya', lat: 61, lng: 95 },
  { name: 'Almanya', lat: 51, lng: 10 },
  { name: 'Fransa', lat: 46.6, lng: 2.2 },
  { name: 'İspanya', lat: 40.4, lng: -3.7 },
  { name: 'İtalya', lat: 42.8, lng: 12.5 },
  { name: 'Yunanistan', lat: 39, lng: 22 },
  { name: 'Bulgaristan', lat: 42.7, lng: 25.5 },
  { name: 'Ukrayna', lat: 49, lng: 32 },
  { name: 'Polonya', lat: 52, lng: 19 },
  { name: 'Romanya', lat: 45.8, lng: 25 },
  { name: 'Macaristan', lat: 47.2, lng: 19.2 },
  { name: 'Avusturya', lat: 47.6, lng: 14.2 },
  { name: 'İsviçre', lat: 46.8, lng: 8.2 },
  { name: 'Hollanda', lat: 52.2, lng: 5.3 },
  { name: 'Belçika', lat: 50.6, lng: 4.7 },
  { name: 'Birleşik Krallık', lat: 54, lng: -2.5 },
  { name: 'İrlanda', lat: 53.3, lng: -8 },
  { name: 'Norveç', lat: 62, lng: 9 },
  { name: 'İsveç', lat: 62, lng: 15 },
  { name: 'Finlandiya', lat: 64, lng: 26 },
  { name: 'Danimarka', lat: 56, lng: 10 },
  { name: 'Portekiz', lat: 39.5, lng: -8 },
  { name: 'Çekya', lat: 49.8, lng: 15.5 },
  { name: 'Slovakya', lat: 48.7, lng: 19.5 },
  { name: 'Sırbistan', lat: 44, lng: 21 },
  { name: 'Hırvatistan', lat: 45.1, lng: 15.2 },
  { name: 'Bosna-Hersek', lat: 44.1, lng: 17.7 },
  { name: 'Arnavutluk', lat: 41.1, lng: 20 },
  { name: 'Kuzey Makedonya', lat: 41.6, lng: 21.7 },

  // Asya ve Orta Doğu
  { name: 'Gürcistan', lat: 42.2, lng: 43.5 },
  { name: 'Ermenistan', lat: 40.2, lng: 44.9 },
  { name: 'Azerbaycan', lat: 40.3, lng: 47.5 },
  { name: 'İran', lat: 32.4, lng: 53.7 },
  { name: 'Irak', lat: 33.2, lng: 43.7 },
  { name: 'Suriye', lat: 35, lng: 38.5 },
  { name: 'İsrail', lat: 31.5, lng: 35 },
  { name: 'Suudi Arabistan', lat: 24, lng: 45 },
  { name: 'Birleşik Arap Emirlikleri', lat: 24, lng: 54 },
  { name: 'Çin', lat: 35, lng: 104 },
  { name: 'Japonya', lat: 37, lng: 138 },
  { name: 'Güney Kore', lat: 36, lng: 128 },
  { name: 'Kuzey Kore', lat: 40.2, lng: 127 },
  { name: 'Hindistan', lat: 22.5, lng: 79 },
  { name: 'Pakistan', lat: 30, lng: 69 },
  { name: 'Afganistan', lat: 33.5, lng: 66 },
  { name: 'Kazakistan', lat: 48, lng: 67 },
  { name: 'Özbekistan', lat: 41.5, lng: 64 },
  { name: 'Moğolistan', lat: 46.8, lng: 103 },
  { name: 'Tayland', lat: 15, lng: 101 },
  { name: 'Vietnam', lat: 16, lng: 107 },
  { name: 'Endonezya', lat: -2, lng: 118 },
  { name: 'Malezya', lat: 4, lng: 102 },
  { name: 'Filipinler', lat: 12.5, lng: 122 },

  // Afrika
  { name: 'Mısır', lat: 26.5, lng: 30 },
  { name: 'Libya', lat: 27, lng: 17 },
  { name: 'Cezayir', lat: 28, lng: 3 },
  { name: 'Fas', lat: 32, lng: -6 },
  { name: 'Tunus', lat: 34, lng: 9 },
  { name: 'Nijerya', lat: 9, lng: 8 },
  { name: 'Güney Afrika', lat: -29, lng: 25 },
  { name: 'Etiyopya', lat: 9, lng: 40 },
  { name: 'Kenya', lat: 0.5, lng: 37.8 },

  // Okyanusya
  { name: 'Avustralya', lat: -25, lng: 134 },
  { name: 'Yeni Zelanda', lat: -41, lng: 173 },

  // Amerika
  { name: 'Amerika Birleşik Devletleri', lat: 39, lng: -99 },
  { name: 'Kanada', lat: 57, lng: -106 },
  { name: 'Meksika', lat: 24, lng: -102 },
  { name: 'Brezilya', lat: -10, lng: -52 },
  { name: 'Arjantin', lat: -35, lng: -64 },
  { name: 'Şili', lat: -33, lng: -71 },
  { name: 'Peru', lat: -10, lng: -75 },
  { name: 'Kolombiya', lat: 4, lng: -73 },
  { name: 'Venezuela', lat: 7, lng: -66 },
  { name: 'Bolivya', lat: -17, lng: -65 },
  { name: 'Uruguay', lat: -33, lng: -56 },

  // Çin - şehirler
  { name: 'Pekin', lat: 39.9042, lng: 116.4074, type: 'city', minZoom: 5 },
  { name: 'Şanghay', lat: 31.2304, lng: 121.4737, type: 'city', minZoom: 5 },
  { name: 'Guangzhou', lat: 23.1291, lng: 113.2644, type: 'city', minZoom: 6 },
  { name: 'Şenzen', lat: 22.5431, lng: 114.0579, type: 'city', minZoom: 7 },
  { name: 'Çengdu', lat: 30.5728, lng: 104.0668, type: 'city', minZoom: 6 },
  { name: 'Çongçing', lat: 29.563, lng: 106.5516, type: 'city', minZoom: 6 },
  { name: 'Vuhan', lat: 30.5928, lng: 114.3055, type: 'city', minZoom: 6 },
  { name: 'Nankin', lat: 32.0603, lng: 118.7969, type: 'city', minZoom: 7 },
  { name: 'Hangzhou', lat: 30.2741, lng: 120.1551, type: 'city', minZoom: 7 },
  { name: 'Şian', lat: 34.3416, lng: 108.9398, type: 'city', minZoom: 6 },
  { name: 'Harbin', lat: 45.8038, lng: 126.5349, type: 'city', minZoom: 6 },
  { name: 'Urumçi', lat: 43.8256, lng: 87.6168, type: 'city', minZoom: 6 },
  { name: 'Lhasa', lat: 29.652, lng: 91.1721, type: 'city', minZoom: 6 },
  { name: 'Kunming', lat: 25.0389, lng: 102.7183, type: 'city', minZoom: 7 },
  { name: 'Tientsin', lat: 39.3434, lng: 117.3616, type: 'city', minZoom: 7 },
  { name: 'Çingdao', lat: 36.0671, lng: 120.3826, type: 'city', minZoom: 7 },

  // Çin - bölgeler
  { name: 'Sincan Uygur Özerk Bölgesi', lat: 41.5, lng: 85, type: 'region', minZoom: 4, maxZoom: 7 },
  { name: 'Tibet Özerk Bölgesi', lat: 31.7, lng: 88.8, type: 'region', minZoom: 4, maxZoom: 7 },
  { name: 'İç Moğolistan', lat: 43.5, lng: 112, type: 'region', minZoom: 4, maxZoom: 7 },
  { name: 'Mançurya', lat: 46, lng: 124, type: 'region', minZoom: 4, maxZoom: 7 },
  { name: 'Sıçuan', lat: 30, lng: 102.5, type: 'region', minZoom: 5, maxZoom: 8 },
  { name: 'Yünnan', lat: 25, lng: 101.5, type: 'region', minZoom: 5, maxZoom: 8 },
  { name: 'Guangdong', lat: 23.4, lng: 113.4, type: 'region', minZoom: 5, maxZoom: 8 },
  { name: 'Hunan', lat: 27.5, lng: 111.7, type: 'region', minZoom: 5, maxZoom: 8 },
  { name: 'Hubey', lat: 31, lng: 112.3, type: 'region', minZoom: 5, maxZoom: 8 },
  { name: 'Şantung', lat: 36.4, lng: 118.4, type: 'region', minZoom: 5, maxZoom: 8 },

  // Japonya - şehirler
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, type: 'city', minZoom: 5 },
  { name: 'Osaka', lat: 34.6937, lng: 135.5023, type: 'city', minZoom: 6 },
  { name: 'Kyoto', lat: 35.0116, lng: 135.7681, type: 'city', minZoom: 7 },
  { name: 'Nagoya', lat: 35.1815, lng: 136.9066, type: 'city', minZoom: 7 },
  { name: 'Sapporo', lat: 43.0618, lng: 141.3545, type: 'city', minZoom: 6 },
  { name: 'Fukuoka', lat: 33.5904, lng: 130.4017, type: 'city', minZoom: 6 },

  // Rusya - şehirler
  { name: 'Moskova', lat: 55.7558, lng: 37.6173, type: 'city', minZoom: 4 },
  { name: 'St. Petersburg', lat: 59.9343, lng: 30.3351, type: 'city', minZoom: 5 },
  { name: 'Kazan', lat: 55.7961, lng: 49.1064, type: 'city', minZoom: 6 },
  { name: 'Novosibirsk', lat: 55.0084, lng: 82.9357, type: 'city', minZoom: 5 },
  { name: 'Yekaterinburg', lat: 56.8389, lng: 60.6057, type: 'city', minZoom: 5 },
  { name: 'Vladivostok', lat: 43.1155, lng: 131.8855, type: 'city', minZoom: 6 },
  { name: 'Soçi', lat: 43.5855, lng: 39.7231, type: 'city', minZoom: 7 },

  // Diğer önemli şehirler
  { name: 'İstanbul', lat: 41.0082, lng: 28.9784, type: 'city', minZoom: 5 },
  { name: 'Ankara', lat: 39.9334, lng: 32.8597, type: 'city', minZoom: 5 },
  { name: 'İzmir', lat: 38.4237, lng: 27.1428, type: 'city', minZoom: 6 },
  { name: 'Antalya', lat: 36.8969, lng: 30.7133, type: 'city', minZoom: 6 },
  { name: 'Londra', lat: 51.5072, lng: -0.1276, type: 'city', minZoom: 5 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522, type: 'city', minZoom: 5 },
  { name: 'Berlin', lat: 52.52, lng: 13.405, type: 'city', minZoom: 5 },
  { name: 'Roma', lat: 41.9028, lng: 12.4964, type: 'city', minZoom: 5 },
  { name: 'Atina', lat: 37.9838, lng: 23.7275, type: 'city', minZoom: 6 },
  { name: 'Kahire', lat: 30.0444, lng: 31.2357, type: 'city', minZoom: 5 },
  { name: 'Yeni Delhi', lat: 28.6139, lng: 77.209, type: 'city', minZoom: 5 },
  { name: 'Seul', lat: 37.5665, lng: 126.978, type: 'city', minZoom: 5 },
  { name: 'New York', lat: 40.7128, lng: -74.006, type: 'city', minZoom: 5 },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, type: 'city', minZoom: 5 },
];

function labelIcon(place: PlaceLabel) {
  const isCountry = !place.type || place.type === 'country';
  const isRegion = place.type === 'region';

  const fontSize = isCountry ? 12 : isRegion ? 11 : 10;
  const fontWeight = isCountry ? 800 : isRegion ? 700 : 600;
  const color = isCountry ? '#0f2535' : isRegion ? '#244357' : '#12667a';

  return L.divIcon({
    className: 'hagy-turkish-label',
    html: `<div style="
      font-family:Arial,sans-serif;
      font-size:${fontSize}px;
      font-weight:${fontWeight};
      color:${color};
      text-shadow:
        1px 1px 2px white,
        -1px -1px 2px white,
        0 0 4px white;
      white-space:nowrap;
      text-align:center;
      pointer-events:none;
      transform:translateX(-50%);
    ">${place.name}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function TurkishLabels() {
  const map = useMap();

  const labels = useMemo(
    () =>
      PLACES.map((place) => ({
        ...place,
        icon: labelIcon(place),
      })),
    []
  );

  useEffect(() => {
    const layer = L.layerGroup();

    const update = () => {
      layer.clearLayers();

      const zoom = map.getZoom();
      const bounds = map.getBounds().pad(0.2);

      for (const place of labels) {
        const isCountry = !place.type || place.type === 'country';

        if (isCountry && zoom >= 6) continue;
        if (zoom < (place.minZoom ?? 0)) continue;
        if (zoom > (place.maxZoom ?? 19)) continue;
        if (!bounds.contains([place.lat, place.lng])) continue;

        L.marker([place.lat, place.lng], {
          icon: place.icon,
          interactive: false,
          keyboard: false,
        }).addTo(layer);
      }
    };

    layer.addTo(map);
    update();

    map.on('zoomend moveend', update);

    return () => {
      map.off('zoomend moveend', update);
      map.removeLayer(layer);
    };
  }, [map, labels]);

  return null;
}

function Clicks({
  onPick,
}: {
  onPick?: (p: LatLng) => void;
}) {
  useMapEvents({
    click(event) {
      if (!onPick) return;

      const point = event.latlng.wrap();

      onPick({
        lat: point.lat,
        lng: point.lng,
      });
    },
  });

  return null;
}

function SizeWatcher() {
  const map = useMap();

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });

    observer.observe(map.getContainer());

    return () => observer.disconnect();
  }, [map]);

  return null;
}

function Fit({ points }: { points: LatLng[] }) {
  const map = useMap();

  const key = points
    .map((p) => `${p.lat},${p.lng}`)
    .join('|');

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.flyTo(
        [points[0].lat, points[0].lng],
        6,
        { duration: 0.6 }
      );
    } else {
      const bounds = L.latLngBounds(
        points.map(
          (p) => [p.lat, p.lng] as [number, number]
        )
      );

      map.flyToBounds(bounds, {
        padding: [70, 70],
        maxZoom: 9,
        duration: 0.7,
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);

  return null;
}

export default function MapPicker({
  guess,
  onPick,
  actual,
  others = [],
}: Props) {
  const points: LatLng[] = [
    ...(guess ? [guess] : []),
    ...(actual ? [actual] : []),
    ...others.map((o) => o.pos),
  ];

  return (
    <div className="hagy-explorer-map relative h-full w-full overflow-hidden bg-[#dceaf0]">
      <MapContainer
        center={[25, 10]}
        zoom={2}
        minZoom={2}
        maxZoom={19}
        zoomControl={false}
        zoomAnimation
        fadeAnimation
        markerZoomAnimation
        scrollWheelZoom
        doubleClickZoom
        worldCopyJump
        maxBounds={[
          [-85, -180],
          [85, 180],
        ]}
        maxBoundsViscosity={1}
        className={`h-full w-full ${
          onPick ? 'picking' : ''
        }`}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
          maxNativeZoom={19}
          detectRetina
          keepBuffer={4}
          updateWhenIdle
        />

        <TurkishLabels />

        <ZoomControl position="topright" />

        <Clicks onPick={onPick} />

        <SizeWatcher />

        {actual && <Fit points={points} />}

        {guess && (
          <Marker
            position={[guess.lat, guess.lng]}
            icon={pin('#22d3ee')}
          />
        )}

        {actual && (
          <Marker
            position={[actual.lat, actual.lng]}
            icon={pin('#34d399')}
          />
        )}

        {actual && guess && (
          <Polyline
            positions={[
              [guess.lat, guess.lng],
              [actual.lat, actual.lng],
            ]}
            pathOptions={{
              color: '#0891b2',
              dashArray: '7 8',
              weight: 3,
            }}
          />
        )}

        {actual &&
          others.map((other, index) => (
            <Marker
              key={`marker-${index}`}
              position={[
                other.pos.lat,
                other.pos.lng,
              ]}
              icon={pin(other.color)}
              title={other.label}
            />
          ))}

        {actual &&
          others.map((other, index) => (
            <Polyline
              key={`line-${index}`}
              positions={[
                [other.pos.lat, other.pos.lng],
                [actual.lat, actual.lng],
              ]}
              pathOptions={{
                color: other.color,
                dashArray: '6 8',
                weight: 2,
                opacity: 0.8,
              }}
            />
          ))}
      </MapContainer>

      <style jsx global>{`
        .hagy-explorer-map .leaflet-control-zoom {
          border: 1px solid rgba(34, 211, 238, .35) !important;
          border-radius: 13px !important;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(7, 17, 29, .25) !important;
        }
        .hagy-explorer-map .leaflet-control-zoom a {
          width: 34px !important;
          height: 34px !important;
          line-height: 34px !important;
          background: #071522 !important;
          color: #a5f3fc !important;
          border-bottom-color: rgba(255, 255, 255, .12) !important;
        }
        .hagy-explorer-map .leaflet-control-zoom a:hover {
          background: #123047 !important;
          color: white !important;
        }
        .hagy-explorer-map .leaflet-control-attribution {
          background: rgba(255, 255, 255, .9) !important;
          font-size: 10px !important;
        }
        .hagy-explorer-map .leaflet-container {
          font-family: Arial, sans-serif;
        }
      `}</style>
    </div>
  );
}
