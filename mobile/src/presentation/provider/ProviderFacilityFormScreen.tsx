import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { BackButton } from '@/core/ui/components/BackButton';
import { FormKeyboardView } from '@/core/ui/components/FormKeyboardView';
import { KeyboardAwareScrollView } from '@/core/ui/components/KeyboardAwareScrollView';
import { QuantityStepper } from '@/core/ui/components/QuantityStepper';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { saveUserSession } from '../../data/local/sessionStorage';
import { Category } from '../../domain/model/Category';
import { Destination } from '../../domain/model/Search';
import { findCategoryInTree, rootCategories } from '../../data/mappers/homeMappers';
import { getSelectedCity } from '../../data/local/cityStorage';
import { RootStackParamList } from '../navigation/types';
import { CityPickerSheet } from '../home/components/CityPickerSheet';
import { SmoothBottomSheet } from '../../core/ui/components/SmoothBottomSheet';
import {
  facilityDisabledBy,
  GENERAL_MEDICAL_SPECIALTY,
  type ProviderProfile,
} from '../../data/remote/providerApi';
import { CloudinaryImagePicker } from './CloudinaryImagePicker';
import { CompactImageAttach } from './CompactImageAttach';
import { DynamicLineList } from './DynamicLineList';
import { OptionPickerSheet } from './OptionPickerSheet';
import {
  isChaletCategory,
  isHotelCategory,
  resolveFacilityKind,
  SERVICE_FACILITY_DEFAULTS,
  type FacilityKind,
} from './categoryKinds';
import { parseMapsUrl, parseYemenMapsUrl } from '../../core/maps/parseMapsUrl';
import { FacilityMapCard } from '../../core/ui/components/FacilityMapCard';

type Props = NativeStackScreenProps<RootStackParamList, 'ProviderFacilityForm'>;

const FALLBACK_CITIES: Destination[] = [
  { id: 1, name: 'صنعاء' },
  { id: 2, name: 'عدن' },
  { id: 3, name: 'تعز' },
];

const DEFAULT_HOTEL_SPACES = ['موقف سيارات', 'ألعاب أطفال'];
const DEFAULT_HOTEL_AMENITIES = ['كفتيريا', 'تكييف', 'صوتيات', 'واي فاي'];
const DEFAULT_HOTEL_TERMS = [
  'يمنع حمل السلاح ⚔️',
  'الحفاظ على الممتلكات وتجنب تلف أثاث الفندق 🚫',
  'العوائل يجب إحضار عقد الزواج + بطائق ووثائق شخصية للزوجين 📜',
  'الأفراد يجب إحضار البطاقة الشخصية أو جواز السفر 💳',
  'الالتزام بالهدوء 🤫',
];
const DEFAULT_HOTEL_POLICY = [
  'يمكن استرداد مبلغ العربون في حالة الإلغاء قبل الحجز بيومين',
  'في حالة تم إبلاغنا بإلغاء الحجز قبلها بيوم يسترد نصف المبلغ',
  'أما إذا في نفس اليوم العربون لا يرجع مطلقاً',
];
const DEFAULT_HOTEL_DEPOSIT =
  'سياسة الفنادق: مبلغ العربون يرجع في حال إلغاء الحجز';

const DEFAULT_CHALET_SPACES = ['استيم', 'ساونا', 'سينما', 'مسبح كبار'];
const DEFAULT_CHALET_AMENITIES = [
  'مطبخ',
  'موقف سيارات خارجي',
  'فلترة ونظام تدفئة',
  'شاشات',
];
const DEFAULT_CHALET_TERMS = [
  'يمنع الدخول بالسلاح',
  'الالتزام بنظافة الأثاث قبل المغادرة',
  'يُطلب إحضار عقد الزواج وبطاقات الهوية للأزواج بدون أطفال',
];
const DEFAULT_CHALET_DEPOSIT =
  'سياسة الشاليهات: مبلغ العربون لا يرجع مطلقاً';
const DEFAULT_TAIRAMAN_DEPOSIT =
  'سياسة الطيرمانات: مبلغ العربون لا يرجع مطلقاً';
const DEFAULT_HALL_SPACES = ['موقف سيارات خارجي'];
/** Halls mock shows spaces + address; amenities stay optional. */
const DEFAULT_HALL_AMENITIES: string[] = [];
const DEFAULT_HALL_TERMS = [
  'لا يجوز للعميل إلغاء أو تعديل موعد المناسبة بعد حجزها.',
  'يلتزم العميل بالوصول إلى الصالة قبل ثلاث ساعات من موعد بدء فعاليات المناسبة على الأقل.',
  'يلتزم العميل بإخلاء الصالة وتسليمها إلى المشرف العام في الموعد المحدد.',
];
const DEFAULT_HALL_DEPOSIT =
  'سياسة القاعات: مبلغ العربون لا يرجع مطلقاً';
const DEFAULT_INSURANCE_META = 'قطعة ذهب';
const DEFAULT_INSURANCE_NOTE =
  'يدفع مبلغ التأمين للإدارة عند الوصول ويُسترجع بعد انتهاء الحجز بشرط سلامة الممتلكات حسب سياسة المنشأة.';
const DEFAULT_CAR_INSURANCE_NOTE =
  'يُسترجع مبلغ التأمين بعد فحص السيارة عند الإرجاع بشرط سلامتها.';

