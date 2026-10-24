/**
 * Shared category detectors + default facility copy for provider forms / detail.
 * Keep roots + common Arabic synonyms in sync with bookingFlow + categoryIcons.
 */

export type FacilityKind =
  | 'hotel'
  | 'chalet'
  | 'tairaman'
  | 'hall'
  | 'sport'
  | 'pool'
  | 'gym'
  | 'health'
  | 'salon'
  | 'car'
  | 'transport'
  | 'apparel'
  | 'artist'
  | 'photo'
  | 'supply'
  | 'other';

/** Cars / transport / apparel — facility shop + item packages, listed as catalog products. */
export function isEcommerceCatalogCategory(name?: string | null) {
  return (
    isCarCategory(name) ||
    isTransportCategory(name) ||
    isApparelCategory(name)
  );
}

export function isHotelCategory(name?: string | null) {
  return /فنادق|فندق|hotel/i.test(name ?? '');
}

export function isTairamanCategory(name?: string | null) {
  return /طيرمان|طرمان|tairaman/i.test(name ?? '');
}

export function isChaletCategory(name?: string | null) {
  return /شالي|chalet/i.test(name ?? '') || isTairamanCategory(name);
}

export function isHallCategory(name?: string | null) {
  // Halls only — artists/weddings performers are separate (isArtistCategory).
  return /صالة|قاعة|صالات|قاعات|hall/i.test(name ?? '');
}

/** Football / padel fields — not swimming pools or gyms. */
export function isSportCategory(name?: string | null) {
  return /ملاعب|ملعب|كرة|بادل|padel|football/i.test(name ?? '');
}

/** Swimming pools only — gyms/clubs are `isGymCategory`. */
export function isPoolCategory(name?: string | null) {
  return /مسبح|مسابح|pool/i.test(name ?? '');
}

/** Gyms / sport clubs — membership by days or months. */
export function isGymCategory(name?: string | null) {
  return /نوادي|نادي|gym|fitness|club/i.test(name ?? '');
}

export function isHealthCategory(name?: string | null) {
  return /صح|عياد|مستشفى|طبي|أشعة|علاج|أسنان|جلد|clinic|hospital/i.test(
    name ?? '',
  );
}

export function isSalonCategory(name?: string | null) {
  return /كوافير|حلاق|تجميل|صالون|حلاقة|salon|barber/i.test(name ?? '');
}

export function isCarCategory(name?: string | null) {
  return /سيارة|سيارات|car/i.test(name ?? '');
}

export function isTransportCategory(name?: string | null) {
  return /نقل|نقليات|transport|باص|حافلة/i.test(name ?? '');
}

export function isApparelCategory(name?: string | null) {
  return /ملبوس|ملابس|أزياء|فساتين|apparel|clothing|fashion/i.test(
    name ?? '',
  );
}

/** Singers, wedding performers, bands — not halls. */
export function isArtistCategory(name?: string | null) {
  return /زفافين|فنان|مغن|زفة|فرق|مبرع|رقاص|singer|artist/i.test(name ?? '');
}

export function isPhotoCategory(name?: string | null) {
  return /تصوير|camera|photo/i.test(name ?? '');
}

export function isSupplyCategory(name?: string | null) {
  return /مستلزم|ماء|زينة|كوش|حلو|كيك|هدايا|فل|ثلاج|خيم|طباخ|وجبات/i.test(
    name ?? '',
  );
}

export function matchAny(
  checkers: Array<(n?: string | null) => boolean>,
  ...names: Array<string | null | undefined>
): boolean {
  return names.some((n) => checkers.some((fn) => fn(n)));
}

export function resolveFacilityKind(
  ...names: Array<string | null | undefined>
): FacilityKind {
  const n = names.find(Boolean) ?? '';
  if (isHotelCategory(n) || names.some(isHotelCategory)) return 'hotel';
  if (isTairamanCategory(n) || names.some(isTairamanCategory)) return 'tairaman';
  if (isChaletCategory(n) || names.some(isChaletCategory)) return 'chalet';
  if (isHallCategory(n) || names.some(isHallCategory)) return 'hall';
  // Gym before pool/sport so «نادي» is not treated as a pool or field.
  if (isGymCategory(n) || names.some(isGymCategory)) return 'gym';
  if (isPoolCategory(n) || names.some(isPoolCategory)) return 'pool';
  if (isSportCategory(n) || names.some(isSportCategory)) return 'sport';
  if (isHealthCategory(n) || names.some(isHealthCategory)) return 'health';
  if (isSalonCategory(n) || names.some(isSalonCategory)) return 'salon';
  if (isTransportCategory(n) || names.some(isTransportCategory)) return 'transport';
  if (isApparelCategory(n) || names.some(isApparelCategory)) return 'apparel';
  if (isCarCategory(n) || names.some(isCarCategory)) return 'car';
  if (isArtistCategory(n) || names.some(isArtistCategory)) return 'artist';
  if (isPhotoCategory(n) || names.some(isPhotoCategory)) return 'photo';
  if (isSupplyCategory(n) || names.some(isSupplyCategory)) return 'supply';
  return 'other';
}

