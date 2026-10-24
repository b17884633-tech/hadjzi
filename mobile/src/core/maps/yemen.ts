import type { LatLng } from '../../presentation/search/mapGeo';

/** Rough bounding box covering Yemen (mainland + Socotra buffer). */
export const YEMEN_BOUNDS = {
  minLat: 12.0,
  maxLat: 19.0,
  minLng: 41.5,
  maxLng: 54.5,
} as const;

export function isInYemen(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= YEMEN_BOUNDS.minLat &&
    lat <= YEMEN_BOUNDS.maxLat &&
    lng >= YEMEN_BOUNDS.minLng &&
    lng <= YEMEN_BOUNDS.maxLng
  );
}

export function openStreetMapUrl(coords: LatLng, zoom = 16): string {
  const { latitude: lat, longitude: lng } = coords;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}