function linesToList(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function listToLines(list: string[]): string {
  return list.join('\n');
}

function strList(attrs: Record<string, unknown> | undefined, key: string): string[] {
  const v = attrs?.[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function cleanList(items: string[]): string[] {
  return items.map((s) => s.trim()).filter(Boolean);
}

function urlList(attrs: Record<string, unknown> | undefined, key: string): string[] {
  return strList(attrs, key).filter((u) => /^https?:\/\//i.test(u));
}

/** Map of space label → image URLs (chalet / tairaman detail photos). */
function imageMap(
  attrs: Record<string, unknown> | undefined,
  key: string,
): Record<string, string[]> {
  const v = attrs?.[key];
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

function pruneImageMap(
  map: Record<string, string[]>,
  labels: string[],
): Record<string, string[]> | undefined {
  const allowed = new Set(cleanList(labels));
  const out: Record<string, string[]> = {};
  for (const [label, urls] of Object.entries(map)) {
    if (!allowed.has(label)) continue;
    const cleaned = urls.filter((u) => typeof u === 'string' && u.trim());
    if (cleaned.length) out[label] = cleaned;
  }
  return Object.keys(out).length ? out : undefined;
}

function toOptionalNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseOptionalAmount(raw: string): number | undefined {
  const cleaned = raw.trim().replace(/,/g, '');
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function ProviderFacilityFormScreen({ route, navigation }: Props) {
  const { providerId } = route.params;
  const isEdit = !!providerId;
  const { container, user, setUser } = useApp();

  const [loading, setLoading] = useState(!!providerId);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  /** Google Maps / OSM share URL — parsed into lat/lng (Yemen). */
  const [locationUrl, setLocationUrl] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  /** Past works for photographers — stored in attributes.portfolio */
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);
  /** Root category shown in the main dropdown. */
  const [parentCategoryId, setParentCategoryId] = useState<number | null>(null);
  /** Effective category saved on the provider (subcategory when present). */
  const [categoryId, setCategoryId] = useState<number | null>(null);
  /** Locked category name from API (edit) — roots list alone can miss the match. */
  const [lockedCategoryName, setLockedCategoryName] = useState<string | null>(null);
  const [cities, setCities] = useState<Destination[]>(FALLBACK_CITIES);
  const [cityId, setCityId] = useState<number | null>(null);
  const [existingAttributes, setExistingAttributes] = useState<Record<string, unknown>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subCategoryOpen, setSubCategoryOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [specialty, setSpecialty] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([
    GENERAL_MEDICAL_SPECIALTY,
  ]);
  const [specialtyPickerOpen, setSpecialtyPickerOpen] = useState(false);
  const [addingSpecialty, setAddingSpecialty] = useState(false);
  const [newSpecialtyDraft, setNewSpecialtyDraft] = useState('');

  const [spaces, setSpaces] = useState<string[]>(DEFAULT_HOTEL_SPACES);
  const [amenities, setAmenities] = useState<string[]>(DEFAULT_HOTEL_AMENITIES);
  const [depositNote, setDepositNote] = useState(DEFAULT_HOTEL_DEPOSIT);
  const [termsText, setTermsText] = useState(listToLines(DEFAULT_HOTEL_TERMS));
  const [policyText, setPolicyText] = useState(listToLines(DEFAULT_HOTEL_POLICY));
  const [maxGuests, setMaxGuests] = useState<number | undefined>(8);
  const [inventory, setInventory] = useState(1);
  const [bathrooms, setBathrooms] = useState<number | undefined>(4);
  const [bedrooms, setBedrooms] = useState<number | undefined>(2);
  const [majlis, setMajlis] = useState<number | undefined>(1);
  const [bathroomImages, setBathroomImages] = useState<string[]>([]);
  const [bedroomImages, setBedroomImages] = useState<string[]>([]);
  const [majlisImages, setMajlisImages] = useState<string[]>([]);
  const [spaceImages, setSpaceImages] = useState<Record<string, string[]>>({});
  /** Playground: total players (shown as N max (N/2 × N/2)). */
  const [maxPlayers, setMaxPlayers] = useState<number | undefined>(12);
  /** Playground length / height in meters. */
  const [fieldLength, setFieldLength] = useState('');
  /** Playground width in meters. */
  const [fieldWidth, setFieldWidth] = useState('');
  const [insuranceAmount, setInsuranceAmount] = useState('');
  const [insuranceMeta, setInsuranceMeta] = useState(DEFAULT_INSURANCE_META);
  const [insuranceNote, setInsuranceNote] = useState(DEFAULT_INSURANCE_NOTE);
  const [tourUrl, setTourUrl] = useState('');
  const [facilityEnabled, setFacilityEnabled] = useState(true);
  const [disabledBy, setDisabledBy] = useState<'ADMIN' | 'PROVIDER' | null>(
    null,
  );
  const [disableReasonSaved, setDisableReasonSaved] = useState<string | null>(
    null,
  );
  const [disableSheetOpen, setDisableSheetOpen] = useState(false);
  const [disableReasonDraft, setDisableReasonDraft] = useState('');
  const [togglingEnabled, setTogglingEnabled] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const applyFacilityStatus = (me: ProviderProfile) => {
    const by = facilityDisabledBy(me);
    setFacilityEnabled(me.status !== 'SUSPENDED');
    setDisabledBy(by);
    const reason =
      typeof me.attributes?.disableReason === 'string'
        ? me.attributes.disableReason.trim()
        : '';
    setDisableReasonSaved(reason || null);
  };

  const defaultsAppliedFor = useRef<string | null>(null);

  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(show, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hide, () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const parentCategory = useMemo(() => {
    if (parentCategoryId == null) return null;
    return (
      categories.find((c) => c.id === parentCategoryId) ??
      findCategoryInTree(categoryTree, parentCategoryId)
    );
  }, [categories, parentCategoryId, categoryTree]);

  const subcategories = useMemo(
    () => parentCategory?.children?.filter(Boolean) ?? [],
    [parentCategory],
  );
  const hasSubcategories = subcategories.length > 0;

  const selectedSubCategory = useMemo(() => {
    if (!hasSubcategories || categoryId == null) return null;
    return subcategories.find((c) => c.id === categoryId) ?? null;
  }, [hasSubcategories, categoryId, subcategories]);

  const selectedCategory = useMemo(() => {
    if (categoryId == null) return null;
    return (
      categories.find((c) => c.id === categoryId) ??
      findCategoryInTree(categoryTree, categoryId)
    );
  }, [categories, categoryId, categoryTree]);

  const selectedCity = useMemo(
    () => cities.find((c) => c.id === cityId) ?? null,
    [cities, cityId],
  );

  // Hotel/chalet/hall templates follow the root category (or locked API name).
  const categoryName =
    parentCategory?.name ?? selectedCategory?.name ?? lockedCategoryName;
  const kindNames = [
    categoryName,
    parentCategory?.name,
    selectedCategory?.name,
    lockedCategoryName,
  ];
  const facilityKind = resolveFacilityKind(...kindNames);
  const isHotel = facilityKind === 'hotel';
  const isTairaman = facilityKind === 'tairaman';
  const isChalet = facilityKind === 'chalet' || isTairaman;
  const isHall = facilityKind === 'hall';
  const isSport = facilityKind === 'sport';
  const isPool = facilityKind === 'pool';
  const isGym = facilityKind === 'gym';
  const isHealth = facilityKind === 'health';
  const isSalon = facilityKind === 'salon';
  const isCar = facilityKind === 'car';
  const isTransport = facilityKind === 'transport';
  const isApparel = facilityKind === 'apparel';
  const isCatalog = isCar || isTransport || isApparel;
  const isArtist = facilityKind === 'artist';
  const isPhoto = facilityKind === 'photo';
  const stayNoun = isTairaman ? 'طيرمان' : 'شاليه';
  const stayNounPlural = isTairaman ? 'الطيرمانات' : 'الشاليهات';
  const catalogNoun = isApparel
    ? 'المنتجات'
    : isTransport
      ? 'المركبات'
      : 'السيارات';
  const serviceDefaults =
    facilityKind in SERVICE_FACILITY_DEFAULTS
      ? SERVICE_FACILITY_DEFAULTS[
          facilityKind as keyof typeof SERVICE_FACILITY_DEFAULTS
        ]
      : null;
  const hasDetailCard =
    isHotel ||
    isChalet ||
    isHall ||
    isSport ||
    isPool ||
    isGym ||
    isHealth ||
    isSalon ||
    isCatalog ||
    isArtist ||
    isPhoto;
  const showInsuranceFields = isChalet || isHall || isCatalog;
  const playersPerSide =
    maxPlayers != null && maxPlayers > 0 ? Math.floor(maxPlayers / 2) : undefined;
  const showSubCategoryField =
    (!isEdit && hasSubcategories) ||
    (isEdit && selectedCategory?.parentId != null);

  const selectParentCategory = useCallback((parentId: number) => {
    setParentCategoryId(parentId);
    const parent =
      categories.find((c) => c.id === parentId) ??
      findCategoryInTree(categoryTree, parentId);
    const kids = parent?.children ?? [];
    if (kids.length > 0) {
      // Require an explicit subcategory choice.
      setCategoryId(null);
    } else {
      setCategoryId(parentId);
    }
  }, [categories, categoryTree]);

  const applyCategoryDefaults = useCallback((kind: FacilityKind) => {
    const resetExtra = () => {
      setMaxGuests(undefined);
      setBathrooms(undefined);
      setBedrooms(undefined);
      setMajlis(undefined);
      setMaxPlayers(undefined);
      setFieldLength('');
      setFieldWidth('');
      setInsuranceAmount('');
      setInsuranceMeta(DEFAULT_INSURANCE_META);
      setInsuranceNote(DEFAULT_INSURANCE_NOTE);
      setTourUrl('');
      setPolicyText('');
    };

    if (kind === 'hotel') {
      setSpaces(DEFAULT_HOTEL_SPACES);
      setAmenities(DEFAULT_HOTEL_AMENITIES);
      setDepositNote(DEFAULT_HOTEL_DEPOSIT);
      setTermsText(listToLines(DEFAULT_HOTEL_TERMS));
      setPolicyText(listToLines(DEFAULT_HOTEL_POLICY));
      resetExtra();
      return;
    }
    if (kind === 'chalet' || kind === 'tairaman') {
      setSpaces(DEFAULT_CHALET_SPACES);
      setAmenities(DEFAULT_CHALET_AMENITIES);
      setDepositNote(
        kind === 'tairaman' ? DEFAULT_TAIRAMAN_DEPOSIT : DEFAULT_CHALET_DEPOSIT,
      );
      setTermsText(listToLines(DEFAULT_CHALET_TERMS));
      resetExtra();
      setMaxGuests(8);
      setInventory(1);
      setBathrooms(4);
      setBedrooms(2);
      setMajlis(1);
      return;
    }
    if (kind === 'hall') {
      setSpaces(DEFAULT_HALL_SPACES);
      setAmenities(DEFAULT_HALL_AMENITIES);
      setDepositNote(DEFAULT_HALL_DEPOSIT);
      setTermsText(listToLines(DEFAULT_HALL_TERMS));
      resetExtra();
      return;
    }
    if (kind === 'sport') {
      setSpaces(['إضاءة', 'كرات']);
      setAmenities(['موقف سيارات', 'غرف تبديل']);
      setDepositNote('');
      setTermsText('');
      resetExtra();
      setMaxPlayers(12);
      setFieldLength('40');
      setFieldWidth('21');
      return;
    }
    if (kind === 'pool') {
      const d = SERVICE_FACILITY_DEFAULTS.pool;
      setSpaces(d.spaces);
      setAmenities(d.amenities);
      setDepositNote(d.depositNote);
      setTermsText(listToLines(d.terms));
      resetExtra();
      setMaxPlayers(30);
      return;
    }
    if (kind === 'gym') {
      const d = SERVICE_FACILITY_DEFAULTS.gym;
      setSpaces(d.spaces);
      setAmenities(d.amenities);
      setDepositNote(d.depositNote);
      setTermsText(listToLines(d.terms));
      resetExtra();
      return;
    }
    if (
      kind === 'health' ||
      kind === 'salon' ||
      kind === 'car' ||
      kind === 'transport' ||
      kind === 'apparel' ||
      kind === 'artist' ||
      kind === 'photo' ||
      kind === 'supply'
    ) {
      const d = SERVICE_FACILITY_DEFAULTS[kind];
      // Catalog shops: spaces/amenities live on each product, not the facility.
      if (kind === 'car' || kind === 'transport' || kind === 'apparel') {
        setSpaces([]);
        setAmenities([]);
      } else {
        setSpaces(d.spaces);
        setAmenities(d.amenities);
      }
      setDepositNote(d.depositNote);
      setTermsText(listToLines(d.terms));
      resetExtra();
      if (kind === 'car' || kind === 'transport') {
        setInsuranceNote(DEFAULT_CAR_INSURANCE_NOTE);
      }
    }
  }, []);

  useEffect(() => {
    if (isEdit || !parentCategory) return;
    const kind = facilityKind;
    const key = `${kind}:${parentCategory.id}`;
    if (defaultsAppliedFor.current === key) return;
    defaultsAppliedFor.current = key;
    if (kind !== 'other') applyCategoryDefaults(kind);
  }, [applyCategoryDefaults, facilityKind, isEdit, parentCategory]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tree, dest, storedCity] = await Promise.all([
          container.categoryApi.tree(),
          container.searchRepository.getDestinations().catch(() => FALLBACK_CITIES),
          getSelectedCity(),
        ]);
        if (cancelled) return;
        const treeData = tree.data.data ?? [];
        const roots = rootCategories(treeData);
        setCategoryTree(treeData);
        setCategories(roots);
        const cityList =
          Array.isArray(dest) && dest.length ? dest : FALLBACK_CITIES;
        setCities(cityList);

        if (providerId) {
          const me = await container.providerApi.getMineById(providerId);
          if (cancelled) return;
          setBusinessName(me.businessName ?? '');
          setDescription(me.description ?? '');
          setAddressDetails(me.addressDetails ?? '');
          setImages(me.images ?? []);
          const savedCatId = me.categoryId ?? roots[0]?.id ?? null;
          const savedNode =
            savedCatId != null ? findCategoryInTree(treeData, savedCatId) : null;
          const parentId =
            savedNode?.parentId != null
              ? savedNode.parentId
              : savedCatId;
          setParentCategoryId(parentId);
          setCategoryId(savedCatId);
          setLockedCategoryName(me.category?.name ?? savedNode?.name ?? null);
          setCityId(me.cityId ?? storedCity?.id ?? cityList[0]?.id ?? 1);
          const attrs =
            me.attributes && typeof me.attributes === 'object' && !Array.isArray(me.attributes)
              ? (me.attributes as Record<string, unknown>)
              : {};
          setExistingAttributes(attrs);
          const s = strList(attrs, 'spaces');
          const a = strList(attrs, 'amenities');
          const t = strList(attrs, 'terms');
          const p = strList(attrs, 'policyBullets');
          const portfolioUrls = strList(attrs, 'portfolio');
          if (portfolioUrls.length) setPortfolio(portfolioUrls);
          if (s.length) setSpaces(s);
          if (a.length) setAmenities(a);
          if (typeof attrs.depositNote === 'string' && attrs.depositNote.trim()) {
            setDepositNote(attrs.depositNote);
          } else if (me.cancellationPolicy?.trim()) {
            setDepositNote(me.cancellationPolicy);
          }
          if (t.length) setTermsText(listToLines(t));
          if (p.length) setPolicyText(listToLines(p));
          const loadedGuests =
            toOptionalNum(attrs.maxGuests) ??
            toOptionalNum(attrs.capacity) ??
            toOptionalNum(attrs.guests);
          setMaxGuests(loadedGuests ?? 8);
          const loadedUnits =
            toOptionalNum(attrs.inventory) ?? toOptionalNum(attrs.units);
          setInventory(loadedUnits && loadedUnits > 0 ? loadedUnits : 1);
          setBathrooms(toOptionalNum(attrs.bathrooms));
          setBedrooms(
            toOptionalNum(attrs.bedrooms) ?? toOptionalNum(attrs.rooms),
          );
          setMajlis(toOptionalNum(attrs.majlis));
          setBathroomImages(urlList(attrs, 'bathroomImages'));
          setBedroomImages(urlList(attrs, 'bedroomImages'));
          setMajlisImages(urlList(attrs, 'majlisImages'));
          setSpaceImages(imageMap(attrs, 'spaceImages'));
          setMaxPlayers(
            toOptionalNum(attrs.maxPlayers) ??
              toOptionalNum(attrs.players) ??
              toOptionalNum(attrs.capacity),
          );
          const len =
            toOptionalNum(attrs.fieldLength) ??
            toOptionalNum(attrs.fieldHeight) ??
            toOptionalNum(attrs.length);
          const wid =
            toOptionalNum(attrs.fieldWidth) ?? toOptionalNum(attrs.width);
          setFieldLength(len != null ? String(len) : '');
          setFieldWidth(wid != null ? String(wid) : '');
          const insAmt = toOptionalNum(attrs.insuranceAmount);
          setInsuranceAmount(insAmt != null ? String(insAmt) : '');
          if (typeof attrs.insuranceMeta === 'string' && attrs.insuranceMeta.trim()) {
            setInsuranceMeta(attrs.insuranceMeta);
          }
          if (typeof attrs.insuranceNote === 'string' && attrs.insuranceNote.trim()) {
            setInsuranceNote(attrs.insuranceNote);
          }
          if (typeof attrs.tourUrl === 'string') {
            setTourUrl(attrs.tourUrl);
          }
          if (typeof attrs.specialty === 'string' && attrs.specialty.trim()) {
            setSpecialty(attrs.specialty.trim());
          }
          const savedLocUrl =
            typeof attrs.locationUrl === 'string' ? attrs.locationUrl.trim() : '';
          setLocationUrl(savedLocUrl);
          const lat =
            typeof me.latitude === 'number' && Number.isFinite(me.latitude)
              ? me.latitude
              : null;
          const lng =
            typeof me.longitude === 'number' && Number.isFinite(me.longitude)
              ? me.longitude
              : null;
          if (lat != null && lng != null) {
            setLocationLat(lat);
            setLocationLng(lng);
          } else if (savedLocUrl) {
            const parsed = parseYemenMapsUrl(savedLocUrl) ?? parseMapsUrl(savedLocUrl);
            if (parsed) {
              setLocationLat(parsed.latitude);
              setLocationLng(parsed.longitude);
            }
          } else {
            setLocationLat(null);
            setLocationLng(null);
          }
          setLocationError(null);
          applyFacilityStatus(me);
          defaultsAppliedFor.current = `loaded:${me.id}`;
        } else {
          const preferred =
            roots.find((c) => isChaletCategory(c.name)) ??
            roots.find((c) => isHotelCategory(c.name)) ??
            roots[0] ??
            null;
          if (preferred) {
            setParentCategoryId(preferred.id);
            const kids = preferred.children ?? [];
            setCategoryId(kids.length > 0 ? null : preferred.id);
          } else {
            setParentCategoryId(null);
            setCategoryId(null);
          }
          setCityId(storedCity?.id ?? cityList[0]?.id ?? 1);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'تعذر التحميل');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [container, providerId]);

  useEffect(() => {
    if (!isHealth) return;
    let cancelled = false;
    void container.providerApi
      .listMedicalSpecialties()
      .then((list) => {
        if (cancelled) return;
        const names = list.map((s) => s.name).filter(Boolean);
        if (!names.some((n) => n === GENERAL_MEDICAL_SPECIALTY)) {
          names.unshift(GENERAL_MEDICAL_SPECIALTY);
        }
        setSpecialties(names);
      })
      .catch(() => {
        if (!cancelled) setSpecialties([GENERAL_MEDICAL_SPECIALTY]);
      });
    return () => {
      cancelled = true;
    };
  }, [container.providerApi, isHealth]);

  const applyLocationUrl = useCallback((raw: string) => {
    setLocationUrl(raw);
    const trimmed = raw.trim();
    if (!trimmed) {
      setLocationLat(null);
      setLocationLng(null);
      setLocationError(null);
      return;
    }
    const yemen = parseYemenMapsUrl(trimmed);
    if (yemen) {
      setLocationLat(yemen.latitude);
      setLocationLng(yemen.longitude);
      setLocationError(null);
      return;
    }
    const any = parseMapsUrl(trimmed);
    if (any) {
      setLocationLat(null);
      setLocationLng(null);
      setLocationError('الموقع خارج اليمن — الصق رابط موقع داخل اليمن');
      return;
    }
    setLocationLat(null);
    setLocationLng(null);
    setLocationError(
      'تعذر قراءة الإحداثيات من الرابط. الصق رابط Google Maps أو OpenStreetMap يحتوي على الموقع (ليس رابطاً مختصراً).',
    );
  }, []);

  const submit = useCallback(async () => {
    if (!businessName.trim()) {
      setError('أدخل اسم المنشأة');
      return;
    }
    if (!parentCategoryId) {
      setError('اختر التصنيف');
      return;
    }
    if (hasSubcategories && !categoryId) {
      setError('اختر التصنيف الفرعي');
      return;
    }
    if (!categoryId) {
      setError('اختر التصنيف');
      return;
    }
    if (isChalet && !isTairaman && (maxGuests == null || maxGuests < 1)) {
      setError('أدخل الحد الأقصى للأشخاص');
      return;
    }
    if (isChalet && (!inventory || inventory < 1)) {
      setError(`أدخل عدد ${stayNounPlural} المتاحة`);
      return;
    }
    if (isSport && (maxPlayers == null || maxPlayers < 2)) {
      setError('أدخل الحد الأقصى للاعبين (على الأقل 2)');
      return;
    }
    if (isPool && (maxPlayers == null || maxPlayers < 1)) {
      setError('أدخل الحد الأقصى لمرتادي المسبح');
      return;
    }
    if (locationUrl.trim() && (locationLat == null || locationLng == null)) {
      setError(
        locationError ??
          'رابط الموقع غير صالح — الصق رابط خريطة لموقع داخل اليمن',
      );
      return;
    }
    const parsedLength = parseOptionalAmount(fieldLength);
    const parsedWidth = parseOptionalAmount(fieldWidth);
    if (isSport && (parsedLength == null || parsedLength <= 0)) {
      setError('أدخل طول الملعب بالمتر');
      return;
    }
    if (isSport && (parsedWidth == null || parsedWidth <= 0)) {
      setError('أدخل عرض الملعب بالمتر');
      return;
    }
    if (isHealth && !specialty.trim()) {
      setError('اختر تخصص العيادة أو أضف تخصصاً جديداً (أو اختر عام)');
      return;
    }
    setSaving(true);
    setError(null);

    const applyOptionalInsurance = (attributes: Record<string, unknown>) => {
      const ins = parseOptionalAmount(insuranceAmount);
      if (ins != null) {
        attributes.insuranceAmount = ins;
        if (insuranceMeta.trim()) {
          attributes.insuranceMeta = insuranceMeta.trim();
        } else {
          delete attributes.insuranceMeta;
        }
        if (insuranceNote.trim()) {
          attributes.insuranceNote = insuranceNote.trim();
        } else {
          delete attributes.insuranceNote;
        }
      } else {
        delete attributes.insuranceAmount;
        delete attributes.insuranceMeta;
        delete attributes.insuranceNote;
      }
    };

    const detailBase = (fallbackDeposit: string) => {
      const base: Record<string, unknown> = {
        ...existingAttributes,
        spaces: cleanList(spaces),
        amenities: cleanList(amenities),
        depositNote: depositNote.trim() || fallbackDeposit,
        terms: linesToList(termsText),
        policyBullets: linesToList(policyText),
      };
      if (isPhoto) {
        const works = portfolio.filter((u) => typeof u === 'string' && u.trim());
        if (works.length) base.portfolio = works;
        else delete base.portfolio;
      }
      return base;
    };

    let attributes: Record<string, unknown> | undefined;
    if (isHotel) {
      attributes = detailBase(DEFAULT_HOTEL_DEPOSIT);
    } else if (isChalet) {
      attributes = detailBase(
        isTairaman ? DEFAULT_TAIRAMAN_DEPOSIT : DEFAULT_CHALET_DEPOSIT,
      );
      // Unit count lives on the facility for شاليهات + طيرمانات.
      // Persons capacity for طيرمانات still lives on each package.
      const units = Math.max(1, Math.floor(Number(inventory)));
      attributes.inventory = units;
      attributes.units = units;
      if (!isTairaman) {
        const guests = Math.max(1, Math.floor(Number(maxGuests)));
        attributes.maxGuests = guests;
        attributes.capacity = guests;
        attributes.guests = guests;
      } else {
        delete attributes.maxGuests;
        delete attributes.capacity;
        delete attributes.guests;
      }
      if (bathrooms != null && bathrooms > 0) attributes.bathrooms = bathrooms;
      if (bedrooms != null && bedrooms > 0) {
        attributes.bedrooms = bedrooms;
        attributes.rooms = bedrooms;
      }
      if (majlis != null && majlis > 0) attributes.majlis = majlis;
      const bathPics = bathroomImages.filter((u) => u.trim());
      const bedPics = bedroomImages.filter((u) => u.trim());
      const majlisPics = majlisImages.filter((u) => u.trim());
      if (bathPics.length) attributes.bathroomImages = bathPics;
      else delete attributes.bathroomImages;
      if (bedPics.length) attributes.bedroomImages = bedPics;
      else delete attributes.bedroomImages;
      if (majlisPics.length) attributes.majlisImages = majlisPics;
      else delete attributes.majlisImages;
      const prunedSpaces = pruneImageMap(spaceImages, spaces);
      if (prunedSpaces) attributes.spaceImages = prunedSpaces;
      else delete attributes.spaceImages;
      applyOptionalInsurance(attributes);
      if (tourUrl.trim()) attributes.tourUrl = tourUrl.trim();
      else delete attributes.tourUrl;
    } else if (isHall) {
      attributes = detailBase(DEFAULT_HALL_DEPOSIT);
      applyOptionalInsurance(attributes);
    } else if (isSport) {
      const players = Math.max(2, Math.floor(Number(maxPlayers)));
      attributes = {
        ...existingAttributes,
        spaces: cleanList(spaces),
        amenities: cleanList(amenities),
        terms: linesToList(termsText),
        policyBullets: linesToList(policyText),
        maxPlayers: players,
        players,
        capacity: players,
        guests: players,
        fieldLength: parsedLength,
        fieldHeight: parsedLength,
        length: parsedLength,
        fieldWidth: parsedWidth,
        width: parsedWidth,
      };
    } else if (isPool) {
      const swimmers = Math.max(1, Math.floor(Number(maxPlayers)));
      attributes = {
        ...detailBase(SERVICE_FACILITY_DEFAULTS.pool.depositNote),
        maxPlayers: swimmers,
        players: swimmers,
        capacity: swimmers,
        guests: swimmers,
      };
    } else if (isGym) {
      attributes = detailBase(SERVICE_FACILITY_DEFAULTS.gym.depositNote);
    } else if (isHealth || isSalon || isArtist || isPhoto) {
      attributes = detailBase(
        depositNote.trim() || serviceDefaults?.depositNote || 'سياسة العربون',
      );
      if (isHealth) {
        const nextSpecialty = specialty.trim().replace(/\s+/g, ' ');
        attributes.specialty = nextSpecialty;
        await container.providerApi
          .ensureMedicalSpecialty(nextSpecialty)
          .catch(() => null);
      }
    } else if (isCar) {
      attributes = detailBase(SERVICE_FACILITY_DEFAULTS.car.depositNote);
      delete attributes.spaces;
      delete attributes.amenities;
      applyOptionalInsurance(attributes);
    } else if (isTransport) {
      attributes = detailBase(SERVICE_FACILITY_DEFAULTS.transport.depositNote);
      delete attributes.spaces;
      delete attributes.amenities;
      applyOptionalInsurance(attributes);
    } else if (isApparel) {
      attributes = detailBase(SERVICE_FACILITY_DEFAULTS.apparel.depositNote);
      delete attributes.spaces;
      delete attributes.amenities;
      applyOptionalInsurance(attributes);
    }

    // Persist maps share URL + coords (Yemen facilities).
    if (!attributes) {
      attributes = { ...existingAttributes };
    }
    const trimmedLoc = locationUrl.trim();
    if (trimmedLoc && locationLat != null && locationLng != null) {
      attributes.locationUrl = trimmedLoc;
    } else {
      delete attributes.locationUrl;
    }

    const payload = {
      businessName: businessName.trim(),
      description: description.trim() || undefined,
      addressDetails: addressDetails.trim() || undefined,
      // Always send coords so clearing the URL can reset them on the server.
      latitude: locationLat,
      longitude: locationLng,
      cancellationPolicy:
        isHotel ||
        isChalet ||
        isHall ||
        isCatalog ||
        isArtist ||
        isHealth ||
        isSalon ||
        isPhoto ||
        isPool ||
        isGym
          ? depositNote.trim() || undefined
          : undefined,
      ...(isEdit
        ? {}
        : {
            categoryId,
            cityId: cityId ?? undefined,
          }),
      images,
      ...(attributes ? { attributes } : {}),
    };

    try {
      if (isEdit && providerId) {
        await container.providerApi.updateMine(providerId, payload);
        // Propagate facility unit count to all package calendars.
        if (isChalet) {
          const units = Math.max(1, Math.floor(Number(inventory)));
          const services = await container.serviceApi.listMine(providerId);
          await Promise.all(
            services.map((s) => {
              const attrs = (s.attributes ?? {}) as Record<string, unknown>;
              const hourly =
                attrs.pricingMode === 'HOURLY' ||
                (Array.isArray(attrs.pricePeriods) &&
                  attrs.pricePeriods.length > 0);
              if (hourly) {
                return container.serviceApi.seedHourlyAvailabilities(s.id, {
                  days: 14,
                  totalCapacity: units,
                });
              }
              return container.serviceApi.seedAvailabilities(s.id, {
                days: 90,
                totalCapacity: units,
              });
            }),
          );
        }
        navigation.goBack();
      } else {
        const created = await container.providerApi.create(payload);
        if (user && user.role !== 'PROVIDER' && user.role !== 'ADMIN') {
          const next = { ...user, role: 'PROVIDER' as const };
          await saveUserSession(next);
          setUser(next);
        }
        navigation.replace('ProviderFacility', { providerId: created.id });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الحفظ');
    } finally {
      setSaving(false);
    }
  }, [
    addressDetails,
    locationUrl,
    locationLat,
    locationLng,
    locationError,
    amenities,
    bathrooms,
    bathroomImages,
    bedrooms,
    bedroomImages,
    businessName,
    maxGuests,
    inventory,
    parentCategoryId,
    hasSubcategories,
    categoryId,
    cityId,
    container,
    depositNote,
    description,
    existingAttributes,
    images,
    portfolio,
    insuranceAmount,
    insuranceMeta,
    insuranceNote,
    isApparel,
    isArtist,
    isCar,
    isCatalog,
    isChalet,
    isTransport,
    isEdit,
    isHall,
    isHealth,
    isHotel,
    isPhoto,
    isPool,
    isGym,
    isSalon,
    isSport,
    isTairaman,
    specialty,
    stayNounPlural,
    majlis,
    majlisImages,
    spaceImages,
    maxPlayers,
    fieldLength,
    fieldWidth,
    navigation,
    policyText,
    providerId,
    serviceDefaults,
    setUser,
    spaces,
    termsText,
    tourUrl,
    user,
  ]);

  const onToggleEnabledPress = () => {
    if (!providerId || togglingEnabled) return;
    if (facilityEnabled) {
      setDisableReasonDraft('');
      setDisableSheetOpen(true);
      return;
    }
    if (disabledBy === 'ADMIN') {
      setError(
        'تم إيقاف هذه المنشأة من الإدارة — لا يمكن تفعيلها إلا بواسطة الأدمن',
      );
      return;
    }
    void applyEnabled(true);
  };

  const applyEnabled = async (enabled: boolean, reason?: string) => {
    if (!providerId || togglingEnabled) return;
    setTogglingEnabled(true);
    setError(null);
    try {
      const updated = await container.providerApi.setEnabled(
        providerId,
        enabled,
        reason,
      );
      applyFacilityStatus(updated);
      setDisableSheetOpen(false);
      setDisableReasonDraft('');
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message;
      const text = Array.isArray(msg)
        ? msg.join('\n')
        : typeof msg === 'string'
          ? msg
          : e instanceof Error
            ? e.message
            : 'تعذر تحديث حالة المنشأة';
      setError(text);
    } finally {
      setTogglingEnabled(false);
    }
  };

  const confirmDisable = () => {
    const note = disableReasonDraft.trim();
    if (note.length < 5) {
      setError('اكتب سبب التعطيل (5 أحرف على الأقل)');
      return;
    }
    void applyEnabled(false, note);
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

  const title = isEdit
    ? 'تعديل المنشأة'
    : isHotel
      ? 'إضافة فندق'
      : isTairaman
        ? 'إضافة طيرمان'
        : isChalet
          ? 'إضافة شاليه'
          : isHall
            ? 'إضافة قاعة'
            : isSport
              ? 'إضافة ملعب'
              : isPool
                ? 'إضافة مسبح'
                : isGym
                  ? 'إضافة نادي رياضي'
                  : isHealth
                    ? 'إضافة منشأة صحية'
                    : isSalon
                      ? 'إضافة صالون'
                      : isCatalog
                        ? isApparel
                          ? 'إضافة تأجير ملبوسات'
                          : isTransport
                            ? 'إضافة نقليات'
                            : 'إضافة تأجير سيارات'
                        : isArtist
                          ? 'إضافة فنان / زفّة'
                          : isPhoto
                            ? 'إضافة تصوير'
                            : 'منشأة جديدة';

  return (
    <SafeAreaView
      style={styles.safe}
      edges={keyboardOpen ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']}
    >
      <FormKeyboardView>
      <View style={styles.topBar}>
        <BackButton />
        <Text style={styles.topTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAwareScrollView
        style={styles.scrollFlex}
        contentContainerStyle={styles.scroll}
        avoidKeyboard={false}
        bottomOffset={72}
      >
        <CloudinaryImagePicker urls={images} onChange={setImages} label="صور المنشأة" />
        {isPhoto ? (
          <CloudinaryImagePicker
            urls={portfolio}
            onChange={setPortfolio}
            max={16}
            label="أعمال سابقة (معرض الأعمال)"
          />
        ) : null}

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>اسم المنشأة</Text>
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder={
                isHotel
                  ? 'مثال: فندق الجزائر'
                  : isTairaman
                    ? 'مثال: طيرمان الورد (VIP)'
                    : isChalet
                      ? 'مثال: شالية رقم 1 (VIP)'
                      : isHealth
                        ? 'مثال: عيادة النور'
                        : isSalon
                          ? 'مثال: صالون الأناقة'
                          : isPool
                            ? 'مثال: مسبح الأهلي'
                            : isGym
                              ? 'مثال: نادي القوة'
                              : isCatalog
                                ? isApparel
                                  ? 'مثال: أناقة للتأجير'
                                  : isTransport
                                    ? 'مثال: نقليات الأمانة'
                                    : 'مثال: تأجير سيارات الأمانة'
                                : isArtist
                                  ? 'مثال: فرقة الفرح'
                                  : isPhoto
                                    ? 'مثال: استوديو لمسة'
                                    : 'اسم المنشأة'
              }
              placeholderTextColor={theme.colors.textSecondary}
              textAlign="right"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>التصنيف</Text>
            {isEdit ? (
              <View style={[styles.select, styles.selectLocked]}>
                <Ionicons name="lock-closed-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.selectValue} numberOfLines={1}>
                  {parentCategory?.name ?? categoryName ?? '—'}
                </Text>
              </View>
            ) : (
              <Pressable style={styles.select} onPress={() => setCategoryOpen(true)}>
                <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                <Text
                  style={[
                    styles.selectValue,
                    !parentCategory && styles.selectPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {parentCategory?.name ?? 'اختر التصنيف'}
                </Text>
              </Pressable>
            )}
          </View>

          {showSubCategoryField ? (
            <View style={styles.field}>
              <Text style={styles.label}>التصنيف الفرعي</Text>
              {isEdit ? (
                <View style={[styles.select, styles.selectLocked]}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.selectValue} numberOfLines={1}>
                    {selectedSubCategory?.name ?? selectedCategory?.name ?? '—'}
                  </Text>
                </View>
              ) : (
                <Pressable
                  style={styles.select}
                  onPress={() => setSubCategoryOpen(true)}
                >
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.selectValue,
                      !selectedSubCategory && styles.selectPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {selectedSubCategory?.name ?? 'اختر التصنيف الفرعي'}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>المدينة</Text>
            {isEdit ? (
              <View style={[styles.select, styles.selectLocked]}>
                <Ionicons name="lock-closed-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.selectValue} numberOfLines={1}>
                  {selectedCity?.name ?? '—'}
                </Text>
              </View>
            ) : (
              <Pressable style={styles.select} onPress={() => setCityOpen(true)}>
                <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                <Text
                  style={[styles.selectValue, !selectedCity && styles.selectPlaceholder]}
                  numberOfLines={1}
                >
                  {selectedCity?.name ?? 'اختر المدينة'}
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>العنوان التفصيلي</Text>
            <TextInput
              style={styles.input}
              value={addressDetails}
              onChangeText={setAddressDetails}
              placeholder="الحي، الشارع، أقرب معلم"
              placeholderTextColor={theme.colors.textSecondary}
              textAlign="right"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>رابط الموقع على الخريطة</Text>
            <Text style={styles.hintInline}>
              الصق رابط Google Maps أو OpenStreetMap لموقع المنشأة داخل اليمن
            </Text>
            <TextInput
              style={styles.input}
              value={locationUrl}
              onChangeText={applyLocationUrl}
              placeholder="https://maps.google.com/… أو openstreetmap.org/…"
              placeholderTextColor={theme.colors.textSecondary}
              textAlign="left"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            {locationError ? (
              <Text style={styles.locationError}>{locationError}</Text>
            ) : null}
            {locationLat != null && locationLng != null ? (
              <View style={{ marginTop: 10 }}>
                <FacilityMapCard
                  latitude={locationLat}
                  longitude={locationLng}
                  height={140}
                  label="معاينة الموقع"
                />
              </View>
            ) : (
              <Text style={styles.hintInline}>
                إن لم يُحدد الرابط، تظهر المنشأة حول{' '}
                {selectedCity?.name ?? 'صنعاء'} على خريطة البحث
              </Text>
            )}
          </View>

          {isHealth ? (
            <View style={styles.field}>
              <Text style={styles.label}>التخصص</Text>
              <Pressable
                style={styles.select}
                onPress={() => setSpecialtyPickerOpen(true)}
              >
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.selectValue,
                    !specialty.trim() && styles.selectPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {specialty.trim() || 'اختر التخصص (أو عام)'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>
              {isHotel
                ? 'عن الفنادق (الوصف)'
                : isTairaman
                  ? 'عن الطيرمانات (الوصف)'
                  : isChalet
                    ? 'عن الشاليهات (الوصف)'
                    : isSport
                      ? 'عن الملعب (الوصف)'
                      : isPool
                        ? 'عن المسبح (الوصف)'
                        : isGym
                          ? 'عن النادي (الوصف)'
                          : isHealth
                            ? 'عن المنشأة الصحية (الوصف)'
                            : isSalon
                              ? 'عن الصالون (الوصف)'
                              : isCatalog
                                ? `عن ${catalogNoun} (الوصف)`
                                : isArtist
                                  ? 'عن الفنان (الوصف)'
                                  : isPhoto
                                    ? 'عن جلسة التصوير (الوصف)'
                                    : 'الوصف'}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={
                isHotel
                  ? 'نبذة تظهر تحت «عن الفنادق»'
                  : isTairaman
                    ? 'مثال: جلسة مريحة مع مجلس خارجي'
                    : isChalet
                      ? 'مثال: إقامة لليلة واحدة مع مسبح خاص'
                      : isSport
                        ? 'مثال: ملعب عشبي بإضاءة كاملة'
                        : isPool
                          ? 'مثال: مسبح أولمبي مع غرف تبديل'
                          : isGym
                            ? 'مثال: صالة أوزان وكاردو مع مدربين'
                            : isHealth
                              ? 'مثال: عيادة متخصصة مع مواعيد يومية'
                              : isSalon
                                ? 'مثال: قص وصبغ وعناية بالبشرة'
                              : isCatalog
                                ? isApparel
                                  ? 'مثال: فساتين سهرات وبدل رسمية للتأجير اليومي'
                                  : isTransport
                                    ? 'مثال: باصات ومركبات نقل حديثة'
                                    : 'مثال: سيارات حديثة مع تأمين شامل'
                                : isArtist
                                  ? 'مثال: زفّة تقليدية مع صوتيات'
                                  : isPhoto
                                    ? 'مثال: جلسات تصوير داخل الاستوديو وخارجه'
                                    : 'نبذة عن منشأتك'
              }
              placeholderTextColor={theme.colors.textSecondary}
              textAlign="right"
              multiline
            />
          </View>
        </View>

        {isEdit ? (
          <View style={styles.card}>
            <View style={styles.enableRow}>
              <Switch
                value={facilityEnabled}
                onValueChange={onToggleEnabledPress}
                disabled={togglingEnabled || (!facilityEnabled && disabledBy === 'ADMIN')}
                trackColor={{
                  false: '#D1D5DB',
                  true: theme.colors.accent,
                }}
                thumbColor="#fff"
              />
              <View style={styles.enableText}>
                <Text style={styles.enableTitle}>
                  {facilityEnabled ? 'المنشأة مفعّلة' : 'المنشأة معطّلة'}
                </Text>
                <Text style={styles.enableHint}>
                  {facilityEnabled
                    ? 'إظهار المنشأة للعملاء في البحث والحجز'
                    : disabledBy === 'ADMIN'
                      ? 'أوقفها الأدمن — لا يمكنك تفعيلها بنفسك'
                      : 'مخفية عن العملاء — يمكنك إعادة تفعيلها في أي وقت'}
                </Text>
                {!facilityEnabled && disableReasonSaved ? (
                  <Text style={styles.enableReason}>
                    السبب: {disableReasonSaved}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {hasDetailCard ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {isHotel
                ? 'تفاصيل صفحة الفندق'
                : isChalet
                  ? `تفاصيل صفحة ال${stayNoun}`
                  : isHall
                    ? 'تفاصيل صفحة القاعة'
                    : isSport
                      ? 'تفاصيل صفحة الملعب'
                      : isPool
                        ? 'تفاصيل صفحة المسبح'
                        : isGym
                          ? 'تفاصيل صفحة النادي'
                          : isHealth
                            ? 'تفاصيل المنشأة الصحية'
                            : isSalon
                              ? 'تفاصيل الصالون'
                              : isCatalog
                                ? `تفاصيل تأجير ${catalogNoun}`
                                : isArtist
                                  ? 'تفاصيل صفحة الفنان'
                                  : isPhoto
                                    ? 'تفاصيل جلسة التصوير'
                                    : 'تفاصيل الصفحة'}
            </Text>
            <Text style={styles.hint}>
              {isHotel
                ? 'الغرف تُضاف لاحقاً كخدمات داخل المنشأة عبر «إضافة غرفة».'
                : isChalet || isHall || isArtist
                  ? 'الباقات تُضاف لاحقاً كخدمات داخل المنشأة عبر «إضافة باقة».'
                  : isSport
                    ? 'فترات الأسعار تُضاف لاحقاً كخدمة داخل المنشأة.'
                    : isPool
                      ? 'باقات اليوم الكامل أو فترات الساعة تُضاف لاحقاً داخل المنشأة عبر «إضافة باقة».'
                      : isGym
                        ? 'باقات الاشتراك (بالأيام أو الأشهر) تُضاف لاحقاً داخل المنشأة عبر «إضافة باقة».'
                        : isHealth || isSalon || isPhoto
                          ? 'الخدمات والمواعيد تُضاف لاحقاً داخل المنشأة مع مدة كل خدمة.'
                          : isCatalog
                            ? isApparel
                              ? 'المنتجات تُضاف لاحقاً داخل المنشأة مع المقاس واللون ووسائل الراحة وسعر اليوم — وتظهر مباشرة في التصنيف.'
                              : `${catalogNoun} تُضاف لاحقاً داخل المنشأة مع المواصفات ووسائل الراحة وسعر اليوم — وتظهر للعميل مباشرة في التصنيف.`
                            : 'أضف التفاصيل التي تظهر للعميل في صفحة المنشأة.'}
            </Text>

            {isSport ? (
              <>
                <Text style={styles.subSection}>مواصفات الملعب</Text>
                <View style={styles.steppers}>
                  <QuantityStepper
                    label="الحد الأقصى للاعبين"
                    value={maxPlayers}
                    onChange={setMaxPlayers}
                    min={2}
                  />
                </View>
                {maxPlayers != null && playersPerSide != null ? (
                  <Text style={styles.meta}>
                    يظهر للعميل: {maxPlayers} لاعب كحد أقصى ({playersPerSide} ×{' '}
                    {playersPerSide})
                  </Text>
                ) : null}
                <View style={styles.timeRow}>
                  <View style={[styles.field, styles.timeField]}>
                    <Text style={styles.label}>الطول (متر)</Text>
                    <TextInput
                      style={styles.input}
                      value={fieldLength}
                      onChangeText={setFieldLength}
                      keyboardType="decimal-pad"
                      placeholder="40"
                      placeholderTextColor={theme.colors.textSecondary}
                      textAlign="center"
                    />
                  </View>
                  <View style={[styles.field, styles.timeField]}>
                    <Text style={styles.label}>العرض (متر)</Text>
                    <TextInput
                      style={styles.input}
                      value={fieldWidth}
                      onChangeText={setFieldWidth}
                      keyboardType="decimal-pad"
                      placeholder="21"
                      placeholderTextColor={theme.colors.textSecondary}
                      textAlign="center"
                    />
                  </View>
                </View>
                {fieldLength.trim() && fieldWidth.trim() ? (
                  <Text style={styles.meta}>
                    يظهر للعميل: {fieldLength.trim()} × {fieldWidth.trim()} متر مربع
                  </Text>
                ) : null}
              </>
            ) : null}

            {isPool ? (
              <>
                <Text style={styles.subSection}>مواصفات المسبح</Text>
                <View style={styles.steppers}>
                  <QuantityStepper
                    label="الحد الأقصى للمرتادين"
                    value={maxPlayers}
                    onChange={setMaxPlayers}
                    min={1}
                  />
                </View>
                {maxPlayers != null ? (
                  <Text style={styles.meta}>
                    يظهر للعميل: {maxPlayers} مرتاد كحد أقصى
                  </Text>
                ) : null}
              </>
            ) : null}

            {isChalet ? (
              <>
                <Text style={styles.subSection}>مواصفات ال{stayNoun}</Text>
                <View style={styles.steppers}>
                  {!isTairaman ? (
                    <QuantityStepper
                      label="الحد الأقصى لعدد الأشخاص"
                      value={maxGuests}
                      onChange={setMaxGuests}
                      min={1}
                    />
                  ) : (
                    <Text style={styles.hintInline}>
                      سعة الأشخاص تُحدد داخل كل باقة. عدد الطيرمانات المتاحة
                      يُضبط هنا للمنشأة.
                    </Text>
                  )}
                  <QuantityStepper
                    label={`عدد ${stayNounPlural} المتاحة`}
                    value={inventory}
                    onChange={(n) => setInventory(Math.max(1, n ?? 1))}
                    min={1}
                  />
                  <QuantityStepper
                    label="حمامات"
                    value={bathrooms}
                    onChange={setBathrooms}
                    min={0}
                    accessory={
                      <CompactImageAttach
                        urls={bathroomImages}
                        onChange={setBathroomImages}
                        max={8}
                        showThumbs={false}
                      />
                    }
                    accessoryFooter={
                      bathroomImages.length ? (
                        <CompactImageAttach
                          urls={bathroomImages}
                          onChange={setBathroomImages}
                          max={8}
                          showButton={false}
                        />
                      ) : null
                    }
                  />
                  <QuantityStepper
                    label="غرف نوم"
                    value={bedrooms}
                    onChange={setBedrooms}
                    min={0}
                    accessory={
                      <CompactImageAttach
                        urls={bedroomImages}
                        onChange={setBedroomImages}
                        max={8}
                        showThumbs={false}
                      />
                    }
                    accessoryFooter={
                      bedroomImages.length ? (
                        <CompactImageAttach
                          urls={bedroomImages}
                          onChange={setBedroomImages}
                          max={8}
                          showButton={false}
                        />
                      ) : null
                    }
                  />
                  <QuantityStepper
                    label="مجالس"
                    value={majlis}
                    onChange={setMajlis}
                    min={0}
                    accessory={
                      <CompactImageAttach
                        urls={majlisImages}
                        onChange={setMajlisImages}
                        max={8}
                        showThumbs={false}
                      />
                    }
                    accessoryFooter={
                      majlisImages.length ? (
                        <CompactImageAttach
                          urls={majlisImages}
                          onChange={setMajlisImages}
                          max={8}
                          showButton={false}
                        />
                      ) : null
                    }
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>رابط جولة 360°</Text>
                  <Text style={styles.hintInline}>اختياري — إن تُرك فارغاً يفتح الموقع على الخريطة</Text>
                  <TextInput
                    style={styles.input}
                    value={tourUrl}
                    onChangeText={setTourUrl}
                    placeholder="https://…"
                    placeholderTextColor={theme.colors.textSecondary}
                    textAlign="left"
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </>
            ) : null}

            {!isCatalog ? (
              <DynamicLineList
                label={
                  isSport
                    ? 'مرافق الملعب'
                    : isPool
                      ? 'مرافق المسبح'
                      : isGym
                        ? 'مرافق النادي'
                        : 'المساحات المتوفرة'
                }
                hint={
                  isSport
                    ? 'مثال: إضاءة، كرات، مدرج'
                    : isPool
                      ? 'مثال: غرف تبديل، دشات، موقف'
                      : isGym
                        ? 'مثال: صالة أوزان، غرف تبديل، موقف'
                        : isChalet
                          ? 'مثال: استيم، ساونا، سينما، مسبح كبار'
                          : isHall
                            ? 'مثال: موقف سيارات خارجي، مسرح، حديقة'
                            : isHealth
                              ? 'مثال: غرفة انتظار، مواقف'
                              : isSalon
                                ? 'مثال: منطقة انتظار'
                                : isArtist
                                  ? 'مثال: منطقة تجهيز'
                                  : isPhoto
                                    ? 'مثال: استوديو، خلفية تصوير'
                                    : 'مثال: موقف سيارات، مسبح…'
                }
                items={spaces}
                onChange={setSpaces}
                placeholder="اسم المساحة"
                addLabel="إضافة"
                renderAccessory={
                  isChalet
                    ? (label) => {
                        const key = label.trim();
                        if (!key) return null;
                        return (
                          <CompactImageAttach
                            urls={spaceImages[key] ?? []}
                            onChange={(urls) =>
                              setSpaceImages((prev) => {
                                const next = { ...prev };
                                if (urls.length) next[key] = urls;
                                else delete next[key];
                                return next;
                              })
                            }
                            max={8}
                            size="small"
                          />
                        );
                      }
                    : undefined
                }
              />
            ) : null}

            {!isCatalog ? (
              <DynamicLineList
                label={
                  isSport || isPool || isGym ? 'خدمات إضافية' : 'وسائل الراحة'
                }
                hint={
                  isSport
                    ? 'مثال: غرف تبديل، موقف سيارات'
                    : isPool
                      ? 'مثال: منقذ، كراسي استراحة، واي فاي'
                      : isGym
                        ? 'مثال: مدرب، تكييف، واي فاي، دشات'
                        : isChalet
                          ? 'مثال: مطبخ، موقف خارجي، تدفئة، شاشات'
                          : isHall
                            ? 'مثال: صوتيات، تكييف، إضاءة (اختياري)'
                            : isHealth
                              ? 'مثال: تكييف، واي فاي، صيدلية قريبة'
                              : isSalon
                                ? 'مثال: تكييف، واي فاي، مواقف'
                              : isArtist
                                ? 'مثال: صوتيات، إضاءة'
                                : isPhoto
                                  ? 'مثال: إضاءة احترافية، تعديل صور'
                                  : 'مثال: واي فاي، تكييف…'
                }
                items={amenities}
                onChange={setAmenities}
                placeholder="وسيلة راحة"
                addLabel="إضافة"
              />
            ) : (
              <Text style={styles.hintInline}>
                وسائل الراحة تُحدد داخل كل {isApparel ? 'منتج' : isTransport ? 'مركبة' : 'سيارة'} عند إضافتها.
              </Text>
            )}

            {!isSport ? (
            <View style={styles.field}>
              <Text style={styles.label}>ملاحظة العربون</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={depositNote}
                onChangeText={setDepositNote}
                placeholder={
                  isHotel
                    ? DEFAULT_HOTEL_DEPOSIT
                    : isHall
                      ? DEFAULT_HALL_DEPOSIT
                      : isTairaman
                        ? DEFAULT_TAIRAMAN_DEPOSIT
                        : isChalet
                          ? DEFAULT_CHALET_DEPOSIT
                          : serviceDefaults?.depositNote || 'سياسة العربون'
                }
                placeholderTextColor={theme.colors.textSecondary}
                textAlign="right"
                multiline
              />
            </View>
            ) : null}

            {showInsuranceFields ? (
              <>
                <Text style={styles.subSection}>التأمين على الممتلكات</Text>
                <Text style={styles.hintInline}>
                  اختياري — إن تُرك المبلغ فارغاً لن يظهر قسم التأمين للعملاء
                </Text>
                <View style={styles.field}>
                  <Text style={styles.label}>مبلغ التأمين (ريال جديد)</Text>
                  <TextInput
                    style={styles.input}
                    value={insuranceAmount}
                    onChangeText={setInsuranceAmount}
                    keyboardType="numeric"
                    placeholder="مثال: 150950"
                    placeholderTextColor={theme.colors.textSecondary}
                    textAlign="right"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>وصف مختصر للتأمين</Text>
                  <TextInput
                    style={styles.input}
                    value={insuranceMeta}
                    onChangeText={setInsuranceMeta}
                    placeholder={DEFAULT_INSURANCE_META}
                    placeholderTextColor={theme.colors.textSecondary}
                    textAlign="right"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>سياسة التأمين</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={insuranceNote}
                    onChangeText={setInsuranceNote}
                    placeholder={DEFAULT_INSURANCE_NOTE}
                    placeholderTextColor={theme.colors.textSecondary}
                    textAlign="right"
                    multiline
                  />
                </View>
              </>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>شروط المنشأة</Text>
              <Text style={styles.hintInline}>سطر لكل شرط</Text>
              <TextInput
                style={[styles.input, styles.textAreaTall]}
                value={termsText}
                onChangeText={setTermsText}
                textAlign="right"
                multiline
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                {isHotel ? 'سياسة الإلغاء' : 'بنود إضافية (اختياري)'}
              </Text>
              <Text style={styles.hintInline}>سطر لكل بند</Text>
              <TextInput
                style={[styles.input, styles.textAreaTall]}
                value={policyText}
                onChangeText={setPolicyText}
                textAlign="right"
                multiline
              />
            </View>
          </View>
        ) : null}

      </KeyboardAwareScrollView>

      {!keyboardOpen ? (
        <View style={styles.stickyFooter}>
          {error ? <Text style={styles.errorFooter}>{error}</Text> : null}
          <Pressable
            style={[styles.primaryBtn, saving && styles.btnDisabled]}
            disabled={saving}
            onPress={submit}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isEdit ? 'حفظ التعديلات' : 'إنشاء المنشأة'}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
      </FormKeyboardView>

      {!isEdit ? (
        <>
          <OptionPickerSheet
            visible={categoryOpen}
            title="التصنيف"
            subtitle="اختر تصنيف منشأتك"
            options={categories.map((c) => ({ id: c.id, name: c.name }))}
            selectedId={parentCategoryId}
            onClose={() => setCategoryOpen(false)}
            onSelect={(opt) => selectParentCategory(Number(opt.id))}
          />

          {hasSubcategories ? (
            <OptionPickerSheet
              visible={subCategoryOpen}
              title="التصنيف الفرعي"
              subtitle={`اختر نوعاً ضمن «${parentCategory?.name ?? 'التصنيف'}»`}
              options={subcategories.map((c) => ({ id: c.id, name: c.name }))}
              selectedId={categoryId}
              onClose={() => setSubCategoryOpen(false)}
              onSelect={(opt) => setCategoryId(Number(opt.id))}
            />
          ) : null}

          <CityPickerSheet
            visible={cityOpen}
            cities={cities}
            selectedCityId={cityId ?? undefined}
            title="المدينة"
            subtitle="اختر مدينة المنشأة"
            onClose={() => setCityOpen(false)}
            onSelect={(city) => setCityId(city.id)}
          />
        </>
      ) : null}

      {isHealth ? (
        <>
          <OptionPickerSheet
            visible={specialtyPickerOpen}
            title="التخصص"
            subtitle="اختر تخصصاً محفوظاً، أو عام للمستشفيات والعيادات العامة"
            options={specialties.map((name) => ({ id: name, name }))}
            selectedId={specialty.trim() || null}
            onClose={() => setSpecialtyPickerOpen(false)}
            onSelect={(opt) => setSpecialty(String(opt.name))}
            actionLabel="+ إضافة تخصص جديد"
            onAction={() => {
              setNewSpecialtyDraft('');
              setAddingSpecialty(true);
            }}
          />

          <SmoothBottomSheet
            visible={addingSpecialty}
            onClose={() => {
              setAddingSpecialty(false);
              setNewSpecialtyDraft('');
            }}
            sheetStyle={styles.specialtySheet}
          >
            <Text style={styles.specialtySheetTitle}>تخصص جديد</Text>
            <Text style={styles.specialtySheetHint}>
              يُحفظ التخصص ويظهر لاحقاً في قائمة الاختيار وفي تصفية الصحة.
            </Text>
            <TextInput
              style={styles.input}
              value={newSpecialtyDraft}
              onChangeText={setNewSpecialtyDraft}
              placeholder="مثال: جلدية"
              placeholderTextColor={theme.colors.textSecondary}
              textAlign="right"
              autoFocus
            />
            <Pressable
              style={styles.specialtySaveBtn}
              onPress={() => {
                const next = newSpecialtyDraft.trim().replace(/\s+/g, ' ');
                if (!next) {
                  setError('أدخل اسم التخصص');
                  return;
                }
                setSpecialty(next);
                setSpecialties((prev) => {
                  if (
                    prev.some(
                      (s) => s.trim().toLowerCase() === next.toLowerCase(),
                    )
                  ) {
                    return prev;
                  }
                  return [...prev, next].sort((a, b) => {
                    if (a === GENERAL_MEDICAL_SPECIALTY) return -1;
                    if (b === GENERAL_MEDICAL_SPECIALTY) return 1;
                    return a.localeCompare(b, 'ar');
                  });
                });
                setAddingSpecialty(false);
                setNewSpecialtyDraft('');
                setError(null);
              }}
            >
              <Text style={styles.specialtySaveBtnText}>حفظ التخصص</Text>
            </Pressable>
          </SmoothBottomSheet>
        </>
      ) : null}

      <SmoothBottomSheet
        visible={disableSheetOpen}
        onClose={() => {
          if (!togglingEnabled) setDisableSheetOpen(false);
        }}
        sheetStyle={styles.disableSheet}
      >
        <Text style={styles.disableSheetTitle}>سبب تعطيل المنشأة</Text>
        <Text style={styles.disableSheetHint}>
          سيظهر السبب للإدارة في صفحة الشكاوى. يمكنك إعادة تفعيل المنشأة لاحقاً.
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={disableReasonDraft}
          onChangeText={setDisableReasonDraft}
          placeholder="مثال: صيانة مؤقتة / سفر / إغلاق موسمي…"
          placeholderTextColor={theme.colors.textSecondary}
          textAlign="right"
          multiline
          autoFocus
        />
        <Pressable
          style={[styles.primaryBtn, togglingEnabled && styles.btnDisabled]}
          disabled={togglingEnabled}
          onPress={confirmDisable}
        >
          {togglingEnabled ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>تأكيد التعطيل</Text>
          )}
        </Pressable>
        <Pressable
          style={styles.disableCancel}
          disabled={togglingEnabled}
          onPress={() => setDisableSheetOpen(false)}
        >
          <Text style={styles.disableCancelText}>إلغاء</Text>
        </Pressable>
      </SmoothBottomSheet>
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
  scrollFlex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 24, gap: 16 },
  stickyFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    gap: 8,
  },
  errorFooter: {
    color: theme.colors.error,
    textAlign: 'center',
    fontSize: 13,
  },
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
  subSection: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    lineHeight: 18,
    marginTop: -6,
  },
  hintInline: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: -4,
  },
  locationError: {
    fontSize: 12,
    color: theme.colors.error,
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
  textAreaTall: { minHeight: 120, textAlignVertical: 'top' },
  steppers: { gap: 12 },
  timeRow: { flexDirection: 'row', gap: 10 },
  timeField: { flex: 1 },
  meta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    lineHeight: 18,
  },
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
  selectLocked: {
    backgroundColor: '#EEF2F6',
    opacity: 0.95,
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
  specialtySheet: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 12,
  },
  specialtySheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
    width: '100%',
  },
  specialtySheetHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
    width: '100%',
  },
  specialtySaveBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  specialtySaveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  enableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  enableText: { flex: 1, gap: 4 },
  enableTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  enableHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    lineHeight: 18,
  },
  enableReason: {
    fontSize: 12,
    color: theme.colors.primary,
    textAlign: 'right',
    lineHeight: 18,
    marginTop: 4,
    fontWeight: '600',
  },
  disableSheet: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  disableSheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  disableSheetHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
  },
  disableCancel: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  disableCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
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
});
