import { cheapestService } from '../../data/mappers/homeMappers';
import { Provider } from '../../domain/model/Provider';
import { Destination } from '../../domain/model/Search';
import {
  formatArabicDate,
  resolveBookingFlow,
  type BookingFlowKind,
} from '../booking/bookingFlow';

export type CategoryFilterValues = {
  minPrice?: number;
  maxPrice?: number;
  cityId?: number;
  cityName?: string;
  maxDistanceKm?: number;
  minRating?: number;
  minRooms?: number;
  minBeds?: number;
  minBathrooms?: number;
  minCapacity?: number;
  minPlayers?: number;
  /** Availability: start / single date (YYYY-MM-DD) */
  availableDate?: string;
  /** Stay / car range end date (YYYY-MM-DD) */
  availableEndDate?: string;
  /** Slot time HH:mm */
  availableTime?: string;
  /** Day period label e.g. فترة مسائية */
  availablePeriod?: string;
};

export type FilterFieldKey =
  | 'price'
  | 'place'
  | 'distance'
  | 'rating'
  | 'rooms'
  | 'beds'
  | 'bathrooms'
  | 'capacity'
  | 'players'
  | 'availability';

export type AvailabilityMode = 'none' | 'date' | 'date_time' | 'date_period' | 'date_range';

export type CategoryFilterProfile = {
  kind: BookingFlowKind;
  fields: FilterFieldKey[];
  availabilityMode: AvailabilityMode;
  periodOptions?: string[];
};

const RATING_OPTIONS = [3, 3.5, 4, 4.5] as const;
const DISTANCE_OPTIONS = [5, 10, 20, 50] as const;

export { RATING_OPTIONS, DISTANCE_OPTIONS };

/** Which filter controls to show for this marketplace category. */
export function resolveCategoryFilterProfile(
  categoryName?: string | null,
  bookingType?: string | null,
): CategoryFilterProfile {
  const flow = resolveBookingFlow(categoryName, bookingType);
  const base: FilterFieldKey[] = ['price', 'place', 'distance', 'rating', 'availability'];

  switch (flow.kind) {
    case 'STAY_RANGE':
      if (/سيارة|سيارات/i.test(categoryName ?? '')) {
        return {
          kind: flow.kind,
          fields: base,
          availabilityMode: 'date_range',
        };
      }
      return {
        kind: flow.kind,
        fields: [...base, 'rooms', 'beds', 'bathrooms', 'capacity'],
        availabilityMode: 'date_range',
      };
    case 'DAY_PERIOD':
      return {
        kind: flow.kind,
        fields: [...base, 'capacity'],
        availabilityMode: 'date_period',
        periodOptions: flow.periodOptions,
      };
    case 'SLOT_DURATION':
      if (/ملعب/i.test(categoryName ?? '')) {
        return {
          kind: flow.kind,
          fields: [...base, 'players'],
          availabilityMode: 'date_time',
        };
      }
      return {
        kind: flow.kind,
        fields: [...base, 'capacity'],
        availabilityMode: 'date_time',
      };
    case 'TRANSPORT':
      return {
        kind: flow.kind,
        fields: [...base, 'capacity'],
        availabilityMode: 'date_time',
      };
    case 'QUANTITY_DELIVERY':
      return {
        kind: flow.kind,
        fields: ['price', 'place', 'rating', 'availability'],
        availabilityMode: 'date_time',
      };
    case 'SLOT_TIME':
      return {
        kind: flow.kind,
        fields: base,
        availabilityMode: 'date_time',
      };
    default:
      return {
        kind: flow.kind,
        fields: base,
        availabilityMode: 'date',
      };
  }
}

export function emptyCategoryFilters(): CategoryFilterValues {
  return {};
}

export function countActiveFilters(filters: CategoryFilterValues): number {
  let n = 0;
  if (filters.minPrice != null) n += 1;
  if (filters.maxPrice != null) n += 1;
  if (filters.cityId != null) n += 1;
  if (filters.maxDistanceKm != null) n += 1;
  if (filters.minRating != null) n += 1;
  if (filters.minRooms != null) n += 1;
  if (filters.minBeds != null) n += 1;
  if (filters.minBathrooms != null) n += 1;
  if (filters.minCapacity != null) n += 1;
  if (filters.minPlayers != null) n += 1;
  if (filters.availableDate) n += 1;
  if (filters.availableEndDate) n += 1;
  if (filters.availableTime) n += 1;
  if (filters.availablePeriod) n += 1;
  return n;
}

