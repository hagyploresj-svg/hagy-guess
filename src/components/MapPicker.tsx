
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

const pin = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div class="hagy-pin" style="background:${color}"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 26],
  });

// Türkçe ülke etiketleri
const COUNTRIES: Array<{
  name: string;
  lat: number;
  lng: number;
}> = [
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
  { name: 'Gürcistan', lat: 42.2, lng: 43.5 },
  { name: 'Ermenistan', lat: 40.2, lng: 44.9 },
  { name: 'Azerbaycan', lat: 40.3, lng: 47.5 },
  { name: 'İran', lat: 32.4, lng: 53.7 },
  { name: 'Irak', lat: 33.2, lng: 43.7 },
  { name: 'Suriye', lat: 35, lng: 38.5 },
  { name: 'İsrail', lat: 31.5, lng: 35 },
  { name: 'Suudi Arabistan', lat: 24, lng: 45 },
  { name: 'Birleşik Arap Emirlikleri', lat: 24, lng: 54 },
  { name: 'Mısır', lat: 26.5, lng: 30 },
  { name: 'Libya', lat: 27, lng: 17 },
  { name: 'Cezayir', lat: 28, lng: 3 },
  { name: 'Fas', lat: 32, lng: -6 },
  { name: 'Tunus', lat: 34, lng: 9 },
  { name: 'Nijerya', lat: 9, lng: 8 },
  { name: 'Güney Afrika', lat: -29, lng: 25 },
  { name: 'Etiyopya', lat: 9, lng: 40 },
  { name: 'Kenya', lat: 0.5, lng: 37.8 },
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
  { name: 'Avustralya', lat: -25, lng: 134 },
  { name: 'Yeni Zelanda', lat: -41, lng: 173 },
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
];

// Harita üstünde Türkçe ülke isimleri
function TurkishLabels() {
  const map = useMap();

  const labels = useMemo(
    () =>
      COUNTRIES.map((country) => ({
        ...country,
        icon: L.divIcon({
          className: '',
          html: `<div style="
            font-family:Arial,sans-serif;
            font-size:11px;
            font-weight:700;
            color:#172033;
            text-shadow:
              1px 1px 2px white,
              -1px -1px 2px white,
              0 0 4px white;
            white-space:nowrap;
            text-align:center;
            pointer-events:none;
            transform:translateX(-50%);
          ">${country.name}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
      })),
    []
  );

  useEffect(() => {
    const layer = L.layerGroup();

    for (const country of labels) {
      L.marker([country.lat, country.lng], {
        icon: country.icon,
        interactive: false,
        keyboard: false,
      }).addTo(layer);
    }

    layer.addTo(map);

    return () => {
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

function Fit({
  points,
}: {
  points: LatLng[];
}) {
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
          (p) =>
            [p.lat, p.lng] as [number, number]
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
          icon={pin('#3b82f6')}
        />
      )}

      {actual && (
        <Marker
          position={[actual.lat, actual.lng]}
          icon={pin('#10b981')}
        />
      )}

      {actual && guess && (
        <Polyline
          positions={[
            [guess.lat, guess.lng],
            [actual.lat, actual.lng],
          ]}
          pathOptions={{
            color: '#3b82f6',
            dashArray: '6 8',
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
              [
                other.pos.lat,
                other.pos.lng,
              ],
              [
                actual.lat,
                actual.lng,
              ],
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
  );
}
