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
import { CloudinaryImagePicker } from './CloudinaryImagePicker';
import { DynamicLineList } from './DynamicLineList';
import { OptionPickerSheet } from './OptionPickerSheet';

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
const DEFAULT_INSURANCE_META = 'قطعة ذهب';
const DEFAULT_INSURANCE_NOTE =
  'يدفع مبلغ التأمين للإدارة عند الوصول ويُسترجع بعد انتهاء الحجز بشرط سلامة الممتلكات حسب سياسة المنشأة.';

function isHotelCategory(name?: string | null) {
  return /فنادق|فندق|hotel/i.test(name ?? '');
}

function isChaletCategory(name?: string | null) {
  return /شالي|chalet/i.test(name ?? '');
}

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
  const [images, setImages] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);
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
  const [cityOpen, setCityOpen] = useState(false);

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
  const [insuranceAmount, setInsuranceAmount] = useState('');
  const [insuranceMeta, setInsuranceMeta] = useState(DEFAULT_INSURANCE_META);
  const [insuranceNote, setInsuranceNote] = useState(DEFAULT_INSURANCE_NOTE);
  const [tourUrl, setTourUrl] = useState('');
  const [facilityEnabled, setFacilityEnabled] = useState(true);
  const [togglingEnabled, setTogglingEnabled] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

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
  const categoryName = selectedCategory?.name ?? lockedCategoryName;
  const isHotel = isHotelCategory(categoryName);
  const isChalet = isChaletCategory(categoryName);
  const hasDetailCard = isHotel || isChalet;

  const applyCategoryDefaults = useCallback((kind: 'hotel' | 'chalet' | 'other') => {
    if (kind === 'hotel') {
      setSpaces(DEFAULT_HOTEL_SPACES);
      setAmenities(DEFAULT_HOTEL_AMENITIES);
      setDepositNote(DEFAULT_HOTEL_DEPOSIT);
      setTermsText(listToLines(DEFAULT_HOTEL_TERMS));
      setPolicyText(listToLines(DEFAULT_HOTEL_POLICY));
      setMaxGuests(undefined);
      setBathrooms(undefined);
      setBedrooms(undefined);
      setMajlis(undefined);
      setInsuranceAmount('');
      setInsuranceMeta(DEFAULT_INSURANCE_META);
      setInsuranceNote(DEFAULT_INSURANCE_NOTE);
      setTourUrl('');
    } else if (kind === 'chalet') {
      setSpaces(DEFAULT_CHALET_SPACES);
      setAmenities(DEFAULT_CHALET_AMENITIES);
      setDepositNote(DEFAULT_CHALET_DEPOSIT);
      setTermsText(listToLines(DEFAULT_CHALET_TERMS));
      setPolicyText('');
      setMaxGuests(8);
      setInventory(1);
      setBathrooms(4);
      setBedrooms(2);
      setMajlis(1);
      setInsuranceAmount('');
      setInsuranceMeta(DEFAULT_INSURANCE_META);
      setInsuranceNote(DEFAULT_INSURANCE_NOTE);
      setTourUrl('');
    }
  }, []);

  useEffect(() => {
    if (isEdit || !selectedCategory) return;
    const kind = isHotel ? 'hotel' : isChalet ? 'chalet' : 'other';
    const key = `${kind}:${selectedCategory.id}`;
    if (defaultsAppliedFor.current === key) return;
    defaultsAppliedFor.current = key;
    if (kind !== 'other') applyCategoryDefaults(kind);
  }, [applyCategoryDefaults, isChalet, isEdit, isHotel, selectedCategory]);

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
          setCategoryId(me.categoryId ?? roots[0]?.id ?? null);
          setLockedCategoryName(me.category?.name ?? null);
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
          setFacilityEnabled(me.status !== 'SUSPENDED');
          defaultsAppliedFor.current = `loaded:${me.id}`;
        } else {
          const preferred =
            roots.find((c) => isChaletCategory(c.name)) ??
            roots.find((c) => isHotelCategory(c.name)) ??
            roots[0] ??
            null;
          setCategoryId(preferred?.id ?? null);
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

  const submit = useCallback(async () => {
    if (!businessName.trim()) {
      setError('أدخل اسم المنشأة');
      return;
    }
    if (!categoryId) {
      setError('اختر التصنيف');
      return;
    }
    if (isChalet && (maxGuests == null || maxGuests < 1)) {
      setError('أدخل الحد الأقصى للأشخاص');
      return;
    }
    if (isChalet && (!inventory || inventory < 1)) {
      setError('أدخل عدد الشاليهات المتاحة');
      return;
    }
    setSaving(true);
    setError(null);

    let attributes: Record<string, unknown> | undefined;
    if (isHotel) {
      attributes = {
        ...existingAttributes,
        spaces: cleanList(spaces),
        amenities: cleanList(amenities),
        depositNote: depositNote.trim() || DEFAULT_HOTEL_DEPOSIT,
        terms: linesToList(termsText),
        policyBullets: linesToList(policyText),
      };
    } else if (isChalet) {
      const guests = Math.max(1, Math.floor(Number(maxGuests)));
      const units = Math.max(1, Math.floor(Number(inventory)));
      attributes = {
        ...existingAttributes,
        spaces: cleanList(spaces),
        amenities: cleanList(amenities),
        depositNote: depositNote.trim() || DEFAULT_CHALET_DEPOSIT,
        terms: linesToList(termsText),
        policyBullets: linesToList(policyText),
        maxGuests: guests,
        capacity: guests,
        guests,
        inventory: units,
        units,
      };
      if (bathrooms != null && bathrooms > 0) attributes.bathrooms = bathrooms;
      if (bedrooms != null && bedrooms > 0) {
        attributes.bedrooms = bedrooms;
        attributes.rooms = bedrooms;
      }
      if (majlis != null && majlis > 0) attributes.majlis = majlis;
      const ins = parseOptionalAmount(insuranceAmount);
      if (ins != null) attributes.insuranceAmount = ins;
      if (insuranceMeta.trim()) attributes.insuranceMeta = insuranceMeta.trim();
      if (insuranceNote.trim()) attributes.insuranceNote = insuranceNote.trim();
      if (tourUrl.trim()) attributes.tourUrl = tourUrl.trim();
      else delete attributes.tourUrl;
    }

    const payload = {
      businessName: businessName.trim(),
      description: description.trim() || undefined,
      addressDetails: addressDetails.trim() || undefined,
      cancellationPolicy:
        isHotel || isChalet ? depositNote.trim() || undefined : undefined,
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
            services.map((s) =>
              container.serviceApi.seedAvailabilities(s.id, {
                days: 90,
                totalCapacity: units,
              }),
            ),
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
    amenities,
    bathrooms,
    bedrooms,
    businessName,
    maxGuests,
    inventory,
    categoryId,
    cityId,
    container,
    depositNote,
    description,
    existingAttributes,
    images,
    insuranceAmount,
    insuranceMeta,
    insuranceNote,
    isChalet,
    isEdit,
    isHotel,
    majlis,
    navigation,
    policyText,
    providerId,
    setUser,
    spaces,
    termsText,
    tourUrl,
    user,
  ]);

  const toggleFacilityEnabled = async () => {
    if (!providerId || togglingEnabled) return;
    const next = !facilityEnabled;
    setTogglingEnabled(true);
    setError(null);
    try {
      const updated = await container.providerApi.setEnabled(providerId, next);
      setFacilityEnabled(updated.status !== 'SUSPENDED');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحديث حالة المنشأة');
    } finally {
      setTogglingEnabled(false);
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

  const title = isEdit
    ? 'تعديل المنشأة'
    : isHotel
      ? 'إضافة فندق'
      : isChalet
        ? 'إضافة شاليه'
        : 'منشأة جديدة';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
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
        bottomOffset={48}
      >
        <CloudinaryImagePicker urls={images} onChange={setImages} label="صور المنشأة" />

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
                  : isChalet
                    ? 'مثال: شالية رقم 1 (VIP)'
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
                  {categoryName ?? '—'}
                </Text>
              </View>
            ) : (
              <Pressable style={styles.select} onPress={() => setCategoryOpen(true)}>
                <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                <Text
                  style={[
                    styles.selectValue,
                    !selectedCategory && styles.selectPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selectedCategory?.name ?? 'اختر التصنيف'}
                </Text>
              </Pressable>
            )}
          </View>

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
            <Text style={styles.label}>
              {isHotel
                ? 'عن الفنادق (الوصف)'
                : isChalet
                  ? 'عن الشاليهات (الوصف)'
                  : 'الوصف'}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={
                isHotel
                  ? 'نبذة تظهر تحت «عن الفنادق»'
                  : isChalet
                    ? 'مثال: إقامة لليلة واحدة مع مسبح خاص'
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
                onValueChange={() => void toggleFacilityEnabled()}
                disabled={togglingEnabled}
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
                    : 'إخفاء المنشأة من البحث — لن يتمكن العملاء من حجزها'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {hasDetailCard ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {isHotel ? 'تفاصيل صفحة الفندق' : 'تفاصيل صفحة الشاليه'}
            </Text>
            <Text style={styles.hint}>
              {isHotel
                ? 'الغرف تُضاف لاحقاً كخدمات داخل المنشأة عبر «إضافة غرفة».'
                : 'الباقات تُضاف لاحقاً كخدمات داخل المنشأة عبر «إضافة باقة».'}
            </Text>

            {isChalet ? (
              <>
                <Text style={styles.subSection}>مواصفات الشاليه</Text>
                <View style={styles.steppers}>
                  <QuantityStepper
                    label="الحد الأقصى لعدد الأشخاص"
                    value={maxGuests}
                    onChange={setMaxGuests}
                    min={1}
                  />
                  <QuantityStepper
                    label="عدد الشاليهات المتاحة"
                    value={inventory}
                    onChange={(n) => setInventory(Math.max(1, n ?? 1))}
                    min={1}
                  />
                  <QuantityStepper
                    label="حمامات"
                    value={bathrooms}
                    onChange={setBathrooms}
                    min={0}
                  />
                  <QuantityStepper
                    label="غرف نوم"
                    value={bedrooms}
                    onChange={setBedrooms}
                    min={0}
                  />
                  <QuantityStepper
                    label="مجالس"
                    value={majlis}
                    onChange={setMajlis}
                    min={0}
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

            <DynamicLineList
              label="المساحات المتوفرة"
              hint={
                isChalet
                  ? 'مثال: استيم، ساونا، سينما، مسبح كبار'
                  : 'مثال: موقف سيارات، مسبح…'
              }
              items={spaces}
              onChange={setSpaces}
              placeholder="اسم المساحة"
              addLabel="إضافة"
            />

            <DynamicLineList
              label="وسائل الراحة"
              hint={
                isChalet
                  ? 'مثال: مطبخ، موقف خارجي، تدفئة، شاشات'
                  : 'مثال: واي فاي، تكييف…'
              }
              items={amenities}
              onChange={setAmenities}
              placeholder="وسيلة راحة"
              addLabel="إضافة"
            />

            <View style={styles.field}>
              <Text style={styles.label}>ملاحظة العربون</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={depositNote}
                onChangeText={setDepositNote}
                placeholder={isHotel ? DEFAULT_HOTEL_DEPOSIT : DEFAULT_CHALET_DEPOSIT}
                placeholderTextColor={theme.colors.textSecondary}
                textAlign="right"
                multiline
              />
            </View>

            {isChalet ? (
              <>
                <Text style={styles.subSection}>التأمين على الممتلكات</Text>
                <View style={styles.field}>
                  <Text style={styles.label}>مبلغ التأمين (ريال جديد)</Text>
                  <Text style={styles.hintInline}>
                    اختياري — إن تُرك فارغاً يُحسب 10% من سعر الباقة
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={insuranceAmount}
                    onChangeText={setInsuranceAmount}
                    keyboardType="numeric"
                    placeholder="مثال: 32000"
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
            selectedId={categoryId}
            onClose={() => setCategoryOpen(false)}
            onSelect={(opt) => setCategoryId(Number(opt.id))}
          />

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