export function activeFilterChips(
  filters: CategoryFilterValues,
): Array<{ key: string; label: string }> {
  const chips: Array<{ key: string; label: string }> = [];
  if (filters.minPrice != null || filters.maxPrice != null) {
    const min = filters.minPrice != null ? formatPrice(filters.minPrice) : '…';
    const max = filters.maxPrice != null ? formatPrice(filters.maxPrice) : '…';
    chips.push({ key: 'price', label: `السعر ${min} – ${max}` });
  }
  if (filters.cityName) {
    chips.push({ key: 'city', label: filters.cityName });
  }
  if (filters.maxDistanceKm != null) {
    chips.push({ key: 'distance', label: `حتى ${filters.maxDistanceKm} كم` });
  }
  if (filters.minRating != null) {
    chips.push({ key: 'rating', label: `${filters.minRating}+ ★` });
  }
  if (filters.minRooms != null) {
    chips.push({ key: 'rooms', label: `${filters.minRooms}+ غرف` });
  }
  if (filters.minBeds != null) {
    chips.push({ key: 'beds', label: `${filters.minBeds}+ أسرة` });
  }
  if (filters.minBathrooms != null) {
    chips.push({ key: 'bathrooms', label: `${filters.minBathrooms}+ حمام` });
  }
  if (filters.minCapacity != null) {
    chips.push({ key: 'capacity', label: `${filters.minCapacity}+ أشخاص` });
  }
  if (filters.minPlayers != null) {
    chips.push({ key: 'players', label: `${filters.minPlayers}+ لاعب` });
  }
  if (filters.availableDate && filters.availableEndDate) {
    chips.push({
      key: 'availability',
      label: `${formatArabicDate(filters.availableDate)} ← ${formatArabicDate(filters.availableEndDate)}`,
    });
  } else if (filters.availableDate) {
    let label = formatArabicDate(filters.availableDate);
    if (filters.availableTime) label += ` ${filters.availableTime}`;
    if (filters.availablePeriod) label += ` · ${filters.availablePeriod}`;
    chips.push({ key: 'availability', label });
  }
  return chips;
}

function formatPrice(n: number) {
  return n.toLocaleString('en-US');
}

function numAttr(attrs: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const v = attrs[key];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return undefined;
}

function providerPrice(provider: Provider): number | undefined {
  const service = cheapestService(provider);
  return service?.priceFrom ?? service?.basePrice ?? undefined;
}

function providerAttrs(provider: Provider): Record<string, unknown> {
  const service = cheapestService(provider);
  return (service?.attributes ?? {}) as Record<string, unknown>;
}

/** Client-side match for non-availability fields. */
export function providerMatchesFilters(
  provider: Provider,
  filters: CategoryFilterValues,
): boolean {
  const price = providerPrice(provider);
  if (filters.minPrice != null && (price == null || price < filters.minPrice)) {
    return false;
  }
  if (filters.maxPrice != null && (price == null || price > filters.maxPrice)) {
    return false;
  }

  if (filters.cityId != null) {
    const id = provider.city?.id;
    if (id != null && id !== filters.cityId) return false;
    if (id == null && filters.cityName) {
      const name = provider.cityName ?? provider.city?.name ?? '';
      if (name && name !== filters.cityName) return false;
    }
  }

  const attrs = providerAttrs(provider);
  const rating = provider.rating;
  if (filters.minRating != null && (rating == null || rating < filters.minRating)) {
    return false;
  }

  if (filters.minRooms != null) {
    const rooms = numAttr(attrs, 'rooms', 'bedrooms');
    if (rooms == null || rooms < filters.minRooms) return false;
  }
  if (filters.minBeds != null) {
    const beds = numAttr(attrs, 'beds', 'bedCount', 'sleeps');
    if (beds == null || beds < filters.minBeds) return false;
  }
  if (filters.minBathrooms != null) {
    const baths = numAttr(attrs, 'bathrooms', 'baths');
    if (baths == null || baths < filters.minBathrooms) return false;
  }
  if (filters.minCapacity != null) {
    const capacity = numAttr(attrs, 'capacity', 'guests', 'seats');
    if (capacity == null || capacity < filters.minCapacity) return false;
  }
  if (filters.minPlayers != null) {
    const players = numAttr(attrs, 'players', 'capacity');
    if (players == null || players < filters.minPlayers) return false;
  }

  if (filters.maxDistanceKm != null) {
    const distance = numAttr(attrs, 'distanceKm', 'distance', 'distance_km');
    if (distance != null && distance > filters.maxDistanceKm) return false;
  }

  return true;
}

export function filterProviders(
  providers: Provider[],
  filters: CategoryFilterValues,
): Provider[] {
  if (countActiveFilters(filters) === 0) return providers;
  return providers.filter((p) => providerMatchesFilters(p, filters));
}

export function cityFromDestinations(
  cities: Destination[],
  cityId?: number,
): Destination | undefined {
  return cities.find((c) => c.id === cityId);
}
