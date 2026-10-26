/**
 * Optional OSM PNG tile fallback (dense / labeled — prefer native Google Maps).
 * Kept for OsmLocationMap and any explicit streetTiles=true call sites.
 */
export function osmTileUrl(zoom: number, x: number, y: number): string {
  const n = 2 ** zoom;
  const wrappedX = ((x % n) + n) % n;
  const clampedY = Math.min(Math.max(y, 0), n - 1);
  const subdomain = ['a', 'b', 'c'][(wrappedX + clampedY) % 3];
  return `https://${subdomain}.tile.openstreetmap.fr/osmfr/${zoom}/${wrappedX}/${clampedY}.png`;
}

/** UrlTile template for react-native-maps (standard OSM {z}/{x}/{y}). */
export const STREET_TILE_URL =
  'https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png';

export function latLngToTile(
  latitude: number,
  longitude: number,
  zoom: number,
): { x: number; y: number } {
  const n = 2 ** zoom;
  const x = Math.floor(((longitude + 180) / 360) * n);
  const latRad = (latitude * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y };
}
