import { FacilityMapCard } from './FacilityMapCard';
import { DEFAULT_CENTER } from '../../../presentation/search/mapGeo';

type Props = {
  latitude?: number | null;
  longitude?: number | null;
  label?: string;
  height?: number;
};

/** Light Google Maps preview (Static or native) for facility address cards. */
export function MapFallback({
  latitude,
  longitude,
  label = 'فتح الموقع على الخريطة',
  height = 180,
}: Props) {
  const lat =
    latitude != null && Number.isFinite(latitude)
      ? latitude
      : DEFAULT_CENTER.latitude;
  const lng =
    longitude != null && Number.isFinite(longitude)
      ? longitude
      : DEFAULT_CENTER.longitude;

  return (
    <FacilityMapCard
      latitude={lat}
      longitude={lng}
      height={height}
      label={label}
    />
  );
}
