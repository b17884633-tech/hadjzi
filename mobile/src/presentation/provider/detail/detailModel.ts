import { Ionicons } from '@expo/vector-icons';
import {
  parsePricePeriods,
  type PricePeriod,
} from '../../../core/common/pricePeriods';
import { Provider, ServiceItem } from '../../../domain/model/Provider';
import { colors } from '../../../core/ui/theme/colors';
import {
  isApparelCategory,
  isArtistCategory,
  isCarCategory,
  isChaletCategory,
  isHallCategory,
  isHealthCategory,
  isHotelCategory,
  isPhotoCategory,
  isGymCategory,
  isPoolCategory,
  isSalonCategory,
  isSportCategory,
  isSupplyCategory,
  isTairamanCategory,
  isTransportCategory,
  resolveFacilityKind,
  SERVICE_FACILITY_DEFAULTS,
} from '../categoryKinds';
import { membershipLabel, type MembershipUnit } from '../../booking/bookingFlow';

/** Detail palette — Hadjzi logo navy + gold. */
export const DETAIL = {
  navy: colors.primary,
  navyLight: colors.primaryLight,
  navyDeep: colors.heroNavy,
  gold: colors.accent,
  goldDark: colors.accentDark,
  text: colors.text,
  muted: colors.textSecondary,
  line: '#E8EDF5',
  border: colors.border,
  chipBg: '#FFFFFF',
  pageBg: '#FFFFFF',
  star: colors.accent,
  starEmpty: '#D1D5DB',
  ratingCardStart: '#F8EFD8',
  ratingCardEnd: '#EBD9A8',
  /** @deprecated use navy — kept so older refs compile during edit */
  teal: colors.primary,
  tealDark: colors.primaryLight,
  tealDeep: colors.heroNavy,
  diamond: colors.primary,
  accent: colors.accent,
} as const;

export type FeatureChip = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Optional detail photos — tapping the chip opens a gallery. */
  images?: string[];
};

export type IconRow = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Optional photos for this space/amenity row. */
  images?: string[];
};

export type PricePackage = {
  id: string;
  title: string;
  /** Short package detail (e.g. photographer packages). */
  detail?: string;
  price: number;
  capacityLabel?: string;
  timeLabel?: string;
  period?: 'MORNING' | 'EVENING' | 'PER_NIGHT';
  fromTime?: string;
  toTime?: string;
  /** Tairaman / sports-style hourly package — price is per hour. */
  pricingMode?: 'FIXED' | 'HOURLY' | 'DAILY';
  /** Display unit for catalog rentals (cars / transport / apparel). */
  priceUnit?: 'day' | 'hour' | 'night';
  /** Gym membership length unit. */
  membershipUnit?: MembershipUnit;
  /** Gym membership duration (days or months). */
  membershipDuration?: number;
  /** Barber/salon package: included items. */
  includes?: string[];
};

export type DetailModel = {
  categoryLabel: string;
  aboutTitle: string;
  ctaLabel: string;
  isHotel: boolean;
  isSport: boolean;
  show360: boolean;
  tourUrl?: string;
  showFeatureChips: boolean;
  showSpaces: boolean;
  showAmenities: boolean;
  /** Past works gallery for photographers. */
  showPortfolio: boolean;
  showAddress: boolean;
  showRatingBanner: boolean;
  showDeposit: boolean;
  showInsurance: boolean;
  showTerms: boolean;
  showPackages: boolean;
  /** Ticket-style hourly bands for playgrounds / padel. */
  showPricePeriods: boolean;
  pricePeriods: PricePeriod[];
  featureChips: FeatureChip[];
  spaces: IconRow[];
  amenities: IconRow[];
  /** Cloudinary URLs of photographer past works. */
  portfolio: string[];
  packages: PricePackage[];
  /** Max persons from chalet facility (shown on every package card). */
  maxGuestsLabel?: string;
  depositAmount?: number;
  depositNote: string;
  insuranceAmount?: number;
  insuranceNote: string;
  insuranceMeta?: string;
  terms: string[];
  policyBullets: string[];
  aboutText: string;
};

function num(attrs: Record<string, unknown>, key: string): number | undefined {
  const v = attrs[key];
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

function formatArabicClock(raw: string): string {
  const [hStr, mStr] = String(raw).slice(0, 5).split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h)) return String(raw).slice(0, 5);
  const period = h < 12 ? 'صباحاً' : 'مساءً';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const mins = Number.isFinite(m) && m > 0 ? `:${String(m).padStart(2, '0')}` : '';
  return `${hour12}${mins} ${period}`;
}

