import { Ionicons } from '@expo/vector-icons';
import { Provider, ServiceItem } from '../../../domain/model/Provider';

/** Brand colors from the Hadjzi logo (navy + gold). */
export const DETAIL = {
  teal: '#0D1B3E',
  tealDark: '#162C5B',
  accent: '#C5A368',
  text: '#0D1B3E',
  muted: '#5C6B7A',
  line: '#E8EDF5',
  border: '#D8E2EA',
  chipBg: '#FFFFFF',
  pageBg: '#F0F4F8',
  star: '#C5A368',
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
};

export type DetailModel = {
  categoryLabel: string;
  aboutTitle: string;
  ctaLabel: string;
  show360: boolean;
  showFeatureChips: boolean;
  showSpaces: boolean;
  showAmenities: boolean;
  showAddress: boolean;
  showDeposit: boolean;
  showInsurance: boolean;
  showTerms: boolean;
  showPackages: boolean;
  featureChips: FeatureChip[];
  spaces: IconRow[];
  amenities: IconRow[];
  packages: PricePackage[];
  depositAmount?: number;
  depositNote: string;
  insuranceAmount?: number;
  insuranceNote: string;
  insuranceMeta?: string;
  terms: string[];
  aboutText: string;
};

function num(attrs: Record<string, unknown>, key: string): number | undefined {
  const v = attrs[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function strList(attrs: Record<string, unknown>, key: string): string[] {
  const v = attrs[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function isStay(cat: string): boolean {
  return /شالي|فندق|طيرمان|شقق|صالة|قاعة|إقام|استراح/i.test(cat);
}
function isHealth(cat: string): boolean {
  return /صح|عياد|مستشفى|طبي|أشعة|علاج|أسنان|جلد/i.test(cat);
}
function isSport(cat: string): boolean {
  return /ملعب|مسبح|نادي|كرة|بادل|رياض/i.test(cat);
}
function isSalon(cat: string): boolean {
  return /كوافير|حلاق|تجميل/i.test(cat);
}
function isEventSupply(cat: string): boolean {
  return /مستلزم|ماء|زينة|كوش|حلو|كيك|هدايا|فل|ثلاج|خيم|طباخ/i.test(cat);
}

export function buildDetailModel(provider: Provider, service?: ServiceItem | null): DetailModel {
  const cat = provider.categoryName ?? provider.category?.name ?? 'خدمة';
  const attrs = (service?.attributes ?? {}) as Record<string, unknown>;
  const price = service?.priceFrom ?? service?.basePrice ?? 0;
  const depositPct = 30;
  const depositAmount = price ? Math.round((price * depositPct) / 100) : undefined;

  const stay = isStay(cat);
  const health = isHealth(cat);
  const sport = isSport(cat);
  const salon = isSalon(cat);
  const supply = isEventSupply(cat);

  const bathrooms = num(attrs, 'bathrooms') ?? (stay ? 4 : undefined);
  const bedrooms = num(attrs, 'rooms') ?? num(attrs, 'bedrooms') ?? (stay ? 2 : undefined);
  const majlis = num(attrs, 'majlis') ?? (stay ? 1 : undefined);
  const capacity = num(attrs, 'capacity') ?? num(attrs, 'guests') ?? num(attrs, 'players');
  const slotMinutes = num(attrs, 'slotMinutes') ?? num(attrs, 'durationMinutes');

  const featureChips: FeatureChip[] = [];
  if (bathrooms != null) {
    featureChips.push({ key: 'bath', icon: 'water-outline', label: `${bathrooms} حمامات` });
  }
  if (bedrooms != null) {
    featureChips.push({ key: 'bed', icon: 'bed-outline', label: `${bedrooms} غرف نوم` });
  }
  if (majlis != null) {
    featureChips.push({ key: 'majlis', icon: 'home-outline', label: `${majlis} مجالس` });
  }
  if (health && slotMinutes != null) {
    featureChips.push({
      key: 'slot',
      icon: 'time-outline',
      label: `${slotMinutes} دقيقة`,
    });
  }
  if (sport && capacity != null) {
    featureChips.push({
      key: 'players',
      icon: 'people-outline',
      label: `حتى ${capacity} لاعب`,
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

  const defaultSpaces: IconRow[] = stay
    ? [
        { key: 'steam', icon: 'flame-outline', label: 'استيم' },
        { key: 'sauna', icon: 'thermometer-outline', label: 'ساونا' },
        { key: 'cinema', icon: 'film-outline', label: 'سينما' },
        { key: 'pool', icon: 'water-outline', label: 'مسبح كبار' },
      ]
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

  const defaultAmenities: IconRow[] = stay
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
    if (inc === 'sound') {
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
          icon: 'checkmark-circle-outline' as const,
          label,
        }))
      : defaultSpaces;

  const amenities: IconRow[] =
    amenitiesFromAttr.length > 0
      ? amenitiesFromAttr.map((label, i) => ({
          key: `a${i}`,
          icon: 'checkmark-circle-outline' as const,
          label,
        }))
      : defaultAmenities;

  const packages: PricePackage[] = (provider.services ?? []).map((s) => ({
    id: s.id,
    title: s.name,
    price: s.priceFrom ?? s.basePrice ?? 0,
    capacityLabel:
      num(s.attributes ?? {}, 'capacity') != null || num(s.attributes ?? {}, 'guests') != null
        ? `${num(s.attributes ?? {}, 'capacity') ?? num(s.attributes ?? {}, 'guests')} أشخاص أو أقل`
        : undefined,
    timeLabel:
      num(s.attributes ?? {}, 'hours') != null
        ? `مدة ${num(s.attributes ?? {}, 'hours')} ساعات`
        : num(s.attributes ?? {}, 'slotMinutes') != null
          ? `${num(s.attributes ?? {}, 'slotMinutes')} دقيقة`
          : undefined,
  }));

  let ctaLabel = 'استعراض الأيام المتفرغة';
  if (health || salon) ctaLabel = 'اختيار الموعد';
  if (sport) ctaLabel = 'اختيار الوقت والمدة';
  if (supply) ctaLabel = 'تحديد الكمية';

  let aboutTitle = `عن ${cat}`;
  if (stay && /شالي/i.test(cat)) aboutTitle = 'عن الشاليهات';

  const aboutText =
    service?.description ||
    provider.description ||
    `استمتع بتجربة مميزة مع ${provider.businessName} ضمن تصنيف ${cat}. الحجز سهل وسريع عبر تطبيق حجزي.`;

  return {
    categoryLabel: cat,
    aboutTitle,
    ctaLabel,
    show360: stay,
    showFeatureChips: featureChips.length > 0,
    showSpaces: spaces.length > 0 && (stay || sport),
    showAmenities: amenities.length > 0,
    showAddress: true,
    showDeposit: stay || supply || Boolean(depositAmount),
    showInsurance: stay,
    showTerms: stay || /صالة|قاعة|زفاف|فنان/i.test(cat),
    showPackages: packages.length > 0,
    featureChips,
    spaces,
    amenities,
    packages,
    depositAmount,
    depositNote: stay
      ? 'سياسة الشاليهات: مبلغ العربون لا يرجع مطلقاً'
      : `عربون ${depositPct}% من قيمة الحجز`,
    insuranceAmount: price ? Math.round(price * 0.1) : undefined,
    insuranceMeta: 'قطعة ذهب',
    insuranceNote:
      'يدفع مبلغ التأمين للإدارة عند الوصول ويُسترجع بعد انتهاء الحجز بشرط سلامة الممتلكات حسب سياسة المنشأة.',
    terms: [
      'يمنع الدخول بالسلاح',
      'الالتزام بنظافة الأثاث قبل المغادرة',
      'يُطلب إحضار عقد الزواج وبطاقات الهوية للأزواج بدون أطفال',
    ],
    aboutText,
  };
}
