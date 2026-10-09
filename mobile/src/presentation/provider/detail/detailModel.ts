import { Ionicons } from '@expo/vector-icons';
import {
  parsePricePeriods,
  type PricePeriod,
} from '../../../core/common/pricePeriods';
import { Provider, ServiceItem } from '../../../domain/model/Provider';
import { colors } from '../../../core/ui/theme/colors';

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
};

export type IconRow = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

export type PricePackage = {
  id: string;
  title: string;
  price: number;
  capacityLabel?: string;
  timeLabel?: string;
  period?: 'MORNING' | 'EVENING' | 'PER_NIGHT';
  fromTime?: string;
  toTime?: string;
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

function isHotel(cat: string): boolean {
  // Singular فندق and plural فنادق / الفنادق (ا after ن)
  return /فنادق|فندق|hotel/i.test(cat);
}
function isHall(cat: string): boolean {
  return /صالة|قاعة|صالات|قاعات|hall|wedding|زفاف/i.test(cat);
}
function isTairaman(cat: string): boolean {
  return /طيرمان|طرمان|tairaman/i.test(cat);
}
/** Chalets and tairamanat share the same facility + detail layout. */
function isChalet(cat: string): boolean {
  return /شالي|chalet/i.test(cat) || isTairaman(cat);
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
  return /صح|عياد|مستشفى|طبي|أشعة|علاج|أسنان|جلد/i.test(cat);
}
function isSport(cat: string): boolean {
  return /ملاعب|ملعب|مسبح|نادي|كرة|بادل|رياض/i.test(cat);
}
function isSalon(cat: string): boolean {
  return /كوافير|حلاق|تجميل/i.test(cat);
}
function isEventSupply(cat: string): boolean {
  return /مستلزم|ماء|زينة|كوش|حلو|كيك|هدايا|فل|ثلاج|خيم|طباخ/i.test(cat);
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

export function buildDetailModel(provider: Provider, service?: ServiceItem | null): DetailModel {
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

  const hotel = isHotel(cat);
  const hall = isHall(cat);
  const chalet = isChalet(cat);
  const stay = isStay(cat);
  const health = isHealth(cat);
  const sport = isSport(cat);
  const salon = isSalon(cat);
  const supply = isEventSupply(cat);

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
    featureChips.push({ key: 'bath', icon: 'water-outline', label: `${bathrooms} حمامات` });
  }
  if (chalet && bedrooms != null) {
    featureChips.push({ key: 'bed', icon: 'bed-outline', label: `${bedrooms} غرف نوم` });
  }
  if (chalet && majlis != null) {
    featureChips.push({ key: 'majlis', icon: 'home-outline', label: `${majlis} مجالس` });
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
  if (sport && fieldLength != null && fieldWidth != null) {
    featureChips.push({
      key: 'fieldSize',
      icon: 'resize-outline',
      label: `${fieldLength} × ${fieldWidth} متر مربع`,
    });
  }
  if (supply) {
    featureChips.push({ key: 'qty', icon: 'cube-outline', label: 'حجز بالكمية' });
  }
  if (salon) {
    featureChips.push({ key: 'salon', icon: 'cut-outline', label: 'موعد مسبق' });
  }

  const spacesFromAttr = strList(attrs, 'spaces');
  const amenitiesFromAttr = strList(attrs, 'amenities');
  const includes = strList(attrs, 'includes');
  const customTerms = strList(attrs, 'terms');
  const customPolicy = strList(attrs, 'policyBullets');
  const customDepositNote =
    typeof attrs.depositNote === 'string' ? attrs.depositNote.trim() : '';

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
        : health
          ? [
              { key: 'doc', icon: 'medkit-outline', label: 'كشف طبي' },
              { key: 'lab', icon: 'flask-outline', label: 'تحاليل' },
            ]
          : sport
            ? [
                { key: 'lights', icon: 'bulb-outline', label: 'إضاءة' },
                { key: 'balls', icon: 'football-outline', label: 'كرات' },
              ]
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
        }))
      : defaultSpaces;

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
    let timeLabel: string | undefined;
    const from =
      typeof a.fromTime === 'string' ? String(a.fromTime).slice(0, 5) : undefined;
    const to =
      typeof a.toTime === 'string' ? String(a.toTime).slice(0, 5) : undefined;
    // Card title matches mock: period name for day packages
    const displayTitle =
      period === 'MORNING'
        ? 'الفترة الصباحية'
        : period === 'EVENING'
          ? 'الفترة المسائية'
          : period === 'PER_NIGHT'
            ? s.name?.trim() || 'حجز بالليلة'
            : s.name?.trim() || 'باقة';
    if (period === 'PER_NIGHT') {
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
    } else if (num(a, 'slotMinutes') != null) {
      timeLabel = `${num(a, 'slotMinutes')} دقيقة`;
    }

    return {
      id: s.id,
      title: displayTitle,
      price: s.priceFrom ?? s.basePrice ?? 0,
      capacityLabel: guests != null ? `${guests} أشخاص أو أقل` : undefined,
      timeLabel,
      period:
        period === 'MORNING' || period === 'EVENING' || period === 'PER_NIGHT'
          ? period
          : undefined,
      fromTime: from,
      toTime: to,
    };
  });

  let ctaLabel = 'استعراض الأيام المتفرغة';
  if (hotel) ctaLabel = 'استعراض الغرف';
  else if (health || salon) ctaLabel = 'اختيار الموعد';
  else if (sport) ctaLabel = 'اختيار الوقت والمدة';
  else if (supply) ctaLabel = 'تحديد الكمية';

  let aboutTitle = `عن ${cat}`;
  if (hotel) aboutTitle = 'عن الفنادق';
  else if (isTairaman(cat)) aboutTitle = 'عن الطيرمانات';
  else if (chalet) aboutTitle = 'عن الشاليهات';
  else if (hall) aboutTitle = 'عن القاعات';
  else if (sport) aboutTitle = 'عن الملعب';

  const aboutText =
    (hotel || hall ? provider.description : null) ||
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
            : `عربون ${depositPct}% من قيمة الحجز`);

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
    showSpaces: spaces.length > 0 && (stay || sport),
    showAmenities: amenities.length > 0,
    showAddress: true,
    showRatingBanner: true,
    showDeposit: stay || supply || Boolean(depositAmount),
    showInsurance: (chalet || hall) && insuranceAmount != null,
    showTerms: stay || hall,
    // Sports with period bands use the ticket UI instead of package cards.
    showPackages: packages.length > 0 && !hotel && !(sport && pricePeriods.length > 0),
    showPricePeriods: sport && pricePeriods.length > 0,
    pricePeriods,
    featureChips,
    spaces,
    amenities,
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
            : [],
    policyBullets: customPolicy.length
      ? customPolicy
      : hotel
        ? hotelPolicyBullets
        : [],
    aboutText,
  };
}
