import type { PricePeriod } from '../../core/common/pricePeriods';

export type { PricePeriod };

export type BookingType = 'SLOT' | 'UNIT_DAY' | 'EVENT_DAY' | 'QUANTITY';

export type AttendanceType =
  | 'عائلة (رجال ونساء)'
  | 'نساء'
  | 'شباب'
  | 'شركة'
  | 'مدرسة';

export const ATTENDANCE_OPTIONS: AttendanceType[] = [
  'عائلة (رجال ونساء)',
  'نساء',
  'شباب',
  'شركة',
  'مدرسة',
];

/** UI flow variant derived from marketplace category (specs 5.1–5.13). */
export type BookingFlowKind =
  | 'DAY_PERIOD' // halls, tairamanat, artists
  | 'STAY_RANGE' // chalets, hotels, cars
  | 'SLOT_TIME' // health, salon, photo
  | 'SLOT_DURATION' // pools, fields
  | 'QUANTITY_DELIVERY' // wedding supplies
  | 'TRANSPORT'; // transport trips

export type PackagePeriod = 'MORNING' | 'EVENING' | 'PER_NIGHT';

export type BookingDraftParams = {
  providerId: string;
  serviceId: string;
  providerName: string;
  serviceName: string;
  categoryName: string;
  bookingType: BookingType;
  price: number;
  depositPercentage: number;
  capacityLabel?: string;
  timeLabel?: string;
  image?: string;
  /** Max guests allowed per room/unit (from provider). Total = guestsPerRoom × rooms. */
  guestsPerRoom?: number;
  /** Max children allowed per room (hotels). Total = maxChildrenPerRoom × rooms. */
  maxChildrenPerRoom?: number;
  /** Chalet package period — drives single-day vs check-in/out range. */
  packagePeriod?: PackagePeriod;
  packageFromTime?: string;
  packageToTime?: string;
  /** Sports / playground hourly price bands. */
  pricePeriods?: PricePeriod[];
};

export type BookingCheckoutParams = BookingDraftParams & {
  availabilityId: string;
  /** When the customer picks several periods on the same day. */
  availabilityIds?: string[];
  bookingDate: string;
  startTime?: string | null;
  endTime?: string | null;
  quantity: number;
  attendanceType?: string;
  adults?: number;
  children?: number;
  packageTitle?: string;
  checkOutDate?: string;
  nights?: number;
  periodLabel?: string;
  durationHours?: number;
  rooms?: number;
  deliveryTime?: string;
  pickupPoint?: string;
  dropoffPoint?: string;
};

export type BookingFlowProfile = {
  kind: BookingFlowKind;
  bookingType: BookingType;
  title: string;
  question: string;
  hint: string;
  needsGuestStep: boolean;
  needsRooms: boolean;
  needsDuration: boolean;
  needsDeliveryTime: boolean;
  needsRoute: boolean;
  quantityLabel?: string;
  periodOptions?: string[];
  durationOptions?: number[];
};

export function resolveBookingType(
  categoryName?: string | null,
  bookingType?: BookingType | string | null,
): BookingType {
  return resolveBookingFlow(categoryName, bookingType).bookingType;
}

