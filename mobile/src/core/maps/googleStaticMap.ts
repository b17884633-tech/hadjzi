import Constants from 'expo-constants';
import type { LatLng } from '../../presentation/search/mapGeo';
import { theme } from '../ui/theme';

function mapsExtra(): {
  googleMapsStaticApiKey?: string | null;
  googleMapsApiKey?: string | null;
} {
  return (
    (Constants.expoConfig?.extra as {
      googleMapsStaticApiKey?: string | null;
      googleMapsApiKey?: string | null;
    }) ?? {}
  );
}

export function getGoogleStaticMapsKey(): string {
  const extra = mapsExtra();
  return (
    extra.googleMapsStaticApiKey?.trim() ||
    extra.googleMapsApiKey?.trim() ||
    ''
  );
}

/** Brand navy for Static Maps marker color (0xRRGGBB, no #). */
const MARKER_COLOR = theme.colors.primary.replace('#', '0x');

/**
 * Light roadmap Static Maps URL — matches the in-app Google look
 * (roads, labels, white land) without a native MapView.
 */
export function googleStaticMapUri(opts: {
  center: LatLng;
  zoom?: number;
  width: number;
  height: number;
  markers?: LatLng[];
}): string | null {
  const key = getGoogleStaticMapsKey();
  if (!key) return null;

  const w = Math.min(640, Math.max(80, Math.round(opts.width)));
  const h = Math.min(640, Math.max(80, Math.round(opts.height)));
  const zoom = opts.zoom ?? 15;
  const { latitude: lat, longitude: lng } = opts.center;

  const markerList = (opts.markers?.length ? opts.markers : [opts.center])
    .slice(0, 40)
    .map(
      (m) =>
        `&markers=color:${MARKER_COLOR}%7Csize:mid%7C${m.latitude},${m.longitude}`,
    )
    .join('');

  return (
    `https://maps.googleapis.com/maps/api/staticmap?` +
    `center=${lat},${lng}&zoom=${zoom}&size=${w}x${h}&scale=2` +
    `&maptype=roadmap&language=ar&region=YE` +
    markerList +
    `&key=${key}`
  );
}
