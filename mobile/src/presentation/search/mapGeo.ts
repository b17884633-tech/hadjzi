import { Provider } from '../../domain/model/Provider';

export type LatLng = { latitude: number; longitude: number };

/** Approx city centers in Yemen for map framing when listings lack coords. */
export const CITY_CENTERS: Record<string, LatLng> = {
  صنعاء: { latitude: 15.3694, longitude: 44.191 },
  عدن: { latitude: 12.7855, longitude: 45.0187 },
  تعز: { latitude: 13.5779, longitude: 44.0178 },
  الحديدة: { latitude: 14.7979, longitude: 42.9545 },
  إب: { latitude: 13.9667, longitude: 44.1833 },
  المكلا: { latitude: 14.5425, longitude: 49.1256 },
  ذمار: { latitude: 14.55, longitude: 44.4 },
  حجة: { latitude: 15.694, longitude: 43.601 },
};

export const DEFAULT_CENTER: LatLng = CITY_CENTERS['صنعاء'];

export function centerForCityName(name?: string | null): LatLng {
  if (!name) return DEFAULT_CENTER;
  return CITY_CENTERS[name] ?? DEFAULT_CENTER;
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Prefer real coords; otherwise scatter stably around the city center. */
export function coordsForProvider(
  provider: Provider,
  cityCenter: LatLng = DEFAULT_CENTER,
): LatLng {
  if (
    provider.latitude != null &&
    provider.longitude != null &&
    Number.isFinite(provider.latitude) &&
    Number.isFinite(provider.longitude)
  ) {
    return { latitude: provider.latitude, longitude: provider.longitude };
  }
  const h = hashId(provider.id);
  const dLat = ((h % 120) - 60) * 0.0009;
  const dLng = (((h >> 8) % 120) - 60) * 0.0009;
  return {
    latitude: cityCenter.latitude + dLat,
    longitude: cityCenter.longitude + dLng,
  };
}