export function resolveBookingFlow(
  categoryName?: string | null,
  bookingType?: BookingType | string | null,
): BookingFlowProfile {
  const cat = categoryName ?? '';
  const type = (bookingType ?? '').toUpperCase() as BookingType | '';

  // Prefer DB booking_type when name is a child (e.g. قسم النساء)
  if (type === 'QUANTITY' || /مستلزم|ماء|زينة|كوش|حلو|كيك|هدايا|فل|ثلاج|خيم|طباخ|وجبات/i.test(cat)) {
    return {
      kind: 'QUANTITY_DELIVERY',
      bookingType: 'QUANTITY',
      title: 'حجز الكمية',
      question: 'كم الكمية التي تريد حجزها؟',
      hint: 'حدد الكمية ثم تاريخ المناسبة ووقت التجهيز/التسليم.',
      needsGuestStep: false,
      needsRooms: false,
      needsDuration: false,
      needsDeliveryTime: true,
      needsRoute: false,
      quantityLabel: 'الكمية المطلوبة',
    };
  }

  if (/نقل/i.test(cat)) {
    return {
      kind: 'TRANSPORT',
      bookingType: 'SLOT',
      title: 'حجز النقل',
      question: 'حدد موعد الرحلة وعدد المقاعد',
      hint: 'اختر التاريخ والوقت، ثم أدخل نقاط الانطلاق والوصول وعدد المقاعد.',
      needsGuestStep: false,
      needsRooms: false,
      needsDuration: false,
      needsDeliveryTime: false,
      needsRoute: true,
      quantityLabel: 'عدد المقاعد / المركبات',
    };
  }

  if (/ملاعب|ملعب|كرة|بادل|رياض|padel|football|sport/i.test(cat)) {
    return {
      kind: 'SLOT_DURATION',
      bookingType: 'SLOT',
      title: /كرة/i.test(cat) ? 'حجز كرة قدم' : 'حجز الملعب',
      question: 'اختر اليوم ومدة الحجز',
      hint: 'حدد اليوم ثم وقت البدء والمدة بالساعات. الأيام غير المتاحة تظهر مشطوبة.',
      needsGuestStep: false,
      needsRooms: false,
      needsDuration: true,
      needsDeliveryTime: false,
      needsRoute: false,
      durationOptions: [1, 2, 3],
    };
  }

  if (/مسبح|نادي/i.test(cat)) {
    return {
      kind: 'SLOT_DURATION',
      bookingType: 'SLOT',
      title: 'حجز الوقت',
      question: 'اختر التاريخ ومدة الدخول',
      hint: 'حدد نوع المدة (ساعة / نصف يوم) بعد اختيار اليوم والوقت المتاح.',
      needsGuestStep: false,
      needsRooms: false,
      needsDuration: true,
      needsDeliveryTime: false,
      needsRoute: false,
      durationOptions: [1, 2, 4],
    };
  }

  if (/صح|عياد|مستشفى|أشعة|علاج/i.test(cat)) {
    return {
      kind: 'SLOT_TIME',
      bookingType: 'SLOT',
      title: 'حجز الموعد',
      question: 'اختر اليوم والموعد المناسب',
      hint: 'اختر يوماً ثم حدد الموعد المتاح من شبكة الأوقات. الأيام غير المتاحة تظهر مشطوبة.',
      needsGuestStep: false,
      needsRooms: false,
      needsDuration: false,
      needsDeliveryTime: false,
      needsRoute: false,
    };
  }

  if (/كوافير|حلاق|تجميل/i.test(cat)) {
    return {
      kind: 'SLOT_TIME',
      bookingType: 'SLOT',
      title: 'حجز الموعد',
      question: 'اختر اليوم والوقت المناسب',
      hint: 'اختر التاريخ ثم الموعد حسب جدول الأخصائي ومدة الخدمة.',
      needsGuestStep: false,
      needsRooms: false,
      needsDuration: false,
      needsDeliveryTime: false,
      needsRoute: false,
    };
  }

  if (/تصوير/i.test(cat)) {
    return {
      kind: 'SLOT_TIME',
      bookingType: 'SLOT',
      title: 'حجز جلسة التصوير',
      question: 'اختر اليوم والوقت المناسب',
      hint: 'اختر يوماً ثم حدد الموعد المتاح. الأيام غير المتاحة تظهر مشطوبة.',
      needsGuestStep: false,
      needsRooms: false,
      needsDuration: false,
      needsDeliveryTime: false,
      needsRoute: false,
    };
  }

  if (/زفاف|فنان/i.test(cat)) {
    return {
      kind: 'DAY_PERIOD',
      bookingType: 'EVENT_DAY',
      title: 'حجز الفنان',
      question: 'في أي يوم تريد الحفل؟',
      hint: 'حدد تاريخ المناسبة وفترة التواجد. التاريخ يُقفل حصرياً بعد دفع العربون.',
      needsGuestStep: true,
      needsRooms: false,
      needsDuration: false,
      needsDeliveryTime: false,
      needsRoute: false,
      periodOptions: ['فترة صباحية', 'فترة مسائية', 'يوم كامل'],
    };
  }

  if (/صالة|قاعة|صالات|قاعات/i.test(cat)) {
    return {
      kind: 'DAY_PERIOD',
      bookingType: 'EVENT_DAY',
      title: 'حجز الصالات',
      question: 'في أي يوم تريد المناسبة؟',
      hint: 'اختر يوماً متاحاً — وقت الباقة يحدده مزود الخدمة في تفاصيل الباقة.',
      needsGuestStep: true,
      needsRooms: false,
      needsDuration: false,
      needsDeliveryTime: false,
      needsRoute: false,
    };
  }

  // طيرمانات / طرمانات use the same stay booking flow as chalets (below).

  if (/فنادق|فندق|غرف|hotel/i.test(cat)) {
    return {
      kind: 'STAY_RANGE',
      bookingType: 'UNIT_DAY',
      title: 'حجز الفنادق',
      question: 'حدد تاريخ الدخول والخروج',
      hint: 'اضغط يوم الدخول ثم يوم الخروج. يتم فحص التوفر لكل ليالي الإقامة.',
      needsGuestStep: true,
      needsRooms: true,
      needsDuration: false,
      needsDeliveryTime: false,
      needsRoute: false,
      quantityLabel: 'عدد الغرف',
    };
  }

  if (/سيارة|سيارات/i.test(cat)) {
    return {
      kind: 'STAY_RANGE',
      bookingType: 'UNIT_DAY',
      title: 'حجز السيارة',
      question: 'حدد تاريخ الاستلام والإرجاع',
      hint: 'اختر يوم الاستلام ثم يوم الإرجاع. يتم التحقق من عدم تداخل الحجوزات.',
      needsGuestStep: false,
      needsRooms: false,
      needsDuration: false,
      needsDeliveryTime: false,
      needsRoute: false,
    };
  }

  // Child categories (قسم النساء / عيادات…) — use DB booking_type
  if (type === 'SLOT') {
    return {
      kind: 'SLOT_TIME',
      bookingType: 'SLOT',
      title: `حجز ${cat || 'الموعد'}`,
      question: 'اختر اليوم والموعد المناسب',
      hint: 'اختر يوماً ثم حدد الموعد المتاح من قائمة الأوقات.',
      needsGuestStep: false,
      needsRooms: false,
      needsDuration: false,
      needsDeliveryTime: false,
      needsRoute: false,
    };
  }

  if (type === 'EVENT_DAY') {
    return {
      kind: 'DAY_PERIOD',
      bookingType: 'EVENT_DAY',
      title: `حجز ${cat || 'المناسبة'}`,
      question: 'في أي يوم تريد المناسبة؟',
      hint: 'اختر التاريخ ثم الفترة المتاحة.',
      needsGuestStep: true,
      needsRooms: false,
      needsDuration: false,
      needsDeliveryTime: false,
      needsRoute: false,
      periodOptions: ['فترة صباحية', 'فترة مسائية', 'يوم كامل'],
    };
  }

  if (type === 'QUANTITY') {
    return {
      kind: 'QUANTITY_DELIVERY',
      bookingType: 'QUANTITY',
      title: 'حجز الكمية',
      question: 'كم الكمية التي تريد حجزها؟',
      hint: 'حدد الكمية ثم تاريخ المناسبة ووقت التجهيز/التسليم.',
      needsGuestStep: false,
      needsRooms: false,
      needsDuration: false,
      needsDeliveryTime: true,
      needsRoute: false,
      quantityLabel: 'الكمية المطلوبة',
    };
  }

  // Default: chalets / residential units (UNIT_DAY)
  return {
    kind: 'STAY_RANGE',
    bookingType: 'UNIT_DAY',
    title: /طيرمان|طرمان/i.test(cat)
      ? 'حجز الطيرمانات'
      : /شالي/i.test(cat)
        ? 'حجز الشاليهات'
        : `حجز ${cat || 'الخدمة'}`,
    question: 'حدد تاريخ الوصول والمغادرة',
    hint: 'اضغط يوم الوصول ثم يوم المغادرة. الأيام غير المتاحة تظهر مشطوبة.',
    needsGuestStep: true,
    needsRooms: false,
    needsDuration: false,
    needsDeliveryTime: false,
    needsRoute: false,
  };
}

