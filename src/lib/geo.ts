import type { LatLng } from './types';

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** GeoGuessr tarzı: 5000 * e^(-d/1492.7) (dünya haritası) */
export function scoreFor(km: number): number {
  return km < 0.05 ? 5000 : Math.round(5000 * Math.exp(-km / 1492.7));
}

export function randomJitter(c: LatLng, radiusDeg: number): LatLng {
  const lat = Math.max(-80, Math.min(80, c.lat + (Math.random() * 2 - 1) * radiusDeg));
  let lng = c.lng + ((Math.random() * 2 - 1) * radiusDeg) / Math.max(0.2, Math.cos(rad(c.lat)));
  if (lng > 180) lng -= 360;
  if (lng < -180) lng += 360;
  return { lat, lng };
}

export function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString('tr-TR', { maximumFractionDigits: km < 100 ? 1 : 0 })} km`;
}
