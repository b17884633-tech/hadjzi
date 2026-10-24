import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { BackButton } from '@/core/ui/components/BackButton';
import { KeyboardAwareScrollView } from '@/core/ui/components/KeyboardAwareScrollView';
import { QuantityStepper } from '@/core/ui/components/QuantityStepper';
import { SmoothBottomSheet } from '@/core/ui/components/SmoothBottomSheet';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEPOSIT_PERCENTAGE } from '../../core/common/bookingConstants';
import {
  CurrencyCode,
  readServicePrices,
  type ServicePrices,
} from '../../core/common/currency';
import {
  defaultSportPricePeriods,
  hoursCoveredByPeriods,
  parsePricePeriods,
  periodLabelForIndex,
  type PricePeriod,
} from '../../core/common/pricePeriods';
import { theme } from '../../core/ui/theme';
import { categoryAncestorNames } from '../../data/mappers/homeMappers';
import { useApp } from '../../di/AppProvider';
import { RootStackParamList } from '../navigation/types';
import { CloudinaryImagePicker } from './CloudinaryImagePicker';
import { DynamicLineList } from './DynamicLineList';
import { OptionPickerSheet } from './OptionPickerSheet';
import {
  isSalonCategory,
  resolveFacilityKind,
  SERVICE_FACILITY_DEFAULTS,
} from './categoryKinds';

function cleanAmenityList(items: string[]): string[] {
  return items.map((s) => s.trim()).filter(Boolean);
}

type Props = NativeStackScreenProps<RootStackParamList, 'ProviderServiceForm'>;

/** Open this many nights ahead so stay calendars are bookable on create. */
const SEED_DAYS = 90;
/** Default barber/salon slot length for the booking calendar (not shown in the form). */
const DEFAULT_SALON_SLOT_MINUTES = 30;

const PRICE_FIELDS: { code: CurrencyCode; label: string; placeholder: string }[] = [
  { code: 'NEW_YER', label: 'ريال يمني جديد', placeholder: '0' },
  { code: 'OLD_YER', label: 'ريال يمني قديم', placeholder: '0' },
  { code: 'SAR', label: 'ريال سعودي', placeholder: '0' },
  { code: 'USD', label: 'دولار أمريكي', placeholder: '0' },
];

type PackagePeriod = 'MORNING' | 'EVENING' | 'PER_NIGHT';
type TairamanPricingMode = 'FIXED' | 'HOURLY';
type PoolPricingMode = 'FIXED' | 'HOURLY';
type MembershipUnit = 'DAYS' | 'MONTHS';

const TAIRAMAN_PRICING_OPTIONS: {
  id: TairamanPricingMode;
  label: string;
}[] = [
  { id: 'FIXED', label: 'باقة يوم (سعر ثابت)' },
  { id: 'HOURLY', label: 'حجز بالساعة' },
];

const POOL_PRICING_OPTIONS: {
  id: PoolPricingMode;
  label: string;
}[] = [
  { id: 'FIXED', label: 'باقة يوم كامل' },
  { id: 'HOURLY', label: 'حجز بالساعة' },
];

const MEMBERSHIP_UNIT_OPTIONS: { id: MembershipUnit; label: string }[] = [
  { id: 'DAYS', label: 'بالأيام' },
  { id: 'MONTHS', label: 'بالأشهر' },
];

const MEMBERSHIP_DAY_PRESETS = [7, 15, 30, 60, 90];
const MEMBERSHIP_MONTH_PRESETS = [1, 2, 3, 6, 12];

function parseMembershipUnit(raw: unknown): MembershipUnit {
  return raw === 'MONTHS' ? 'MONTHS' : 'DAYS';
}

const PERIOD_OPTIONS: { id: PackagePeriod; label: string }[] = [
  { id: 'MORNING', label: 'صباحية' },
  { id: 'EVENING', label: 'مسائية' },
  { id: 'PER_NIGHT', label: 'لليلة' },
];

const DEFAULT_PERIOD_TIMES: Record<
  Exclude<PackagePeriod, 'PER_NIGHT'>,
  { from: string; to: string }
> = {
  MORNING: { from: '08:00', to: '16:00' },
  EVENING: { from: '16:00', to: '00:00' },
};

function toOptionalNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function emptyPriceInputs(): Record<CurrencyCode, string> {
  return { NEW_YER: '', OLD_YER: '', SAR: '', USD: '' };
}

