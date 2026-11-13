
'use client';

import { useEffect } from 'react';
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