export const SERVICE_FACILITY_DEFAULTS: Record<
  Exclude<
    FacilityKind,
    'hotel' | 'chalet' | 'tairaman' | 'hall' | 'sport' | 'other'
  >,
  {
    spaces: string[];
    amenities: string[];
    terms: string[];
    depositNote: string;
    label: string;
  }
> = {
  pool: {
    spaces: ['غرف تبديل', 'دشات', 'موقف سيارات'],
    amenities: ['منقذ', 'كراسي استراحة', 'واي فاي'],
    terms: [
      'الالتزام بتعليمات المنقذ وإرشادات السلامة.',
      'يمنع الدخول بدون ملابس سباحة مناسبة.',
    ],
    depositNote: 'سياسة المسابح: مبلغ العربون لا يرجع عند الإلغاء في نفس اليوم.',
    label: 'المسبح',
  },
  gym: {
    spaces: ['صالة أوزان', 'غرف تبديل', 'موقف سيارات'],
    amenities: ['مدرب', 'تكييف', 'واي فاي', 'دشات'],
    terms: [
      'الالتزام بتعليمات النادي وقواعد السلامة.',
      'الاشتراك شخصي ولا يُحوَّل لشخص آخر إلا بموافقة النادي.',
    ],
    depositNote: 'سياسة النوادي: العربون يُخصم من قيمة الاشتراك.',
    label: 'النادي الرياضي',
  },
  health: {
    spaces: ['غرفة انتظار', 'مواقف'],
    amenities: ['تكييف', 'واي فاي', 'صيدلية قريبة'],
    terms: [
      'الالتزام بموعد الحجز أو الإبلاغ قبل ساعتين على الأقل.',
      'إحضار التقارير والهوية عند الحاجة.',
    ],
    depositNote: 'سياسة المواعيد: العربون يُخصم من قيمة الكشف.',
    label: 'المنشأة الصحية',
  },
  salon: {
    spaces: ['منطقة انتظار'],
    amenities: ['تكييف', 'واي فاي', 'مواقف'],
    terms: [
      'التأخر أكثر من 15 دقيقة قد يلغي الموعد.',
      'الرجاء إبلاغنا بأي حساسية قبل الجلسة.',
    ],
    depositNote: 'سياسة الصالون: العربون لا يُسترجع عند الإلغاء في نفس اليوم.',
    label: 'الصالون / الحلاقة',
  },
  car: {
    spaces: ['مواقف التسليم'],
    amenities: ['تأمين أساسي', 'تكييف', 'GPS'],
    terms: [
      'تسليم السيارة بنفس مستوى النظافة والوقود.',
      'أي مخالفة مرورية على مسؤولية المستأجر.',
    ],
    depositNote: 'سياسة التأجير: مبلغ التأمين/العربون يُسترجع بعد فحص السيارة.',
    label: 'تأجير السيارات',
  },
  transport: {
    spaces: ['مواقف التسليم'],
    amenities: ['سائق محترف', 'تكييف', 'تأمين'],
    terms: [
      'الالتزام بمواعيد الاستلام والإرجاع المتفق عليها.',
      'أي مخالفة مرورية على مسؤولية المستأجر إن كان بدون سائق.',
    ],
    depositNote: 'سياسة النقليات: مبلغ العربون يُسترجع بعد انتهاء مدة التأجير.',
    label: 'النقليات',
  },
  apparel: {
    spaces: ['غرفة قياس'],
    amenities: ['تنظيف', 'تعديل مقاس أساسي'],
    terms: [
      'إعادة القطعة بنفس الحالة مع مراعاة الاستهلاك الطبيعي.',
      'أي تلف غير طبيعي يُخصم من العربون.',
    ],
    depositNote: 'سياسة الملبوسات: العربون يُسترجع بعد فحص القطعة عند الإرجاع.',
    label: 'تأجير الملبوسات',
  },
  artist: {
    spaces: ['منطقة تجهيز'],
    amenities: ['صوتيات', 'إضاءة'],
    terms: [
      'لا يُسمح بإلغاء الموعد بعد تأكيد الحجز إلا حسب الاتفاق.',
      'يلتزم الطرفان بوقت البداية والنهاية المتفق عليه.',
    ],
    depositNote: 'سياسة الحفلات: مبلغ العربون لا يرجع مطلقاً.',
    label: 'الفنان / الزفّة',
  },
  photo: {
    spaces: ['استوديو', 'خلفية تصوير'],
    amenities: ['إضاءة احترافية', 'تعديل صور أساسي', 'واي فاي'],
    terms: [
      'الوصول قبل الموعد بـ 10 دقائق.',
      'تسليم الصور خلال المدة المتفق عليها.',
    ],
    depositNote: 'سياسة التصوير: العربون يُخصم من قيمة الجلسة.',
    label: 'جلسة التصوير',
  },
  supply: {
    spaces: [],
    amenities: ['توصيل', 'تركيب'],
    terms: ['تأكيد الكمية قبل موعد المناسبة بيوم على الأقل.'],
    depositNote: 'سياسة المستلزمات: العربون غير مسترجع بعد التجهيز.',
    label: 'مستلزمات الأعراس',
  },
};