function parsePriceInput(raw: string): number | null {
  const n = Number(String(raw).trim().replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function normalizeTimeInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function isValidTime(raw: string): boolean {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(raw.trim());
  return !!m;
}

function parseStoredPeriod(attrs: Record<string, unknown>): PackagePeriod {
  const p = attrs.period;
  if (p === 'MORNING' || p === 'EVENING' || p === 'PER_NIGHT') return p;
  if (toOptionalNum(attrs.nights) != null) return 'PER_NIGHT';
  if (typeof attrs.fromTime === 'string' || typeof attrs.toTime === 'string') {
    const h = Number(String(attrs.fromTime ?? '').slice(0, 2));
    if (Number.isFinite(h) && h >= 14) return 'EVENING';
    return 'MORNING';
  }
  return 'PER_NIGHT';
}

export function ProviderServiceFormScreen({ route, navigation }: Props) {
  const { providerId, serviceId } = route.params;
  const isEdit = !!serviceId;
  const { container } = useApp();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isHotel, setIsHotel] = useState(false);
  const [isChalet, setIsChalet] = useState(false);
  const [isTairaman, setIsTairaman] = useState(false);
  const [isHall, setIsHall] = useState(false);
  const [isSport, setIsSport] = useState(false);
  const [isPool, setIsPool] = useState(false);
  const [isGym, setIsGym] = useState(false);
  const [isHealth, setIsHealth] = useState(false);
  const [isSalon, setIsSalon] = useState(false);
  const [isCar, setIsCar] = useState(false);
  const [isTransport, setIsTransport] = useState(false);
  const [isApparel, setIsApparel] = useState(false);
  const [isArtist, setIsArtist] = useState(false);
  const [isPhoto, setIsPhoto] = useState(false);
  const [apparelSize, setApparelSize] = useState('');
  const [apparelColor, setApparelColor] = useState('');
  const [productAmenities, setProductAmenities] = useState<string[]>([]);
  /** Barber/salon package: what the package includes (add/delete lines). */
  const [packageIncludes, setPackageIncludes] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [prices, setPrices] = useState<Record<CurrencyCode, string>>(emptyPriceInputs);
  const [capacity, setCapacity] = useState<number | undefined>();
  const [maxChildren, setMaxChildren] = useState<number | undefined>();
  const [beds, setBeds] = useState<number | undefined>();
  const [slotMinutes, setSlotMinutes] = useState<number | undefined>(30);
  const [seats, setSeats] = useState<number | undefined>(5);
  const [carYear, setCarYear] = useState('');
  const [carBrand, setCarBrand] = useState('');
  const [carBrands, setCarBrands] = useState<string[]>([]);
  const [brandPickerOpen, setBrandPickerOpen] = useState(false);
  const [newBrandDraft, setNewBrandDraft] = useState('');
  const [addingBrand, setAddingBrand] = useState(false);
  const [transmission, setTransmission] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [period, setPeriod] = useState<PackagePeriod>('PER_NIGHT');
  const [fromTime, setFromTime] = useState(DEFAULT_PERIOD_TIMES.MORNING.from);
  const [toTime, setToTime] = useState(DEFAULT_PERIOD_TIMES.MORNING.to);
  const [pricePeriods, setPricePeriods] = useState<PricePeriod[]>(
    defaultSportPricePeriods(5000),
  );
  /** طيرمان: fixed day package vs hourly (price × hours). */
  const [tairamanPricingMode, setTairamanPricingMode] =
    useState<TairamanPricingMode>('FIXED');
  /** مسبح: full-day exclusive package vs hourly periods. */
  const [poolPricingMode, setPoolPricingMode] =
    useState<PoolPricingMode>('FIXED');
  /** نادي رياضي: اشتراك بالأيام أو الأشهر. */
  const [membershipUnit, setMembershipUnit] =
    useState<MembershipUnit>('MONTHS');
  const [membershipDuration, setMembershipDuration] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [inventory, setInventory] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [facilityMaxGuests, setFacilityMaxGuests] = useState<number | undefined>();
  const [facilityInventory, setFacilityInventory] = useState(1);
  const [facilityBusinessName, setFacilityBusinessName] = useState('');
  const [facilityMaxPlayers, setFacilityMaxPlayers] = useState<number | undefined>();

  const load = useCallback(async () => {
    try {
      const [facility, treeRes] = await Promise.all([
        container.providerApi.getMineById(providerId),
        container.categoryApi.tree(),
      ]);
      const treeData = treeRes.data.data ?? [];
      const categoryId = facility.categoryId ?? facility.category?.id ?? null;
      const ancestorNames = categoryAncestorNames(treeData, categoryId);
      const kind = resolveFacilityKind(
        facility.category?.name,
        ...ancestorNames,
      );
      const hotel = kind === 'hotel';
      const tairaman = kind === 'tairaman';
      const chalet = kind === 'chalet' || tairaman;
      const hall = kind === 'hall';
      const sport = kind === 'sport';
      const pool = kind === 'pool';
      const gym = kind === 'gym';
      const health = kind === 'health';
      // Force salon when leaf/ancestors match (e.g. «قسم الرجال» under «كوافير»).
      const salon =
        kind === 'salon' ||
        isSalonCategory(facility.category?.name) ||
        ancestorNames.some(isSalonCategory);
      const car = kind === 'car';
      const transport = kind === 'transport';
      const apparel = kind === 'apparel';
      const artist = kind === 'artist';
      const photo = kind === 'photo';
      setIsHotel(hotel);
      setIsChalet(chalet);
      setIsTairaman(tairaman);
      setIsHall(hall);
      setIsSport(sport);
      setIsPool(pool);
      setIsGym(gym);
      setIsHealth(health);
      setIsSalon(salon);
      setIsCar(car);
      setIsTransport(transport);
      setIsApparel(apparel);
      setIsArtist(artist);
      setIsPhoto(photo);
      setFacilityBusinessName(facility.businessName?.trim() || '');
      const fa = (facility.attributes ?? {}) as Record<string, unknown>;
      setFacilityMaxGuests(
        toOptionalNum(fa.maxGuests) ??
          toOptionalNum(fa.capacity) ??
          toOptionalNum(fa.guests),
      );
      setFacilityMaxPlayers(
        toOptionalNum(fa.maxPlayers) ??
          toOptionalNum(fa.players) ??
          toOptionalNum(fa.capacity),
      );
      const facilityUnits =
        toOptionalNum(fa.inventory) ?? toOptionalNum(fa.units) ?? 1;
      setFacilityInventory(facilityUnits > 0 ? facilityUnits : 1);

      if (serviceId) {
        const list = await container.serviceApi.listMine(providerId);
        const svc = list.find((s) => s.id === serviceId);
        if (!svc) {
          setError(
            chalet || hall || artist || photo
              ? 'الباقة غير موجودة'
              : hotel
                ? 'الغرفة غير موجودة'
                : car
                  ? 'السيارة غير موجودة'
                  : 'الخدمة غير موجودة',
          );
          return;
        }
        setName(svc.name);
        setDescription(svc.description ?? '');
        setBasePrice(String(svc.basePrice ?? ''));
        setImages(svc.images ?? []);
        const a = svc.attributes ?? {};
        if ((!chalet || tairaman) && !sport && !pool && !gym) {
          setCapacity(toOptionalNum(a.capacity) ?? toOptionalNum(a.guests));
          if (hotel) {
            setMaxChildren(
              toOptionalNum(a.maxChildren) ??
                toOptionalNum(a.childrenCapacity) ??
                0,
            );
          }
          if (!tairaman && !artist && !car) {
            setBeds(
              toOptionalNum(a.beds) ??
                toOptionalNum(a.rooms) ??
                toOptionalNum(a.bedrooms),
            );
          }
        }
        if (health) {
          setSlotMinutes(
            toOptionalNum(a.slotMinutes) ??
              toOptionalNum(a.durationMinutes) ??
              toOptionalNum(svc.durationMinutes) ??
              30,
          );
        }
        if (salon) {
          const inc = Array.isArray(a.includes)
            ? (a.includes as unknown[])
                .filter((x): x is string => typeof x === 'string')
                .map((x) => x.trim())
                .filter(Boolean)
            : [];
          setPackageIncludes(inc.length ? inc : ['']);
        }
        if (car || transport || apparel) {
          const am = Array.isArray(a.amenities)
            ? (a.amenities as unknown[])
                .filter((x): x is string => typeof x === 'string')
                .map((x) => x.trim())
                .filter(Boolean)
            : [];
          setProductAmenities(
            am.length
              ? am
              : car
                ? [...SERVICE_FACILITY_DEFAULTS.car.amenities]
                : transport
                  ? [...SERVICE_FACILITY_DEFAULTS.transport.amenities]
                  : [...SERVICE_FACILITY_DEFAULTS.apparel.amenities],
          );
        }
        if (car || transport) {
          setSeats(toOptionalNum(a.seats) ?? 5);
          const y = toOptionalNum(a.year);
          setCarYear(y != null ? String(y) : '');
          setTransmission(a.transmission === 'MANUAL' ? 'MANUAL' : 'AUTO');
        }
        if (car) {
          const brand =
            typeof a.brand === 'string' ? a.brand.trim() : '';
          setCarBrand(brand);
        }
        if (apparel) {
          setApparelSize(
            typeof a.size === 'string' ? a.size : String(a.size ?? ''),
          );
          setApparelColor(
            typeof a.color === 'string' ? a.color : String(a.color ?? ''),
          );
          const units =
            toOptionalNum(a.inventory) ??
            toOptionalNum(a.units) ??
            (svc.availabilities?.[0]?.totalCapacity ?? 1);
          setInventory(units && units > 0 ? units : 1);
        }
        if (tairaman) {
          const units =
            toOptionalNum(a.inventory) ??
            toOptionalNum(a.units) ??
            (svc.availabilities?.[0]?.totalCapacity ?? 1);
          setInventory(units && units > 0 ? units : 1);
          const savedPeriods = parsePricePeriods(a.pricePeriods);
          const hourly =
            a.pricingMode === 'HOURLY' ||
            (savedPeriods.length > 0 && a.pricingMode !== 'FIXED');
          setTairamanPricingMode(hourly ? 'HOURLY' : 'FIXED');
          if (hourly && savedPeriods.length) {
            setPricePeriods(savedPeriods);
          }
        }
        const storedPeriod = parseStoredPeriod(a);
        setPeriod(storedPeriod);
        if (tairaman || hall || artist) {
          const periodFrom =
            Array.isArray(a.pricePeriods) &&
            a.pricePeriods[0] &&
            typeof (a.pricePeriods[0] as { fromTime?: unknown }).fromTime ===
              'string'
              ? String(
                  (a.pricePeriods[0] as { fromTime: string }).fromTime,
                ).slice(0, 5)
              : undefined;
          const periodTo =
            Array.isArray(a.pricePeriods) &&
            a.pricePeriods[0] &&
            typeof (a.pricePeriods[0] as { toTime?: unknown }).toTime ===
              'string'
              ? String((a.pricePeriods[0] as { toTime: string }).toTime).slice(
                  0,
                  5,
                )
              : undefined;
          setFromTime(
            typeof a.fromTime === 'string' && a.fromTime.trim()
              ? String(a.fromTime).slice(0, 5)
              : periodFrom ?? '10:00',
          );
          setToTime(
            typeof a.toTime === 'string' && a.toTime.trim()
              ? String(a.toTime).slice(0, 5)
              : periodTo ?? '21:00',
          );
        } else if (storedPeriod === 'MORNING' || storedPeriod === 'EVENING') {
          const defaults = DEFAULT_PERIOD_TIMES[storedPeriod];
          setFromTime(
            typeof a.fromTime === 'string' && a.fromTime.trim()
              ? String(a.fromTime).slice(0, 5)
              : defaults.from,
          );
          setToTime(
            typeof a.toTime === 'string' && a.toTime.trim()
              ? String(a.toTime).slice(0, 5)
              : defaults.to,
          );
        }
        if (tairaman) {
          // inventory already loaded from package attributes above
        } else if (!chalet) {
          const units =
            toOptionalNum(a.inventory) ??
            toOptionalNum(a.units) ??
            (svc.availabilities?.[0]?.totalCapacity ?? 1);
          setInventory(units && units > 0 ? units : 1);
        } else {
          setInventory(facilityUnits > 0 ? facilityUnits : 1);
        }

        if (pool) {
          const savedPeriods = parsePricePeriods(a.pricePeriods);
          const hourly =
            a.pricingMode === 'HOURLY' ||
            (savedPeriods.length > 0 && a.pricingMode !== 'FIXED');
          setPoolPricingMode(hourly ? 'HOURLY' : 'FIXED');
          if (hourly) {
            setPricePeriods(
              savedPeriods.length
                ? savedPeriods
                : defaultSportPricePeriods(Number(svc.basePrice) || 5000),
            );
          }
        } else if (gym) {
          setMembershipUnit(parseMembershipUnit(a.membershipUnit));
          setMembershipDuration(
            Math.max(1, Math.floor(toOptionalNum(a.membershipDuration) ?? 1)),
          );
        } else if (sport) {
          const savedPeriods = parsePricePeriods(a.pricePeriods);
          setPricePeriods(
            savedPeriods.length
              ? savedPeriods
              : defaultSportPricePeriods(Number(svc.basePrice) || 5000),
          );
        }

        const saved = readServicePrices(a, svc.basePrice);
        setPrices({
          NEW_YER: saved.NEW_YER != null ? String(saved.NEW_YER) : String(svc.basePrice ?? ''),
          OLD_YER: saved.OLD_YER != null ? String(saved.OLD_YER) : '',
          SAR: saved.SAR != null ? String(saved.SAR) : '',
          USD: saved.USD != null ? String(saved.USD) : '',
        });
      } else if (pool) {
        setPoolPricingMode('FIXED');
        setName('');
      } else if (gym) {
        setMembershipUnit('MONTHS');
        setMembershipDuration(1);
        setName('');
      } else if (sport) {
        setPricePeriods(defaultSportPricePeriods(5000));
        setName(facility.businessName?.trim() || 'باقة أسعار');
      } else if (hall || artist || tairaman) {
        setFromTime('10:00');
        setToTime('21:00');
        if (tairaman) {
          setCapacity(25);
          setInventory(1);
        }
      } else if (hotel) {
        setMaxChildren(0);
      } else if (health) {
        setSlotMinutes(30);
      } else if (salon) {
        setPackageIncludes(['']);
      } else if (photo) {
        // day package — no duration
      } else if (car || transport) {
        setSeats(5);
        setInventory(1);
        setProductAmenities(
          car
            ? [...SERVICE_FACILITY_DEFAULTS.car.amenities]
            : [...SERVICE_FACILITY_DEFAULTS.transport.amenities],
        );
      } else if (apparel) {
        setInventory(1);
        setProductAmenities([...SERVICE_FACILITY_DEFAULTS.apparel.amenities]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر التحميل');
    } finally {
      setLoading(false);
    }
  }, [container, providerId, serviceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isCar) return;
    let cancelled = false;
    void container.serviceApi
      .listCarBrands()
      .then((list) => {
        if (cancelled) return;
        setCarBrands(list.map((b) => b.name).filter(Boolean));
      })
      .catch(() => {
        if (!cancelled) setCarBrands([]);
      });
    return () => {
      cancelled = true;
    };
  }, [container.serviceApi, isCar]);

  const setPriceField = (code: CurrencyCode, value: string) => {
    setPrices((prev) => ({ ...prev, [code]: value }));
  };

  const selectPeriod = (next: PackagePeriod) => {
    setPeriod(next);
    if (next === 'MORNING' || next === 'EVENING') {
      const defaults = DEFAULT_PERIOD_TIMES[next];
      setFromTime(defaults.from);
      setToTime(defaults.to);
    }
  };

  const isPoolDayPackage = isPool && poolPricingMode === 'FIXED';
  const isPoolHourly = isPool && poolPricingMode === 'HOURLY';
  const isHourlyPeriods = isSport || isPoolHourly;
  const isTairamanHourly = isTairaman && tairamanPricingMode === 'HOURLY';
  const isEventPackage = isHall || isArtist;
  /** Photographers: day packages with name + detail + prices only. */
  const isPhotoPackage = isPhoto;
  /** Gym / sport club membership — client picks start day; end is computed. */
  const isGymMembership = isGym;
  /** Full-day exclusive pool rental — client picks one calendar day. */
  const isDayExclusivePackage = isPhotoPackage || isPoolDayPackage;
  /** Health appointments still need a duration for the slot calendar. */
  const isHealthAppointment = isHealth;
  /** Barber/salon packages: name, price, includes — no duration field. */
  const isSalonPackage = isSalon;
  const isAppointment = isHealthAppointment || isSalonPackage;
  // Salon packages never show the duration stepper (hidden default for calendar only).
  const isCatalogItem = isCar || isTransport || isApparel;
  const useMultiCurrency =
    isHotel ||
    isChalet ||
    isHall ||
    isArtist ||
    isCatalogItem ||
    isDayExclusivePackage ||
    isGymMembership ||
    isSalonPackage;
  const entityLabel = isHotel
    ? 'الغرفة'
    : isChalet ||
        isEventPackage ||
        isDayExclusivePackage ||
        isGymMembership ||
        isSalonPackage
      ? 'الباقة'
      : isHourlyPeriods
        ? 'فترات الأسعار'
        : isApparel
          ? 'المنتج'
          : isTransport
            ? 'المركبة'
            : isCar
              ? 'السيارة'
              : isAppointment
                ? 'الخدمة'
                : 'الخدمة';
  const entityLabelIndef = isHotel
    ? 'غرفة'
    : isChalet ||
        isEventPackage ||
        isDayExclusivePackage ||
        isGymMembership ||
        isSalonPackage
      ? 'باقة'
      : isHourlyPeriods
        ? 'فترات الأسعار'
        : isApparel
          ? 'منتج'
          : isTransport
            ? 'مركبة'
            : isCar
              ? 'سيارة'
              : 'خدمة';

  const updatePeriod = (id: string, patch: Partial<PricePeriod>) => {
    setPricePeriods((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  };

  const addPeriod = () => {
    setPricePeriods((prev) => {
      if (prev.length >= 6) return prev;
      const last = prev[prev.length - 1];
      return [
        ...prev,
        {
          id: `p${Date.now()}`,
          label: periodLabelForIndex(prev.length),
          fromTime: last?.toTime ?? '20:00',
          toTime: '22:00',
          pricePerHour: last?.pricePerHour ?? 5000,
        },
      ];
    });
  };

  const removePeriod = (id: string) => {
    setPricePeriods((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.id !== id)));
  };

  const submit = async () => {
    // Sport/pool packages inherit identity from the facility form.
    const trimmed = isHourlyPeriods
      ? name.trim() || facilityBusinessName || 'باقة أسعار'
      : name.trim();
    if (!isHourlyPeriods && !trimmed) {
      setError(`أدخل اسم ${entityLabelIndef}`);
      return;
    }

    let newYerPrice: number;
    let multiPrices: ServicePrices | undefined;
    let cleanedPeriods: PricePeriod[] | undefined;

    if (isHourlyPeriods) {
      if (!pricePeriods.length) {
        setError('أضف فترة سعر واحة على الأقل');
        return;
      }
      cleanedPeriods = [];
      for (const p of pricePeriods) {
        if (!isValidTime(p.fromTime) || !isValidTime(p.toTime)) {
          setError(`أدخل وقتاً صحيحاً لـ«${p.label}»`);
          return;
        }
        if (!Number.isFinite(p.pricePerHour) || p.pricePerHour < 0) {
          setError(`أدخل سعراً صحيحاً لـ«${p.label}»`);
          return;
        }
        cleanedPeriods.push({
          ...p,
          fromTime: p.fromTime.trim().slice(0, 5),
          toTime: p.toTime.trim().slice(0, 5),
          pricePerHour: Math.round(p.pricePerHour),
          label: p.label.trim() || periodLabelForIndex(cleanedPeriods.length),
        });
      }
      newYerPrice = Math.min(...cleanedPeriods.map((p) => p.pricePerHour));
    } else if (useMultiCurrency) {
      const parsed: ServicePrices = {};
      for (const { code, label } of PRICE_FIELDS) {
        const n = parsePriceInput(prices[code]);
        if (n == null) {
          setError(`أدخل سعراً صحيحاً لـ${label}`);
          return;
        }
        parsed[code] = n;
      }
      newYerPrice = parsed.NEW_YER!;
      multiPrices = parsed;
    } else {
      const price = parsePriceInput(basePrice);
      if (price == null) {
        setError('أدخل سعراً صحيحاً');
        return;
      }
      newYerPrice = price;
    }

    if (
      isChalet &&
      !isTairaman &&
      (period === 'MORNING' || period === 'EVENING') &&
      (!isValidTime(fromTime) || !isValidTime(toTime))
    ) {
      setError('أدخل وقت البداية والنهاية بصيغة ساعة:دقيقة (مثال 08:00)');
      return;
    }
    if (
      (isEventPackage || isTairaman) &&
      (!isValidTime(fromTime) || !isValidTime(toTime))
    ) {
      setError(
        isTairamanHourly
          ? 'أدخل ساعات العمل المتاحة للحجز (من–إلى)'
          : 'أدخل وقت البداية والنهاية بصيغة ساعة:دقيقة (مثال 10:00)',
      );
      return;
    }
    if ((isHall || isTairaman) && (capacity == null || capacity < 1)) {
      setError('أدخل سعة الباقة (عدد الأشخاص)');
      return;
    }
    if (isHealthAppointment && (slotMinutes == null || slotMinutes < 5)) {
      setError('أدخل مدة الخدمة بالدقائق (5 على الأقل)');
      return;
    }
    if (
      isSalonPackage &&
      cleanAmenityList(packageIncludes).length === 0
    ) {
      setError('أضف ما تشمله الباقة (سطر واحد على الأقل)');
      return;
    }
    if ((isCar || isTransport) && (seats == null || seats < 1)) {
      setError('أدخل عدد المقاعد');
      return;
    }
    if (isCar && !carBrand.trim()) {
      setError('اختر ماركة السيارة أو أضف ماركة جديدة');
      return;
    }
    if (isApparel && !apparelSize.trim()) {
      setError('أدخل المقاس');
      return;
    }
    if (
      isGymMembership &&
      (!Number.isFinite(membershipDuration) || membershipDuration < 1)
    ) {
      setError(
        membershipUnit === 'MONTHS'
          ? 'أدخل مدة الاشتراك بالأشهر (شهر واحد على الأقل)'
          : 'أدخل مدة الاشتراك بالأيام (يوم واحد على الأقل)',
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const attributes: Record<string, unknown> = {};

      if (isTairaman) {
        attributes.fromTime = fromTime.trim();
        attributes.toTime = toTime.trim();
        const guests = Math.max(1, Math.floor(Number(capacity)));
        attributes.capacity = guests;
        attributes.guests = guests;
        attributes.maxGuests = guests;
        delete attributes.period;
        // Unit count lives on the facility — mirror for calendar seed only.
        attributes.inventory = facilityInventory;
        attributes.units = facilityInventory;
        if (isTairamanHourly) {
          attributes.pricingMode = 'HOURLY';
          attributes.pricePerHour = newYerPrice;
          // Single operating window so backend/client reuse sports hourly pricing.
          attributes.pricePeriods = [
            {
              id: 'hourly',
              label: 'حجز بالساعة',
              fromTime: fromTime.trim().slice(0, 5),
              toTime: toTime.trim().slice(0, 5),
              pricePerHour: newYerPrice,
            },
          ];
        } else {
          attributes.pricingMode = 'FIXED';
          delete attributes.pricePerHour;
          delete attributes.pricePeriods;
        }
      } else if (isChalet) {
        attributes.period = period;
        if (period === 'MORNING' || period === 'EVENING') {
          attributes.fromTime = fromTime.trim();
          attributes.toTime = toTime.trim();
        }
        if (facilityMaxGuests != null && facilityMaxGuests > 0) {
          attributes.maxGuests = facilityMaxGuests;
          attributes.capacity = facilityMaxGuests;
          attributes.guests = facilityMaxGuests;
        }
        // Unit count lives on the facility — mirror for calendar seed only.
        attributes.inventory = facilityInventory;
        attributes.units = facilityInventory;
      } else if (isEventPackage) {
        attributes.fromTime = fromTime.trim();
        attributes.toTime = toTime.trim();
        if (capacity != null && capacity > 0) {
          attributes.capacity = capacity;
          attributes.guests = capacity;
          attributes.maxGuests = capacity;
        }
        attributes.inventory = 1;
        attributes.units = 1;
      } else if (isHourlyPeriods) {
        attributes.pricePeriods = cleanedPeriods;
        attributes.pricingMode = 'HOURLY';
        // Players / dimensions live on the facility — mirror for booking UI only.
        if (facilityMaxPlayers != null && facilityMaxPlayers > 0) {
          attributes.capacity = facilityMaxPlayers;
          attributes.guests = facilityMaxPlayers;
          attributes.players = facilityMaxPlayers;
          attributes.maxPlayers = facilityMaxPlayers;
          attributes.maxGuests = facilityMaxPlayers;
        }
      } else if (isHealthAppointment) {
        const mins = Math.max(5, Math.floor(Number(slotMinutes)));
        attributes.slotMinutes = mins;
        attributes.durationMinutes = mins;
      } else if (isSalonPackage) {
        const includes = cleanAmenityList(packageIncludes);
        attributes.includes = includes;
        // Hidden default for calendar slots — not shown on the package card.
        attributes.slotMinutes = DEFAULT_SALON_SLOT_MINUTES;
        attributes.durationMinutes = DEFAULT_SALON_SLOT_MINUTES;
      } else if (isDayExclusivePackage) {
        // Full-day booking — client picks one calendar day.
        attributes.pricingMode = 'FIXED';
        attributes.inventory = 1;
        attributes.units = 1;
        if (isPoolDayPackage && facilityMaxPlayers != null && facilityMaxPlayers > 0) {
          attributes.capacity = facilityMaxPlayers;
          attributes.guests = facilityMaxPlayers;
          attributes.maxGuests = facilityMaxPlayers;
          attributes.maxPlayers = facilityMaxPlayers;
        }
        delete attributes.slotMinutes;
        delete attributes.durationMinutes;
        delete attributes.fromTime;
        delete attributes.toTime;
        delete attributes.pricePeriods;
        delete attributes.membershipUnit;
        delete attributes.membershipDuration;
      } else if (isGymMembership) {
        const duration = Math.max(1, Math.floor(Number(membershipDuration) || 1));
        attributes.pricingMode = 'FIXED';
        attributes.membershipUnit = membershipUnit;
        attributes.membershipDuration = duration;
        attributes.inventory = 1;
        attributes.units = 1;
        delete attributes.slotMinutes;
        delete attributes.durationMinutes;
        delete attributes.fromTime;
        delete attributes.toTime;
        delete attributes.pricePeriods;
      } else if (isCar || isTransport) {
        const seatCount = Math.max(1, Math.floor(Number(seats)));
        attributes.seats = seatCount;
        attributes.transmission = transmission;
        const year = toOptionalNum(carYear);
        if (year != null) attributes.year = year;
        else delete attributes.year;
        if (isCar) {
          const brand = carBrand.trim().replace(/\s+/g, ' ');
          attributes.brand = brand;
          await container.serviceApi.ensureCarBrand(brand).catch(() => null);
        }
        attributes.inventory = Math.max(1, Math.floor(Number(inventory)));
        attributes.units = attributes.inventory;
        attributes.pricingMode = 'DAILY';
        const am = cleanAmenityList(productAmenities);
        if (am.length) attributes.amenities = am;
        else delete attributes.amenities;
      } else if (isApparel) {
        attributes.size = apparelSize.trim();
        if (apparelColor.trim()) attributes.color = apparelColor.trim();
        else delete attributes.color;
        attributes.inventory = Math.max(1, Math.floor(Number(inventory)));
        attributes.units = attributes.inventory;
        attributes.pricingMode = 'DAILY';
        const am = cleanAmenityList(productAmenities);
        if (am.length) attributes.amenities = am;
        else delete attributes.amenities;
      } else {
        if (capacity != null && capacity > 0) {
          attributes.capacity = capacity;
          attributes.guests = capacity;
          attributes.maxGuests = capacity;
        }
        if (isHotel) {
          if (beds != null && beds > 0) {
            attributes.beds = beds;
            attributes.rooms = beds;
            attributes.bedrooms = beds;
          }
          const kids = Math.max(0, Math.floor(Number(maxChildren ?? 0)));
          attributes.maxChildren = kids;
          attributes.childrenCapacity = kids;
          attributes.inventory = inventory;
          attributes.units = inventory;
        } else if (beds != null && beds > 0) {
          attributes.beds = beds;
          attributes.rooms = beds;
          attributes.bedrooms = beds;
        }
      }

      if (multiPrices) {
        attributes.prices = multiPrices;
      }

      const payload = {
        name: trimmed,
        description: isHourlyPeriods ? undefined : description.trim() || undefined,
        basePrice: newYerPrice,
        depositPercentage: DEPOSIT_PERCENTAGE,
        images:
          isHourlyPeriods || isDayExclusivePackage || isGymMembership
            ? []
            : images,
        attributes,
        ...(isHealthAppointment
          ? {
              durationMinutes: Math.max(5, Math.floor(Number(slotMinutes))),
            }
          : isSalonPackage
            ? { durationMinutes: DEFAULT_SALON_SLOT_MINUTES }
            : {}),
      };

      let id = serviceId;
      if (isEdit && serviceId) {
        await container.serviceApi.update(serviceId, payload);
      } else {
        const created = await container.serviceApi.create({
          ...payload,
          providerId,
        });
        id = created.id;
      }

      if (id && isHourlyPeriods) {
        const hours = hoursCoveredByPeriods(cleanedPeriods ?? pricePeriods);
        await container.serviceApi.seedHourlyAvailabilities(id, {
          days: 14,
          hours: hours.length ? hours : undefined,
          startHour: hours[0] ?? 8,
          endHour: (hours[hours.length - 1] ?? 21) + 1,
          totalCapacity: 1,
        });
      } else if (id && isTairamanHourly) {
        const band: PricePeriod[] = [
          {
            id: 'hourly',
            label: 'حجز بالساعة',
            fromTime: fromTime.trim().slice(0, 5),
            toTime: toTime.trim().slice(0, 5),
            pricePerHour: newYerPrice,
          },
        ];
        const hours = hoursCoveredByPeriods(band);
        await container.serviceApi.seedHourlyAvailabilities(id, {
          days: 14,
          hours: hours.length ? hours : undefined,
          startHour: hours[0] ?? 8,
          endHour: (hours[hours.length - 1] ?? 21) + 1,
          totalCapacity: Math.max(1, facilityInventory),
        });
      } else if (id && isAppointment) {
        await container.serviceApi.seedHourlyAvailabilities(id, {
          days: 14,
          startHour: 9,
          endHour: 21,
          totalCapacity: 1,
        });
      } else if (
        id &&
        (isHotel ||
          isChalet ||
          isEventPackage ||
          isDayExclusivePackage ||
          isGymMembership ||
          isCatalogItem ||
          !isEdit)
      ) {
        const seedCap = isTairaman || isChalet
          ? Math.max(1, facilityInventory)
          : isEventPackage || isDayExclusivePackage || isGymMembership
            ? 1
            : Math.max(1, inventory);
        await container.serviceApi.seedAvailabilities(id, {
          days: SEED_DAYS,
          totalCapacity: seedCap,
        });
      }

      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <BackButton />
        <Text style={styles.topTitle}>
          {isEdit ? `تعديل ${entityLabel}` : `إضافة ${entityLabelIndef}`}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        bottomOffset={72}
      >
        {isPool ? (
          <View style={styles.card}>
            <Text style={styles.label}>نوع الحجز</Text>
            <View style={styles.periodRow}>
              {POOL_PRICING_OPTIONS.map((opt) => {
                const selected = poolPricingMode === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    style={[styles.periodChip, selected && styles.periodChipOn]}
                    onPress={() => setPoolPricingMode(opt.id)}
                  >
                    <Text
                      style={[
                        styles.periodChipText,
                        selected && styles.periodChipTextOn,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.meta}>
              {isPoolDayPackage
                ? 'باقة يوم كامل: العميل يحجز المسبح ليوم واحد من التقويم.'
                : 'حجز بالساعة: حدّد فترات اليوم وسعر الساعة — العميل يختار الوقت والمدة.'}
            </Text>
          </View>
        ) : null}

        {isSalonPackage ? (
          <View style={styles.card}>
            <DynamicLineList
              label="ما تشمله الباقة"
              hint="أضف سطراً لكل خدمة مشمولة — يظهر للعميل على بطاقة الباقة. مثال: قص شعر، تشذيب لحية، غسيل وتسريح"
              items={packageIncludes.length ? packageIncludes : ['']}
              onChange={setPackageIncludes}
              placeholder="ما يشمله…"
              addLabel="إضافة"
            />
          </View>
        ) : null}

        {isGymMembership ? (
          <View style={styles.card}>
            <Text style={styles.label}>نوع الاشتراك</Text>
            <View style={styles.periodRow}>
              {MEMBERSHIP_UNIT_OPTIONS.map((opt) => {
                const selected = membershipUnit === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    style={[styles.periodChip, selected && styles.periodChipOn]}
                    onPress={() => {
                      setMembershipUnit(opt.id);
                      setMembershipDuration(opt.id === 'MONTHS' ? 1 : 30);
                    }}
                  >
                    <Text
                      style={[
                        styles.periodChipText,
                        selected && styles.periodChipTextOn,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.label, { marginTop: 12 }]}>
              {membershipUnit === 'MONTHS' ? 'عدد الأشهر' : 'عدد الأيام'}
            </Text>
            <View style={styles.periodRow}>
              {(membershipUnit === 'MONTHS'
                ? MEMBERSHIP_MONTH_PRESETS
                : MEMBERSHIP_DAY_PRESETS
              ).map((n) => {
                const selected = membershipDuration === n;
                return (
                  <Pressable
                    key={n}
                    style={[styles.periodChip, selected && styles.periodChipOn]}
                    onPress={() => setMembershipDuration(n)}
                  >
                    <Text
                      style={[
                        styles.periodChipText,
                        selected && styles.periodChipTextOn,
                      ]}
                    >
                      {membershipUnit === 'MONTHS'
                        ? n === 1
                          ? 'شهر'
                          : `${n} أشهر`
                        : `${n} يوم`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ marginTop: 8 }}>
              <QuantityStepper
                label={
                  membershipUnit === 'MONTHS'
                    ? 'مدة مخصصة (أشهر)'
                    : 'مدة مخصصة (أيام)'
                }
                value={membershipDuration}
                onChange={(n) =>
                  setMembershipDuration(Math.max(1, Math.floor(n ?? 1)))
                }
                min={1}
              />
            </View>
            <Text style={styles.meta}>
              العميل يختار يوم بداية الاشتراك — تاريخ النهاية يُحسب تلقائياً حسب
              المدة.
            </Text>
          </View>
        ) : null}

        {!isHourlyPeriods && !isDayExclusivePackage && !isGymMembership ? (
          <CloudinaryImagePicker
            urls={images}
            onChange={setImages}
            label={`صور ${entityLabel}`}
          />
        ) : null}

        {!isHourlyPeriods ? (
          <View style={styles.card}>
            {isHotel ||
            isChalet ||
            isEventPackage ||
            isDayExclusivePackage ||
            isGymMembership ||
            isAppointment ||
            isCatalogItem ? (
              <Text style={styles.hint}>
                {isHotel
                  ? 'الغرف هي خدمات الفندق — تظهر في «استعراض الغرف» على صفحة التفاصيل.'
                  : isTairaman
                    ? 'الباقات هي خدمات الطيرمان — يمكنك اختيار باقة يوم بسعر ثابت أو حجز بالساعة.'
                    : isChalet
                      ? 'الباقات هي خدمات الشاليه — تظهر في قسم «الغرف والباقات» على صفحة التفاصيل.'
                      : isHall
                        ? 'الباقات تظهر في صفحة القاعة مع السعة ووقت المناسبة.'
                        : isArtist
                          ? 'باقات الحفل تظهر مع وقت التواجد في صفحة الفنان.'
                          : isGymMembership
                            ? 'باقة اشتراك: الاسم والوصف والأسعار والمدة — العميل يختار يوم بداية الاشتراك.'
                            : isPoolDayPackage
                              ? 'باقة يوم كامل: الاسم والوصف والأسعار — العميل يختار يوماً واحداً من التقويم لحجز المسبح كاملاً.'
                              : isPhotoPackage
                                ? 'الباقة: الاسم والوصف والأسعار فقط — العميل يختار يوماً واحداً للحجز.'
                                : isAppointment
                                  ? 'كل خدمة لها مدة وسعر — تظهر مواعيدها للعميل عند الحجز.'
                                  : isApparel
                                    ? 'كل منتج يظهر مباشرة في تصنيف الملبوسات — التأجير بسعر اليوم × عدد الأيام.'
                                    : isTransport
                                      ? 'كل مركبة تظهر مباشرة في تصنيف النقليات — التأجير بأيام الاستلام/الإرجاع.'
                                      : isCar
                                        ? 'كل سيارة تظهر مباشرة في تصنيف السيارات — التأجير بأيام الاستلام/الإرجاع.'
                                        : null}
              </Text>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>اسم {entityLabel}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={
                  isHotel
                    ? 'مثال: غرفة ديلوكس'
                    : isTairaman
                      ? 'مثال: ليلة في الطيرمان'
                      : isChalet
                        ? 'مثال: ليلة في الشاليه'
                        : isHall
                          ? 'مثال: باقة الزفاف'
                          : isArtist
                            ? 'مثال: زفّة كاملة'
                            : isGymMembership
                              ? membershipUnit === 'MONTHS'
                                ? 'مثال: اشتراك شهري'
                                : 'مثال: اشتراك 30 يوم'
                              : isPoolDayPackage
                                ? 'مثال: حجز المسبح ليوم كامل'
                                : isPhotoPackage
                                  ? 'مثال: جلسة تصوير عروس'
                                  : isHealth
                                    ? 'مثال: كشف عام'
                                    : isSalon
                                      ? 'مثال: قص وتصفيف'
                                      : isCar
                                        ? 'مثال: تويوتا كامري'
                                        : 'اسم الخدمة'
                }
                placeholderTextColor={theme.colors.textSecondary}
                textAlign="right"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                {isDayExclusivePackage || isGymMembership ? 'التفاصيل' : 'الوصف'}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder={
                  isHotel
                    ? 'وصف الغرفة والمرافق'
                    : isGymMembership
                      ? 'ما يشمله الاشتراك (صالة أوزان، كاردو، مدرب…)'
                      : isPoolDayPackage
                        ? 'ما يشمله حجز المسبح ليوم كامل'
                        : isPhotoPackage
                          ? 'تفاصيل الجلسة وما تشمله الباقة'
                          : isChalet || isEventPackage
                            ? 'وصف الباقة وما تشمله'
                            : isAppointment
                              ? 'وصف الخدمة وما تشمله'
                              : isCar
                                ? 'وصف السيارة ومواصفاتها'
                                : 'وصف الخدمة'
                }
                placeholderTextColor={theme.colors.textSecondary}
                textAlign="right"
                multiline
              />
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.hint}>
              {isPoolHourly
                ? 'الاسم والصور والوصف وسعة المسبح تُضبط من تفاصيل المنشأة. هنا تُضاف فترات الأسعار فقط.'
                : 'الاسم والصور والوصف وعدد اللاعبين وأبعاد الملعب تُضبط من تفاصيل المنشأة. هنا تُضاف فترات الأسعار فقط.'}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {isHourlyPeriods ? 'تفاصيل الأسعار' : 'الأسعار'}
          </Text>
          {isHourlyPeriods ? (
            <>
              <Text style={styles.hint}>
                {isPoolHourly
                  ? 'حدّد فترات المسبح وسعر الساعة لكل فترة. يظهر للعميل كبطاقة أسعار.'
                  : 'حدّد فترات الملعب وسعر الساعة لكل فترة. يظهر للعميل كبطاقة أسعار، ويُحسب الحجز حسب الفترة المختارة.'}
              </Text>
              {pricePeriods.map((p, index) => (
                <View key={p.id} style={styles.periodCard}>
                  <View style={styles.periodCardTop}>
                    <Text style={styles.periodCardTitle}>
                      {p.label || periodLabelForIndex(index)}
                    </Text>
                    {pricePeriods.length > 1 ? (
                      <Pressable onPress={() => removePeriod(p.id)} hitSlop={8}>
                        <Text style={styles.removePeriod}>حذف</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>اسم الفترة</Text>
                    <TextInput
                      style={styles.input}
                      value={p.label}
                      onChangeText={(v) => updatePeriod(p.id, { label: v })}
                      placeholder={periodLabelForIndex(index)}
                      placeholderTextColor={theme.colors.textSecondary}
                      textAlign="right"
                    />
                  </View>
                  <View style={styles.timeRow}>
                    <View style={[styles.field, styles.timeField]}>
                      <Text style={styles.label}>من</Text>
                      <TextInput
                        style={styles.input}
                        value={p.fromTime}
                        onChangeText={(v) =>
                          updatePeriod(p.id, { fromTime: normalizeTimeInput(v) })
                        }
                        placeholder="08:00"
                        placeholderTextColor={theme.colors.textSecondary}
                        keyboardType="number-pad"
                        maxLength={5}
                        textAlign="center"
                      />
                    </View>
                    <View style={[styles.field, styles.timeField]}>
                      <Text style={styles.label}>إلى</Text>
                      <TextInput
                        style={styles.input}
                        value={p.toTime}
                        onChangeText={(v) =>
                          updatePeriod(p.id, { toTime: normalizeTimeInput(v) })
                        }
                        placeholder="12:00"
                        placeholderTextColor={theme.colors.textSecondary}
                        keyboardType="number-pad"
                        maxLength={5}
                        textAlign="center"
                      />
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>السعر / ساعة (ريال جديد)</Text>
                    <TextInput
                      style={styles.input}
                      value={String(p.pricePerHour || '')}
                      onChangeText={(v) => {
                        const n = Number(String(v).replace(/[^\d]/g, ''));
                        updatePeriod(p.id, {
                          pricePerHour: Number.isFinite(n) ? n : 0,
                        });
                      }}
                      keyboardType="number-pad"
                      placeholder="5000"
                      placeholderTextColor={theme.colors.textSecondary}
                      textAlign="right"
                    />
                  </View>
                </View>
              ))}
              {pricePeriods.length < 6 ? (
                <Pressable style={styles.addPeriodBtn} onPress={addPeriod}>
                  <Text style={styles.addPeriodText}>+ إضافة فترة</Text>
                </Pressable>
              ) : null}
            </>
          ) : useMultiCurrency ? (
            <>
              <Text style={styles.hint}>
                {isTairamanHourly
                  ? 'أدخل سعر الساعة بكل العملات — يُضرب بعدد الساعات التي يختارها العميل.'
                  : isCatalogItem
                    ? 'أدخل سعر اليوم بكل العملات — يُضرب بعدد أيام التأجير.'
                    : 'أدخل السعر بكل العملات — يظهر للعميل حسب عملته المختارة.'}
              </Text>
              {PRICE_FIELDS.map(({ code, label, placeholder }) => (
                <View key={code} style={styles.field}>
                  <Text style={styles.label}>
                    {isTairamanHourly
                      ? `سعر الساعة — ${label}`
                      : isCatalogItem
                        ? `سعر اليوم — ${label}`
                        : label}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={prices[code]}
                    onChangeText={(v) => setPriceField(code, v)}
                    keyboardType="decimal-pad"
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.textSecondary}
                    textAlign="right"
                  />
                </View>
              ))}
            </>
          ) : (
            <View style={styles.field}>
              <Text style={styles.label}>السعر الأساسي (ريال جديد)</Text>
              <TextInput
                style={styles.input}
                value={basePrice}
                onChangeText={setBasePrice}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.colors.textSecondary}
                textAlign="right"
              />
            </View>
          )}
          <Text style={styles.meta}>
            العربون ثابت {DEPOSIT_PERCENTAGE}% لجميع{' '}
            {isHotel
              ? 'الغرف'
              : isChalet || isEventPackage || isPhotoPackage
                ? 'الباقات'
                : isHourlyPeriods
                  ? 'الحجوزات'
                  : isCatalogItem
                    ? isApparel
                      ? 'المنتجات'
                      : isTransport
                        ? 'المركبات'
                        : 'السيارات'
                    : 'الخدمات'}
          </Text>
        </View>

        {!isHourlyPeriods &&
        !isDayExclusivePackage &&
        !isGymMembership &&
        !isSalonPackage ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>التفاصيل</Text>
            {isChalet && !isTairaman ? (
              <Text style={styles.hint}>
                مواصفات الشاليه (الأشخاص، الحمامات، الغرف…) تؤخذ من تفاصيل
                المنشأة.
              </Text>
            ) : null}
            {isTairaman ? (
              <Text style={styles.hint}>
                {isTairamanHourly
                  ? 'العميل يختار يوماً ووقت الدخول والمغادرة — الإجمالي = سعر الساعة × عدد الساعات.'
                  : 'أدخل سعة الباقة والوقت من–إلى — تظهر كما هي في صفحة الطيرمان.'}
              </Text>
            ) : null}
            {isHall ? (
              <Text style={styles.hint}>
                أدخل اسم الباقة والسعة ووقت المناسبة — تظهر كما هي في صفحة الصالة.
              </Text>
            ) : null}
            {isArtist ? (
              <Text style={styles.hint}>
                أدخل وقت التواجد من–إلى — يظهر للعميل ويُقفل اليوم بعد دفع العربون.
              </Text>
            ) : null}
            {isHealthAppointment ? (
              <Text style={styles.hint}>
                مدة الخدمة تحدد طول الموعد في جدول الحجوزات.
              </Text>
            ) : null}
            {isCatalogItem ? (
              <Text style={styles.hint}>
                {isApparel
                  ? 'المقاس واللون يظهران للعميل في بطاقة المنتج. السعر لليوم الواحد.'
                  : 'المواصفات تظهر للعميل في بطاقة المنتج. السعر لليوم الواحد.'}
              </Text>
            ) : null}
            <View style={styles.steppers}>
              {isChalet && !isTairaman ? (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>فترة الباقة</Text>
                    <View style={styles.periodRow}>
                      {PERIOD_OPTIONS.map((opt) => {
                        const selected = period === opt.id;
                        return (
                          <Pressable
                            key={opt.id}
                            style={[styles.periodChip, selected && styles.periodChipOn]}
                            onPress={() => selectPeriod(opt.id)}
                          >
                            <Text
                              style={[
                                styles.periodChipText,
                                selected && styles.periodChipTextOn,
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {period === 'MORNING' || period === 'EVENING' ? (
                    <View style={styles.timeRow}>
                      <View style={[styles.field, styles.timeField]}>
                        <Text style={styles.label}>من الساعة</Text>
                        <TextInput
                          style={styles.input}
                          value={fromTime}
                          onChangeText={(v) => setFromTime(normalizeTimeInput(v))}
                          placeholder="08:00"
                          placeholderTextColor={theme.colors.textSecondary}
                          keyboardType="number-pad"
                          maxLength={5}
                          textAlign="center"
                        />
                      </View>
                      <View style={[styles.field, styles.timeField]}>
                        <Text style={styles.label}>إلى الساعة</Text>
                        <TextInput
                          style={styles.input}
                          value={toTime}
                          onChangeText={(v) => setToTime(normalizeTimeInput(v))}
                          placeholder="16:00"
                          placeholderTextColor={theme.colors.textSecondary}
                          keyboardType="number-pad"
                          maxLength={5}
                          textAlign="center"
                        />
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.meta}>
                      السعر لليلة واحدةحة. عند حجز ليلتين أو أكثر يُحسب السعر × عدد
                      الليالي. العميل يختار تاريخ الوصول والمغادرة عند الحجز.
                    </Text>
                  )}

                  <Text style={styles.meta}>
                    عدد الشاليهات المتاحة ({facilityInventory}) يُضبط من تفاصيل
                    المنشأة.
                  </Text>
                </>
              ) : isTairaman || isEventPackage ? (
                <>
                  {isTairaman ? (
                    <View style={styles.field}>
                      <Text style={styles.label}>نوع الحجز</Text>
                      <View style={styles.periodRow}>
                        {TAIRAMAN_PRICING_OPTIONS.map((opt) => {
                          const selected = tairamanPricingMode === opt.id;
                          return (
                            <Pressable
                              key={opt.id}
                              style={[
                                styles.periodChip,
                                selected && styles.periodChipOn,
                              ]}
                              onPress={() => setTairamanPricingMode(opt.id)}
                            >
                              <Text
                                style={[
                                  styles.periodChipText,
                                  selected && styles.periodChipTextOn,
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}
                  {(isHall || isTairaman) ? (
                    <QuantityStepper
                      label="السعة (أشخاص أو أقل)"
                      value={capacity}
                      onChange={setCapacity}
                      min={1}
                      maxLength={6}
                    />
                  ) : null}
                  {isTairaman ? (
                    <Text style={styles.meta}>
                      عدد الطيرمانات المتاحة ({facilityInventory}) يُضبط من
                      تفاصيل المنشأة.
                    </Text>
                  ) : null}
                  <View style={styles.timeRow}>
                    <View style={[styles.field, styles.timeField]}>
                      <Text style={styles.label}>
                        {isTairamanHourly ? 'من (ساعات العمل)' : 'من الساعة'}
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={fromTime}
                        onChangeText={(v) => setFromTime(normalizeTimeInput(v))}
                        placeholder="10:00"
                        placeholderTextColor={theme.colors.textSecondary}
                        keyboardType="number-pad"
                        maxLength={5}
                        textAlign="center"
                      />
                    </View>
                    <View style={[styles.field, styles.timeField]}>
                      <Text style={styles.label}>
                        {isTairamanHourly ? 'إلى (ساعات العمل)' : 'إلى الساعة'}
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={toTime}
                        onChangeText={(v) => setToTime(normalizeTimeInput(v))}
                        placeholder="21:00"
                        placeholderTextColor={theme.colors.textSecondary}
                        keyboardType="number-pad"
                        maxLength={5}
                        textAlign="center"
                      />
                    </View>
                  </View>
                  {isTairamanHourly ? (
                    <Text style={styles.meta}>
                      العميل يختار يوم الحجز ثم ساعات الدخول والمغادرة ضمن هذا
                      النطاق. الإجمالي = سعر الساعة × عدد الساعات.
                    </Text>
                  ) : null}
                </>
              ) : isHealthAppointment ? (
                <QuantityStepper
                  label="مدة الخدمة (دقيقة)"
                  value={slotMinutes}
                  onChange={setSlotMinutes}
                  min={5}
                />
              ) : isSalonPackage ? null : isCar || isTransport ? (
                <>
                  {isCar ? (
                    <View style={styles.field}>
                      <Text style={styles.label}>ماركة السيارة</Text>
                      <Pressable
                        style={styles.select}
                        onPress={() => setBrandPickerOpen(true)}
                      >
                        <Ionicons
                          name="chevron-down"
                          size={18}
                          color={theme.colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.selectValue,
                            !carBrand.trim() && styles.selectPlaceholder,
                          ]}
                          numberOfLines={1}
                        >
                          {carBrand.trim() || 'اختر الماركة'}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                  <QuantityStepper
                    label="عدد المقاعد"
                    value={seats}
                    onChange={setSeats}
                    min={1}
                  />
                  <View style={styles.field}>
                    <Text style={styles.label}>سنة الموديل</Text>
                    <TextInput
                      style={styles.input}
                      value={carYear}
                      onChangeText={setCarYear}
                      keyboardType="number-pad"
                      placeholder="2024"
                      placeholderTextColor={theme.colors.textSecondary}
                      textAlign="right"
                      maxLength={4}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>ناقل الحركة</Text>
                    <View style={styles.periodRow}>
                      {(
                        [
                          { id: 'AUTO' as const, label: 'أوتوماتيك' },
                          { id: 'MANUAL' as const, label: 'عادي' },
                        ] as const
                      ).map((opt) => {
                        const selected = transmission === opt.id;
                        return (
                          <Pressable
                            key={opt.id}
                            style={[styles.periodChip, selected && styles.periodChipOn]}
                            onPress={() => setTransmission(opt.id)}
                          >
                            <Text
                              style={[
                                styles.periodChipText,
                                selected && styles.periodChipTextOn,
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  <QuantityStepper
                    label={
                      isTransport
                        ? 'عدد المركبات من هذا النوع'
                        : 'عدد السيارات من هذا النوع'
                    }
                    value={inventory}
                    onChange={(n) => setInventory(Math.max(1, n ?? 1))}
                    min={1}
                  />
                  <DynamicLineList
                    label="وسائل الراحة"
                    hint={
                      isTransport
                        ? 'مثال: سائق، تكييف، تأمين'
                        : 'مثال: تأمين أساسي، تكييف، GPS'
                    }
                    items={productAmenities}
                    onChange={setProductAmenities}
                    placeholder="وسيلة راحة"
                    addLabel="إضافة"
                  />
                  <Text style={styles.meta}>السعر لليوم الواحد × أيام التأجير.</Text>
                </>
              ) : isApparel ? (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>المقاس</Text>
                    <TextInput
                      style={styles.input}
                      value={apparelSize}
                      onChangeText={setApparelSize}
                      placeholder="مثال: L أو 42"
                      placeholderTextColor={theme.colors.textSecondary}
                      textAlign="right"
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>اللون (اختياري)</Text>
                    <TextInput
                      style={styles.input}
                      value={apparelColor}
                      onChangeText={setApparelColor}
                      placeholder="مثال: أسود"
                      placeholderTextColor={theme.colors.textSecondary}
                      textAlign="right"
                    />
                  </View>
                  <QuantityStepper
                    label="الكمية المتاحة من هذا المنتج"
                    value={inventory}
                    onChange={(n) => setInventory(Math.max(1, n ?? 1))}
                    min={1}
                  />
                  <DynamicLineList
                    label="وسائل الراحة"
                    hint="مثال: تنظيف، تعديل مقاس"
                    items={productAmenities}
                    onChange={setProductAmenities}
                    placeholder="وسيلة راحة"
                    addLabel="إضافة"
                  />
                  <Text style={styles.meta}>السعر لليوم الواحد × أيام التأجير.</Text>
                </>
              ) : (
                <>
                  <QuantityStepper
                    label={isHotel ? 'الحد الأقصى للكبار (بدون الأطفال)' : 'السعة (أشخاص)'}
                    value={capacity}
                    onChange={setCapacity}
                    min={0}
                  />
                  {isHotel ? (
                    <QuantityStepper
                      label="الحد الأقصى للأطفال (لا يُحسب من سعة الكبار)"
                      value={maxChildren}
                      onChange={setMaxChildren}
                      min={0}
                    />
                  ) : null}
                  <QuantityStepper
                    label={isHotel ? 'عدد الأسرة' : 'غرف / وحدات'}
                    value={beds}
                    onChange={setBeds}
                    min={0}
                  />
                  <QuantityStepper
                    label={isHotel ? 'عدد الغرف من هذا النوع' : 'الكمية المتاحة يومياً'}
                    value={inventory}
                    onChange={(n) => setInventory(Math.max(1, n ?? 1))}
                    min={1}
                  />
                </>
              )}
            </View>
            <Text style={styles.meta}>
              {isHealthAppointment
                ? 'يُفتح جدول المواعيد تلقائياً لـ 14 يوماً القادمة'
                : `يُفتح التقويم تلقائياً لـ ${SEED_DAYS} يوماً القادمة`}
            </Text>
          </View>
        ) : isSalonPackage ? (
          <Text style={styles.meta}>
            يُفتح جدول المواعيد تلقائياً لـ 14 يوماً القادمة — حدّد ما تشمله الباقة أعلاه
          </Text>
        ) : isDayExclusivePackage || isGymMembership ? (
          <Text style={styles.meta}>
            {isGymMembership
              ? `يُفتح تقويم أيام البداية تلقائياً لـ ${SEED_DAYS} يوماً القادمة — العميل يختار يوم بداية الاشتراك`
              : isPoolDayPackage
                ? `يُفتح تقويم الأيام تلقائياً لـ ${SEED_DAYS} يوماً القادمة — العميل يختار يوماً واحداً لحجز المسبح كاملاً`
                : `يُفتح تقويم الأيام تلقائياً لـ ${SEED_DAYS} يوماً القادمة — العميل يختار يوماً واحداً`}
          </Text>
        ) : (
          <Text style={styles.meta}>
            يُفتح جدول الساعات تلقائياً لـ 14 يوماً القادمة
          </Text>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryBtn, saving && styles.btnDisabled]}
          disabled={saving}
          onPress={submit}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {isEdit ? 'حفظ التعديلات' : `إنشاء ${entityLabel}`}
            </Text>
          )}
        </Pressable>

        {isEdit ? (
          <Pressable
            style={styles.deleteBtn}
            onPress={() => {
              Alert.alert(`حذف ${entityLabel}`, 'هل أنت متأكد؟', [
                { text: 'إلغاء', style: 'cancel' },
                {
                  text: 'حذف',
                  style: 'destructive',
                  onPress: async () => {
                    if (!serviceId) return;
                    setSaving(true);
                    try {
                      await container.serviceApi.remove(serviceId);
                      navigation.goBack();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'تعذر الحذف');
                      setSaving(false);
                    }
                  },
                },
              ]);
            }}
          >
            <Text style={styles.deleteText}>حذف {entityLabel}</Text>
          </Pressable>
        ) : null}
      </KeyboardAwareScrollView>

      {isCar ? (
        <>
          <OptionPickerSheet
            visible={brandPickerOpen}
            title="ماركة السيارة"
            subtitle="اختر ماركة محفوظة أو أضف ماركة جديدة"
            options={carBrands.map((name) => ({ id: name, name }))}
            selectedId={carBrand.trim() || null}
            onClose={() => setBrandPickerOpen(false)}
            onSelect={(opt) => setCarBrand(String(opt.name))}
            actionLabel="+ إضافة ماركة جديدة"
            onAction={() => {
              setNewBrandDraft('');
              setAddingBrand(true);
            }}
          />

          <SmoothBottomSheet
            visible={addingBrand}
            onClose={() => {
              setAddingBrand(false);
              setNewBrandDraft('');
            }}
            sheetStyle={styles.brandSheet}
          >
            <Text style={styles.brandSheetTitle}>ماركة جديدة</Text>
            <Text style={styles.brandSheetHint}>
              تُحفظ الماركة وتظهر لاحقاً في قائمة الاختيار وفي تصفية السيارات.
            </Text>
            <TextInput
              style={styles.input}
              value={newBrandDraft}
              onChangeText={setNewBrandDraft}
              placeholder="مثال: تويوتا"
              placeholderTextColor={theme.colors.textSecondary}
              textAlign="right"
              autoFocus
            />
            <Pressable
              style={styles.brandSaveBtn}
              onPress={() => {
                const next = newBrandDraft.trim().replace(/\s+/g, ' ');
                if (!next) {
                  setError('أدخل اسم الماركة');
                  return;
                }
                setCarBrand(next);
                setCarBrands((prev) => {
                  if (
                    prev.some(
                      (b) => b.trim().toLowerCase() === next.toLowerCase(),
                    )
                  ) {
                    return prev;
                  }
                  return [...prev, next].sort((a, b) =>
                    a.localeCompare(b, 'ar'),
                  );
                });
                setAddingBrand(false);
                setNewBrandDraft('');
                setError(null);
              }}
            >
              <Text style={styles.brandSaveBtnText}>حفظ الماركة</Text>
            </Pressable>
          </SmoothBottomSheet>
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  scroll: { padding: 16, paddingBottom: 40, gap: 16 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    lineHeight: 18,
  },
  field: { gap: 8 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  meta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: theme.colors.text,
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  steppers: { gap: 12 },
  periodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#F7F9FC',
  },
  periodChipOn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  periodChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  periodChipTextOn: { color: '#fff' },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'right',
  },
  selectPlaceholder: {
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  brandSheet: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 12,
  },
  brandSheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
    width: '100%',
  },
  brandSheetHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
    width: '100%',
  },
  brandSaveBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  brandSaveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  periodCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    gap: 10,
  },
  periodCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  removePeriod: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.error,
  },
  addPeriodBtn: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addPeriodText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timeField: { flex: 1 },
  error: { color: theme.colors.error, textAlign: 'right', fontSize: 13 },
  primaryBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  btnDisabled: { opacity: 0.55 },
  deleteBtn: {
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDECEC',
  },
  deleteText: { color: theme.colors.error, fontWeight: '800', fontSize: 14 },
});