export function needsGuestStep(bookingType: BookingType, categoryName?: string): boolean {
  return resolveBookingFlow(categoryName).needsGuestStep;
}

export function bookingTitle(categoryName?: string): string {
  return resolveBookingFlow(categoryName).title;
}

export function formatArabicDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  // Arabic month names with Western digits (1,2,3) — not ١٢٣
  return d.toLocaleDateString('ar-EG-u-nu-latn', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function toIsoDate(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T12:00:00`).getTime();
  const b = new Date(`${checkOut}T12:00:00`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/** Stay nights for pricing: [from, toExclusive). */
export function eachIsoDate(from: string, toExclusive: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (cur < toExclusive) {
    out.push(cur);
    cur = addDaysIso(cur, 1);
  }
  return out;
}

/** Capacity lock span: check-in through check-out inclusive. */
export function eachBlockedIsoDate(from: string, toInclusive: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (cur <= toInclusive) {
    out.push(cur);
    cur = addDaysIso(cur, 1);
  }
  return out;
}

/** Provider-defined max guests for one room/unit. */
export function guestsPerUnit(
  attributes?: Record<string, unknown> | null,
): number | undefined {
  const raw = attributes?.maxGuests ?? attributes?.capacity ?? attributes?.guests;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.floor(n);
}

/** Provider-defined max children for one hotel room. */
export function childrenPerUnit(
  attributes?: Record<string, unknown> | null,
): number | undefined {
  const raw = attributes?.maxChildren ?? attributes?.childrenCapacity;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.floor(n);
}

export function packagePeriodLabel(period?: PackagePeriod | null): string | undefined {
  if (period === 'MORNING') return 'فترة صباحية';
  if (period === 'EVENING') return 'فترة مسائية';
  if (period === 'PER_NIGHT') return 'حجز بالليلة';
  return undefined;
}

export function readPackagePeriod(
  attributes?: Record<string, unknown> | null,
): PackagePeriod | undefined {
  const p = attributes?.period;
  if (p === 'MORNING' || p === 'EVENING' || p === 'PER_NIGHT') return p;
  return undefined;
}

export function periodLabelForSlot(startTime?: string | null, endTime?: string | null): string {
  if (!startTime) return 'يوم كامل';
  const h = Number(String(startTime).slice(0, 2));
  if (!Number.isFinite(h)) return `${String(startTime).slice(0, 5)}`;
  if (h < 12) return 'فترة صباحية';
  if (h < 17) return 'فترة مسائية';
  return 'فترة ليلية';
}

export type ServiceAvailability = {
  id: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  availableCapacity: number;
  totalCapacity: number;
  customPrice?: number | null;
  status?: string;
};
