import { isInYemen } from './yemen';

export type ParsedMapsLocation = {
  latitude: number;
  longitude: number;
  sourceUrl: string;
};

function clampCoord(n: number, min: number, max: number): number | null {
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

function asLatLng(a: number, b: number): { latitude: number; longitude: number } | null {
  // Prefer (lat, lng) when both look valid; swap if clearly reversed.
  const latFirst = clampCoord(a, -90, 90);
  const lngFirst = clampCoord(b, -180, 180);
  if (latFirst != null && lngFirst != null) {
    return { latitude: latFirst, longitude: lngFirst };
  }
  const latSwap = clampCoord(b, -90, 90);
  const lngSwap = clampCoord(a, -180, 180);
  if (latSwap != null && lngSwap != null) {
    return { latitude: latSwap, longitude: lngSwap };
  }
  return null;
}

/**
 * Extract coordinates from Google Maps / OpenStreetMap / Apple / geo: URLs
 * (and raw "lat,lng" paste). Short links without coords cannot be resolved offline.
 */
export function parseMapsUrl(raw: string): ParsedMapsLocation | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Raw "15.3694, 44.191" or "15.3694 44.191"
  const bare = /^(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/.exec(
    trimmed,
  );
  if (bare) {
    const pair = asLatLng(Number(bare[1]), Number(bare[2]));
    if (pair) return { ...pair, sourceUrl: trimmed };
  }

  let url: URL;
  try {
    url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const href = url.href;
  const search = url.searchParams;

  // geo:lat,lng or geo:lat,lng?q=
  if (url.protocol === 'geo:') {
    const geo = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(url.pathname);
    if (geo) {
      const pair = asLatLng(Number(geo[1]), Number(geo[2]));
      if (pair) return { ...pair, sourceUrl: trimmed };
    }
  }

  // OSM: #map=zoom/lat/lng
  const osmHash = /#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/.exec(href);
  if (osmHash) {
    const pair = asLatLng(Number(osmHash[1]), Number(osmHash[2]));
    if (pair) return { ...pair, sourceUrl: trimmed };
  }

  // OSM query: mlat / mlon
  const mlat = search.get('mlat');
  const mlon = search.get('mlon');
  if (mlat && mlon) {
    const pair = asLatLng(Number(mlat), Number(mlon));
    if (pair) return { ...pair, sourceUrl: trimmed };
  }

  // Apple / generic: ll=lat,lng
  const ll = search.get('ll') ?? search.get('center');
  if (ll) {
    const parts = ll.split(',');
    if (parts.length >= 2) {
      const pair = asLatLng(Number(parts[0]), Number(parts[1]));
      if (pair) return { ...pair, sourceUrl: trimmed };
    }
  }

  // Google: q=lat,lng or query=lat,lng
  for (const key of ['q', 'query', 'destination', 'origin']) {
    const v = search.get(key);
    if (!v) continue;
    const m = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(v);
    if (m) {
      const pair = asLatLng(Number(m[1]), Number(m[2]));
      if (pair) return { ...pair, sourceUrl: trimmed };
    }
  }

  // Google place / search: @lat,lng,zoom
  const at = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(href);
  if (at) {
    const pair = asLatLng(Number(at[1]), Number(at[2]));
    if (pair) return { ...pair, sourceUrl: trimmed };
  }

  // Google data blob: !3dLAT!4dLNG
  const d3 = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(href);
  if (d3) {
    const pair = asLatLng(Number(d3[1]), Number(d3[2]));
    if (pair) return { ...pair, sourceUrl: trimmed };
  }

  return null;
}

/** Parse URL and require the point to fall inside Yemen. */
export function parseYemenMapsUrl(raw: string): ParsedMapsLocation | null {
  const parsed = parseMapsUrl(raw);
  if (!parsed) return null;
  if (!isInYemen(parsed.latitude, parsed.longitude)) return null;
  return parsed;
}