function strList(attrs: Record<string, unknown>, key: string): string[] {
  const v = attrs[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function imageUrls(attrs: Record<string, unknown>, key: string): string[] {
  return strList(attrs, key).filter((u) => /^https?:\/\//i.test(u));
}

function spaceImageMap(attrs: Record<string, unknown>): Record<string, string[]> {
  const v = attrs.spaceImages;
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, string[]> = {};
  for (const [label, urls] of Object.entries(v as Record<string, unknown>)) {
    if (!label.trim() || !Array.isArray(urls)) continue;
    const cleaned = urls.filter(
      (u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u),
    );
    if (cleaned.length) out[label.trim()] = cleaned;
  }
  return out;
}

function isHotel(cat: string): boolean {
  return isHotelCategory(cat);
}
function isHall(cat: string): boolean {
  return isHallCategory(cat);
}
function isTairaman(cat: string): boolean {
  return isTairamanCategory(cat);
}
function isChalet(cat: string): boolean {
  return isChaletCategory(cat);
}
function isStay(cat: string): boolean {
  return (
    isHotel(cat) ||
    isHall(cat) ||
    isChalet(cat) ||
    /شقق|إقام|استراح/i.test(cat)
  );
}
function isHealth(cat: string): boolean {
  return isHealthCategory(cat);
}
function isSport(cat: string): boolean {
  return isSportCategory(cat);
}
function isPool(cat: string): boolean {
  return isPoolCategory(cat);
}

function isGym(cat: string): boolean {
  return isGymCategory(cat);
}

function readMembershipUnit(raw: unknown): MembershipUnit | undefined {
  if (raw === 'DAYS' || raw === 'MONTHS') return raw;
  return undefined;
}
function isSalon(cat: string): boolean {
  return isSalonCategory(cat);
}
function isCar(cat: string): boolean {
  return isCarCategory(cat);
}
function isTransport(cat: string): boolean {
  return isTransportCategory(cat);
}
function isApparel(cat: string): boolean {
  return isApparelCategory(cat);
}
function isArtist(cat: string): boolean {
  return isArtistCategory(cat);
}
function isPhoto(cat: string): boolean {
  return isPhotoCategory(cat);
}
function isEventSupply(cat: string): boolean {
  return isSupplyCategory(cat);
}

function iconForSpaceLabel(label: string): keyof typeof Ionicons.glyphMap {
  if (/موقف|سيارات|parking/i.test(label)) return 'car-outline';
  if (/أطفال|ألعاب|kids|play/i.test(label)) return 'happy-outline';
  if (/مسبح|pool/i.test(label)) return 'water-outline';
  if (/سينما|cinema/i.test(label)) return 'film-outline';
  if (/ساونا|sauna/i.test(label)) return 'thermometer-outline';
  if (/استيم|steam/i.test(label)) return 'flame-outline';
  return 'ellipse-outline';
}

function iconForAmenityLabel(label: string): keyof typeof Ionicons.glyphMap {
  if (/كفتير|مطعم|مطبخ|restaurant|cafe/i.test(label)) return 'restaurant-outline';
  if (/تكييف|air|ac/i.test(label)) return 'snow-outline';
  if (/صوت|sound|speaker/i.test(label)) return 'volume-high-outline';
  if (/واي|wifi|إنترنت|internet/i.test(label)) return 'wifi-outline';
  if (/شاش|tv/i.test(label)) return 'tv-outline';
  if (/موقف|سيارات/i.test(label)) return 'car-outline';
  if (/شواء|bbq/i.test(label)) return 'flame-outline';
  return 'checkmark-circle-outline';
}

export function buildDetailModel(
  provider: Provider,
  service?: ServiceItem | null,
  categoryHints: Array<string | null | undefined> = [],
): DetailModel {
  const cat = provider.categoryName ?? provider.category?.name ?? 'خدمة';
  const facilityAttrs = (provider.attributes ?? {}) as Record<string, unknown>;
  const serviceAttrs = (service?.attributes ?? {}) as Record<string, unknown>;
  /** Facility-level attrs win for spaces/amenities/terms; service fills room specifics. */
  const attrs = { ...serviceAttrs, ...facilityAttrs };
  const price = service?.priceFrom ?? service?.basePrice ?? 0;
  const depositPct =
    typeof service?.depositPercentage === 'number' && Number.isFinite(service.depositPercentage)
      ? service.depositPercentage
      : 30;
  const depositAmount = price ? Math.round((price * depositPct) / 100) : undefined;

  const kind = resolveFacilityKind(
    cat,
    provider.category?.name,
    ...categoryHints,
  );
  const hotel = kind === 'hotel' || isHotel(cat);
  const hall = kind === 'hall' || isHall(cat);
  const chalet =
    kind === 'chalet' || kind === 'tairaman' || isChalet(cat);
  const stay = isStay(cat) || hotel || hall || chalet;
  const health = kind === 'health' || isHealth(cat);
  const sport = kind === 'sport' || isSport(cat);
  const pool = kind === 'pool' || isPool(cat);
  const gym = kind === 'gym' || isGym(cat);
  const salon = kind === 'salon' || isSalon(cat);
  const car = kind === 'car' || isCar(cat);
  const transport = kind === 'transport' || isTransport(cat);
  const apparel = kind === 'apparel' || isApparel(cat);
  const catalogRental = car || transport || apparel;
  const artist = kind === 'artist' || isArtist(cat);
  const photo = kind === 'photo' || isPhoto(cat);
  const supply = kind === 'supply' || isEventSupply(cat);
  const serviceFacility =
    health ||
    salon ||
    pool ||
    gym ||
    catalogRental ||
    artist ||
    photo ||
    supply;

  const bathrooms =
    num(serviceAttrs, 'bathrooms') ??
    num(facilityAttrs, 'bathrooms') ??
    (chalet ? 4 : undefined);
  const bedrooms =
    num(serviceAttrs, 'rooms') ??
    num(serviceAttrs, 'bedrooms') ??
    num(facilityAttrs, 'rooms') ??
    num(facilityAttrs, 'bedrooms') ??
    (chalet ? 2 : undefined);
  const majlis =
    num(serviceAttrs, 'majlis') ??
    num(facilityAttrs, 'majlis') ??
    (chalet ? 1 : undefined);
  /** Chalet max persons — facility creation form is the source of truth. */
  const facilityMaxGuests =
    num(facilityAttrs, 'maxGuests') ??
    num(facilityAttrs, 'capacity') ??
    num(facilityAttrs, 'guests');
  const maxGuests =
    facilityMaxGuests ??
    num(serviceAttrs, 'maxGuests') ??
    num(serviceAttrs, 'capacity') ??
    num(serviceAttrs, 'guests') ??
    (provider.services ?? []).reduce<number | undefined>((found, s) => {
      if (found != null) return found;
      const sa = (s.attributes ?? {}) as Record<string, unknown>;
      return (
        num(sa, 'maxGuests') ?? num(sa, 'capacity') ?? num(sa, 'guests')
      );
    }, undefined);
  const capacity =
    num(serviceAttrs, 'capacity') ??
    num(serviceAttrs, 'guests') ??
    num(serviceAttrs, 'players');
  const maxPlayers =
    num(facilityAttrs, 'maxPlayers') ??
    num(facilityAttrs, 'players') ??
    num(facilityAttrs, 'capacity') ??
    capacity;
  const fieldLength =
    num(facilityAttrs, 'fieldLength') ??
    num(facilityAttrs, 'fieldHeight') ??
    num(facilityAttrs, 'length');
  const fieldWidth =
    num(facilityAttrs, 'fieldWidth') ?? num(facilityAttrs, 'width');
  const slotMinutes =
    num(serviceAttrs, 'slotMinutes') ?? num(serviceAttrs, 'durationMinutes');

  const bathroomImages = imageUrls(facilityAttrs, 'bathroomImages');
  const bedroomImages = imageUrls(facilityAttrs, 'bedroomImages');
  const majlisImages = imageUrls(facilityAttrs, 'majlisImages');
  const spaceImagesByLabel = spaceImageMap(facilityAttrs);

  const featureChips: FeatureChip[] = [];
  // طيرمانات: capacity is per package, not on the facility header chips.
  if (chalet && !isTairaman(cat) && maxGuests != null) {
    featureChips.push({
      key: 'guests',
      icon: 'people-outline',
      label: `${maxGuests} أشخاص أو أقل`,
    });
  }
  if (chalet && bathrooms != null) {
    featureChips.push({
      key: 'bath',
      icon: 'water-outline',
      label: `${bathrooms} حمامات`,
      images: bathroomImages.length ? bathroomImages : undefined,
    });
  }
  if (chalet && bedrooms != null) {
    featureChips.push({
      key: 'bed',
      icon: 'bed-outline',
      label: `${bedrooms} غرف نوم`,
      images: bedroomImages.length ? bedroomImages : undefined,
    });
  }
  if (chalet && majlis != null) {
    featureChips.push({
      key: 'majlis',
      icon: 'home-outline',
      label: `${majlis} مجالس`,
      images: majlisImages.length ? majlisImages : undefined,
    });
  }
  if (health && slotMinutes != null) {
    featureChips.push({ key: 'slot', icon: 'time-outline', label: `${slotMinutes} دقيقة` });
  }
  if (sport && maxPlayers != null) {
    const side = Math.floor(maxPlayers / 2);
    featureChips.push({
      key: 'players',
      icon: 'people-outline',
      label: `${maxPlayers} لاعب كحد أقصى (${side} × ${side})`,
    });
  }
  if (pool && maxPlayers != null) {
    featureChips.push({
      key: 'swimmers',
      icon: 'people-outline',
      label: `${maxPlayers} مرتاد كحد أقصى`,
    });
  }
  if (sport && fieldLength != null && fieldWidth != null) {
    featureChips.push({
      key: 'fieldSize',
      icon: 'resize-outline',
      label: `${fieldLength} × ${fieldWidth} متر مربع`,
    });
  }
  if (car || transport) {
    const seats = num(serviceAttrs, 'seats') ?? num(facilityAttrs, 'seats');
    const year = num(serviceAttrs, 'year') ?? num(facilityAttrs, 'year');
    const transmission =
      typeof serviceAttrs.transmission === 'string'
        ? serviceAttrs.transmission
        : typeof facilityAttrs.transmission === 'string'
          ? facilityAttrs.transmission
          : undefined;
    if (seats != null) {
      featureChips.push({
        key: 'seats',
        icon: transport ? 'bus-outline' : 'car-outline',
        label: `${seats} مقاعد`,
      });
    }
    if (year != null) {
      featureChips.push({
        key: 'year',
        icon: 'calendar-outline',
        label: `موديل ${year}`,
      });
    }
    if (transmission) {
      featureChips.push({
        key: 'gear',
        icon: 'settings-outline',
        label: transmission === 'AUTO' ? 'أوتوماتيك' : 'عادي',
      });
    }
  }
  if (apparel) {
    const size =
      typeof serviceAttrs.size === 'string' ? serviceAttrs.size.trim() : '';
    const color =
      typeof serviceAttrs.color === 'string' ? serviceAttrs.color.trim() : '';
    if (size) {
      featureChips.push({
        key: 'size',
        icon: 'resize-outline',
        label: `مقاس ${size}`,
      });
    }
    if (color) {
      featureChips.push({
        key: 'color',
        icon: 'color-palette-outline',
        label: color,
      });
    }
    featureChips.push({
      key: 'daily',
      icon: 'calendar-outline',
      label: 'تأجير يومي',
    });
  }
  if (supply) {
    featureChips.push({ key: 'qty', icon: 'cube-outline', label: 'حجز بالكمية' });
  }
  if (salon) {
    featureChips.push({ key: 'salon', icon: 'cut-outline', label: 'موعد مسبق' });
  }
  if (artist) {
    featureChips.push({ key: 'artist', icon: 'musical-notes-outline', label: 'حجز يوم المناسبة' });
  }
  if (photo) {
    featureChips.push({ key: 'photo', icon: 'camera-outline', label: 'جلسة تصوير' });
  }

  const spacesFromAttr = catalogRental
    ? []
    : strList(attrs, 'spaces');
  // Catalog products: amenities live on the selected product (service).
  const amenitiesFromAttr = catalogRental
    ? strList(serviceAttrs, 'amenities')
    : strList(attrs, 'amenities');
  const includes = strList(attrs, 'includes');
  const customTerms = strList(attrs, 'terms');
  const customPolicy = strList(attrs, 'policyBullets');
  const customDepositNote =
    typeof attrs.depositNote === 'string' ? attrs.depositNote.trim() : '';
  /** Portfolio is facility-level only (not merged from packages). */
  const portfolio = strList(facilityAttrs, 'portfolio').filter((u) =>
    /^https?:\/\//i.test(u),
  );

  const serviceDefaults =
    gym
      ? SERVICE_FACILITY_DEFAULTS.gym
      : pool
        ? SERVICE_FACILITY_DEFAULTS.pool
        : health
          ? SERVICE_FACILITY_DEFAULTS.health
          : salon
            ? SERVICE_FACILITY_DEFAULTS.salon
            : car
              ? SERVICE_FACILITY_DEFAULTS.car
              : transport
                ? SERVICE_FACILITY_DEFAULTS.transport
                : apparel
                ? SERVICE_FACILITY_DEFAULTS.apparel
                : artist
                  ? SERVICE_FACILITY_DEFAULTS.artist
                  : photo
                    ? SERVICE_FACILITY_DEFAULTS.photo
                    : supply
                      ? SERVICE_FACILITY_DEFAULTS.supply
                      : null;

  const defaultSpaces: IconRow[] = hotel
    ? [
        { key: 'parking', icon: 'car-outline', label: 'موقف سيارات' },
        { key: 'kids', icon: 'happy-outline', label: 'ألعاب أطفال' },
      ]
    : chalet
      ? [
          { key: 'steam', icon: 'flame-outline', label: 'استيم' },
          { key: 'sauna', icon: 'thermometer-outline', label: 'ساونا' },
          { key: 'cinema', icon: 'film-outline', label: 'سينما' },
          { key: 'pool', icon: 'water-outline', label: 'مسبح كبار' },
        ]
      : hall
        ? []
        : sport
          ? [
              { key: 'lights', icon: 'bulb-outline', label: 'إضاءة' },
              { key: 'balls', icon: 'football-outline', label: 'كرات' },
            ]
          : serviceDefaults
            ? serviceDefaults.spaces.map((label, i) => ({
                key: `ds${i}`,
                icon: iconForSpaceLabel(label),
                label,
              }))
            : [];

  const defaultAmenities: IconRow[] = hotel
    ? [
        { key: 'cafe', icon: 'restaurant-outline', label: 'كفتيريا' },
        { key: 'ac', icon: 'snow-outline', label: 'تكييف' },
        { key: 'sound', icon: 'volume-high-outline', label: 'صوتيات' },
        { key: 'wifi', icon: 'wifi-outline', label: 'واي فاي' },
      ]
    : chalet
      ? [
          { key: 'kitchen', icon: 'restaurant-outline', label: 'مطبخ' },
          { key: 'parking', icon: 'car-outline', label: 'موقف سيارات خارجي' },
          { key: 'heat', icon: 'sunny-outline', label: 'فلترة ونظام تدفئة' },
          { key: 'screens', icon: 'tv-outline', label: 'شاشات' },
        ]
      : serviceDefaults
        ? serviceDefaults.amenities.map((label, i) => ({
            key: `da${i}`,
            icon: iconForAmenityLabel(label),
            label,
          }))
        : [];

  if (attrs.pool === true && !defaultSpaces.some((s) => s.key === 'pool')) {
    defaultSpaces.unshift({ key: 'pool', icon: 'water-outline', label: 'مسبح خاص' });
  }
  if (attrs.bbq === true) {
    defaultAmenities.push({ key: 'bbq', icon: 'flame-outline', label: 'شواء' });
  }
  for (const inc of includes) {
    if (inc === 'sound' && !defaultAmenities.some((a) => a.key === 'sound')) {
      defaultAmenities.push({ key: 'sound', icon: 'volume-high-outline', label: 'صوتيات' });
    }
    if (inc === 'lighting') {
      defaultAmenities.push({ key: 'light', icon: 'bulb-outline', label: 'إضاءة متطورة' });
    }
  }

  const spaces: IconRow[] =
    spacesFromAttr.length > 0
      ? spacesFromAttr.map((label, i) => ({
          key: `s${i}`,
          icon: iconForSpaceLabel(label),
          label,
          images: spaceImagesByLabel[label],
        }))
      : defaultSpaces.map((row) => ({
          ...row,
          images: spaceImagesByLabel[row.label],
        }));

  const amenities: IconRow[] =
    amenitiesFromAttr.length > 0
      ? amenitiesFromAttr.map((label, i) => ({
          key: `a${i}`,
          icon: iconForAmenityLabel(label),
          label,
        }))
      : defaultAmenities;

  const activeServices = (provider.services ?? []).filter(
    (s) => !s.status || s.status === 'ACTIVE',
  );

  /** Prefer periods from the focused service; else first service that defines them. */
  let pricePeriods: PricePeriod[] = parsePricePeriods(serviceAttrs.pricePeriods);
  if (!pricePeriods.length) {
    for (const s of activeServices) {
      const parsed = parsePricePeriods(
        ((s.attributes ?? {}) as Record<string, unknown>).pricePeriods,
      );
      if (parsed.length) {
        pricePeriods = parsed;
        break;
      }
    }
  }

  const packages: PricePackage[] = activeServices.map((s) => {
    const a = (s.attributes ?? {}) as Record<string, unknown>;
    const guests =
      num(a, 'maxGuests') ??
      num(a, 'capacity') ??
      num(a, 'guests') ??
      maxGuests;
    const period = a.period;
    const packagePeriods = parsePricePeriods(a.pricePeriods);
    const isHourlyPackage =
      a.pricingMode === 'HOURLY' ||
      ((sport || pool || isTairaman(cat)) &&
        packagePeriods.length > 0 &&
        a.pricingMode !== 'FIXED');
    let timeLabel: string | undefined;
    const from =
      typeof a.fromTime === 'string'
        ? String(a.fromTime).slice(0, 5)
        : packagePeriods[0]?.fromTime;
    const to =
      typeof a.toTime === 'string'
        ? String(a.toTime).slice(0, 5)
        : packagePeriods[0]?.toTime;
    // Card title matches mock: period name for day packages
    const displayTitle =
      period === 'MORNING'
        ? 'الفترة الصباحية'
        : period === 'EVENING'
          ? 'الفترة المسائية'
          : period === 'PER_NIGHT'
            ? s.name?.trim() || 'حجز بالليلة'
            : s.name?.trim() || 'باقة';
    if (isHourlyPackage) {
      timeLabel =
        from && to
          ? `بالساعة · متاح من ${formatArabicClock(from)} إلى ${formatArabicClock(to)}`
          : 'حجز بالساعة — اختر وقت الدخول والمغادرة';
    } else if (period === 'PER_NIGHT') {
      timeLabel =
        from && to
          ? `من ${formatArabicClock(from)} إلى ${formatArabicClock(to)}`
          : 'السعر لليلة — حسب تاريخ الوصول والمغادرة';
    } else if (period === 'MORNING' || period === 'EVENING') {
      timeLabel =
        from && to
          ? `من ${formatArabicClock(from)} إلى ${formatArabicClock(to)}`
          : period === 'MORNING'
            ? 'من 9 صباحاً إلى 9 مساءً'
            : 'من 10 مساءً إلى 7 صباحاً';
    } else if (from && to) {
      timeLabel = `من ${formatArabicClock(from)} إلى ${formatArabicClock(to)}`;
    } else if (num(a, 'hours') != null) {
      timeLabel = `مدة ${num(a, 'hours')} ساعات`;
    } else if (!salon && num(a, 'slotMinutes') != null) {
      timeLabel = `${num(a, 'slotMinutes')} دقيقة`;
    }

    const seats = num(a, 'seats');
    const duration =
      num(a, 'slotMinutes') ?? num(a, 'durationMinutes');
    const packageIncludes = strList(a, 'includes');
    /** Package lists includes (barber/salon) — hide duration on the card. */
    const hasPackageIncludes = packageIncludes.length > 0;
    const hideDurationOnCard = salon || hasPackageIncludes;
    /** Photographers: name + detail + price only — no duration/capacity on the card. */
    const size =
      typeof a.size === 'string' && a.size.trim() ? a.size.trim() : undefined;
    const color =
      typeof a.color === 'string' && a.color.trim() ? a.color.trim() : undefined;
    const apparelLabel = [size ? `مقاس ${size}` : null, color]
      .filter(Boolean)
      .join(' · ');

    const capacityLabel = photo || hideDurationOnCard
      ? undefined
      : apparel
        ? apparelLabel || undefined
        : car || transport
          ? seats != null
            ? `${seats} مقاعد`
            : undefined
          : health
            ? duration != null
              ? `${duration} دقيقة`
              : undefined
            : artist
              ? undefined
              : guests != null
                ? `${guests} أشخاص أو أقل`
                : duration != null
                  ? `${duration} دقيقة`
                  : undefined;
    const isPoolDayPackage =
      pool && !isHourlyPackage && a.pricingMode === 'FIXED';
    const membershipUnit = gym
      ? readMembershipUnit(a.membershipUnit) ?? 'MONTHS'
      : undefined;
    const membershipDuration = gym
      ? Math.max(1, Math.floor(num(a, 'membershipDuration') ?? 1))
      : undefined;
    const isGymMembership = gym && membershipUnit != null && membershipDuration != null;

    const packageTimeLabel = photo || hideDurationOnCard
      ? undefined
      : isGymMembership
        ? membershipLabel(membershipUnit, membershipDuration) ??
          'اختر يوم بداية الاشتراك'
        : isPoolDayPackage
          ? 'يوم كامل — اختر يوماً من التقويم'
          : catalogRental
            ? 'السعر لليوم — حسب تاريخ الاستلام والإرجاع'
            : timeLabel;

    const detailText = (s.description ?? '').trim() || undefined;

    const hourlyRate =
      num(a, 'pricePerHour') ??
      packagePeriods[0]?.pricePerHour ??
      undefined;

    return {
      id: s.id,
      title: displayTitle,
      detail: detailText,
      price: isHourlyPackage
        ? hourlyRate ?? s.priceFrom ?? s.basePrice ?? 0
        : s.priceFrom ?? s.basePrice ?? 0,
      capacityLabel,
      timeLabel: packageTimeLabel,
      includes: hasPackageIncludes ? packageIncludes : undefined,
      period:
        period === 'MORNING' || period === 'EVENING' || period === 'PER_NIGHT'
          ? period
          : undefined,
      fromTime: photo || isPoolDayPackage || isGymMembership ? undefined : from,
      toTime: photo || isPoolDayPackage || isGymMembership ? undefined : to,
      pricingMode: isHourlyPackage
        ? 'HOURLY'
        : isPoolDayPackage || isGymMembership || catalogRental
          ? isPoolDayPackage || isGymMembership
            ? 'FIXED'
            : 'DAILY'
          : undefined,
      priceUnit: isHourlyPackage
        ? 'hour'
        : isPoolDayPackage || catalogRental
          ? 'day'
          : undefined,
      membershipUnit,
      membershipDuration,
    };
  });

  const hasPoolDayPackages = packages.some(
    (p) => p.pricingMode === 'FIXED' || p.priceUnit === 'day',
  );
  const poolHourlyOnly =
    pool && pricePeriods.length > 0 && !hasPoolDayPackages;

  let ctaLabel = 'استعراض الأيام المتفرغة';
  if (hotel) ctaLabel = 'استعراض الغرف';
  else if (health || salon) ctaLabel = 'اختيار الموعد';
  else if (gym) ctaLabel = 'اختيار الاشتراك';
  else if (photo || (pool && hasPoolDayPackages)) ctaLabel = 'اختيار اليوم';
  else if (sport || pool) ctaLabel = 'اختيار الوقت والمدة';
  else if (catalogRental) ctaLabel = 'اختيار أيام التأجير';
  else if (artist) ctaLabel = 'استعراض الأيام المتفرغة';
  else if (supply) ctaLabel = 'تحديد الكمية';

  let aboutTitle = `عن ${cat}`;
  if (hotel) aboutTitle = 'عن الفنادق';
  else if (isTairaman(cat)) aboutTitle = 'عن الطيرمانات';
  else if (chalet) aboutTitle = 'عن الشاليهات';
  else if (hall) aboutTitle = 'عن القاعات';
  else if (sport) aboutTitle = 'عن الملعب';
  else if (gym) aboutTitle = 'عن النادي';
  else if (pool) aboutTitle = 'عن المسبح';
  else if (health) aboutTitle = 'عن المنشأة الصحية';
  else if (salon) aboutTitle = 'عن الصالون';
  else if (car) aboutTitle = 'عن السيارات';
  else if (transport) aboutTitle = 'عن النقليات';
  else if (apparel) aboutTitle = 'عن الملبوسات';
  else if (artist) aboutTitle = 'عن الفنان';
  else if (photo) aboutTitle = 'عن جلسة التصوير';

  const aboutText =
    (hotel || hall || serviceFacility ? provider.description : null) ||
    service?.description ||
    provider.description ||
    (hotel
      ? 'خيارك الأنسب لإقامة مريحة 😴'
      : hall
        ? 'عنوان الفرح يبدأ من هنا مع تجهيزات تناسب مختلف المناسبات.'
        : `استمتع بتجربة مميزة مع ${provider.businessName} ضمن تصنيف ${cat}. الحجز سهل وسريع عبر تطبيق حجزي.`);

  const hotelTerms = [
    'يمنع حمل السلاح ⚔️',
    'الحفاظ على الممتلكات وتجنب تلف أثاث الفندق 🚫',
    'العوائل يجب إحضار عقد الزواج + بطائق ووثائق شخصية للزوجين 📜',
    'الأفراد يجب إحضار البطاقة الشخصية أو جواز السفر 💳',
    'الالتزام بالهدوء 🤫',
  ];

  const hotelPolicyBullets = [
    'يمكن استرداد مبلغ العربون في حالة الإلغاء قبل الحجز بيومين',
    'في حالة تم إبلاغنا بإلغاء الحجز قبلها بيوم يسترد نصف المبلغ',
    'أما إذا في نفس اليوم العربون لا يرجع مطلقاً',
  ];

  const depositNote =
    customDepositNote ||
    provider.cancellationPolicy?.trim() ||
    (hotel
      ? 'سياسة الفنادق: مبلغ العربون يرجع في حال إلغاء الحجز'
      : hall
        ? 'سياسة القاعات: مبلغ العربون لا يرجع مطلقاً'
        : isTairaman(cat)
          ? 'سياسة الطيرمانات: مبلغ العربون لا يرجع مطلقاً'
          : chalet
            ? 'سياسة الشاليهات: مبلغ العربون لا يرجع مطلقاً'
            : serviceDefaults?.depositNote ||
              `عربون ${depositPct}% من قيمة الحجز`);

  /** Insurance is optional — show only when the provider entered an amount. */
  const storedInsurance = num(attrs, 'insuranceAmount');
  const insuranceAmount = storedInsurance;
  const insuranceMeta =
    typeof attrs.insuranceMeta === 'string' && attrs.insuranceMeta.trim()
      ? attrs.insuranceMeta.trim()
      : undefined;
  const insuranceNote =
    typeof attrs.insuranceNote === 'string' && attrs.insuranceNote.trim()
      ? attrs.insuranceNote.trim()
      : '';
  const tourUrl =
    typeof attrs.tourUrl === 'string' && attrs.tourUrl.trim()
      ? attrs.tourUrl.trim()
      : undefined;

  const defaultHallTerms = [
    'لا يجوز للعميل إلغاء أو تعديل موعد المناسبة بعد حجزها.',
    'يلتزم العميل بالوصول إلى الصالة قبل ثلاث ساعات من موعد بدء فعاليات المناسبة على الأقل.',
    'يلتزم العميل بإخلاء الصالة وتسليمها إلى المشرف العام في الموعد المحدد.',
  ];

  return {
    categoryLabel: cat,
    aboutTitle,
    ctaLabel,
    isHotel: hotel,
    isSport: sport,
    show360: chalet,
    tourUrl,
    showFeatureChips: featureChips.length > 0 && !hotel && !hall,
    showSpaces:
      !catalogRental &&
      spaces.length > 0 &&
      (stay || sport || serviceFacility),
    showAmenities: amenities.length > 0,
    showPortfolio: portfolio.length > 0,
    showAddress: true,
    showRatingBanner: true,
    showDeposit:
      stay ||
      supply ||
      artist ||
      catalogRental ||
      Boolean(customDepositNote) ||
      Boolean(depositAmount),
    showInsurance:
      (chalet || hall || catalogRental) && insuranceAmount != null,
    showTerms:
      stay ||
      hall ||
      serviceFacility ||
      customTerms.length > 0,
    // Sports (and hourly-only pools) use the period ticket; day packages use cards.
    showPackages:
      packages.length > 0 &&
      !hotel &&
      !(sport && pricePeriods.length > 0) &&
      !poolHourlyOnly,
    showPricePeriods:
      (sport && pricePeriods.length > 0) ||
      (pool && pricePeriods.length > 0),
    pricePeriods,
    featureChips,
    spaces,
    amenities,
    portfolio,
    packages,
    maxGuestsLabel:
      maxGuests != null ? `${maxGuests} أشخاص أو أقل` : undefined,
    depositAmount,
    depositNote,
    insuranceAmount,
    insuranceMeta,
    insuranceNote,
    terms: customTerms.length
      ? customTerms
      : hotel
        ? hotelTerms
        : hall
          ? defaultHallTerms
          : chalet
            ? [
                'يمنع الدخول بالسلاح',
                'الالتزام بنظافة الأثاث قبل المغادرة',
                'يُطلب إحضار عقد الزواج وبطاقات الهوية للأزواج بدون أطفال',
              ]
            : serviceDefaults?.terms ?? [],
    policyBullets: customPolicy.length
      ? customPolicy
      : hotel
        ? hotelPolicyBullets
        : [],
    aboutText,
  };
}
