/** Web Mercator helpers for OpenStreetMap XYZ tiles. */

export function latLngToTile(
  lat: number,
  lng: number,
  zoom: number,
): { x: number; y: number } {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y };
}

/** CartoCDN — reliable in mobile Image; OSM.org often blocks non-browser UAs. */
export function osmTileUrl(zoom: number, x: number, y: number): string {
  const n = 2 ** zoom;
  const wrappedX = ((x % n) + n) % n;
  const clampedY = Math.min(Math.max(y, 0), n - 1);
  const subdomain = ['a', 'b', 'c', 'd'][(wrappedX + clampedY) % 4];
  return `https://${subdomain}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${wrappedX}/${clampedY}.png`;
}

/** Project lat/lng to pixel offset within a centered tile grid. */
export function projectToPixels(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  zoom: number,
  tileSize: number,
  gridRadius: number,
  viewW: number,
  viewH: number,
): { left: number; top: number } {
  const worldSize = tileSize * 2 ** zoom;

  const lngToX = (lon: number) => ((lon + 180) / 360) * worldSize;
  const latToY = (la: number) => {
    const s = Math.sin((la * Math.PI) / 180);
    return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * worldSize;
  };

  const cx = lngToX(centerLng);
  const cy = latToY(centerLat);
  const px = lngToX(lng);
  const py = latToY(lat);

  const gridPx = (gridRadius * 2 + 1) * tileSize;
  const originX = cx - gridPx / 2;
  const originY = cy - gridPx / 2;

  const left = px - originX - (gridPx - viewW) / 2;
  const top = py - originY - (gridPx - viewH) / 2;
  return { left, top };
}
