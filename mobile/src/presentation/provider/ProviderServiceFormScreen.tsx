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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEPOSIT_PERCENTAGE } from '../../core/common/bookingConstants';
import {
  CurrencyCode,
  readServicePrices,
  type ServicePrices,
} from '../../core/common/currency';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { RootStackParamList } from '../navigation/types';
import { CloudinaryImagePicker } from './CloudinaryImagePicker';

type Props = NativeStackScreenProps<RootStackParamList, 'ProviderServiceForm'>;

/** Open this many nights ahead so stay calendars are bookable on create. */
const SEED_DAYS = 90;

const PRICE_FIELDS: { code: CurrencyCode; label: string; placeholder: string }[] = [
  { code: 'NEW_YER', label: 'ريال يمني جديد', placeholder: '0' },
  { code: 'OLD_YER', label: 'ريال يمني قديم', placeholder: '0' },
  { code: 'SAR', label: 'ريال سعودي', placeholder: '0' },
  { code: 'USD', label: 'دولار أمريكي', placeholder: '0' },
];

type PackagePeriod = 'MORNING' | 'EVENING' | 'PER_NIGHT';

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

function isHotelCategory(name?: string | null) {
  return /فنادق|فندق|hotel/i.test(name ?? '');
}

function isChaletCategory(name?: string | null) {
  return /شالي|chalet/i.test(name ?? '');
}

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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [prices, setPrices] = useState<Record<CurrencyCode, string>>(emptyPriceInputs);
  const [capacity, setCapacity] = useState<number | undefined>();
  const [beds, setBeds] = useState<number | undefined>();
  const [period, setPeriod] = useState<PackagePeriod>('PER_NIGHT');
  const [fromTime, setFromTime] = useState(DEFAULT_PERIOD_TIMES.MORNING.from);
  const [toTime, setToTime] = useState(DEFAULT_PERIOD_TIMES.MORNING.to);
  const [images, setImages] = useState<string[]>([]);
  const [inventory, setInventory] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [facilityMaxGuests, setFacilityMaxGuests] = useState<number | undefined>();
  const [facilityInventory, setFacilityInventory] = useState(1);

  const load = useCallback(async () => {
    try {
      const facility = await container.providerApi.getMineById(providerId);
      const catName = facility.category?.name;
      const hotel = isHotelCategory(catName);
      const chalet = isChaletCategory(catName);
      setIsHotel(hotel);
      setIsChalet(chalet);
      const fa = (facility.attributes ?? {}) as Record<string, unknown>;
      setFacilityMaxGuests(
        toOptionalNum(fa.maxGuests) ??
          toOptionalNum(fa.capacity) ??
          toOptionalNum(fa.guests),
      );
      const facilityUnits =
        toOptionalNum(fa.inventory) ?? toOptionalNum(fa.units) ?? 1;
      setFacilityInventory(facilityUnits > 0 ? facilityUnits : 1);

      if (serviceId) {
        const list = await container.serviceApi.listMine(providerId);
        const svc = list.find((s) => s.id === serviceId);
        if (!svc) {
          setError(chalet ? 'الباقة غير موجودة' : hotel ? 'الغرفة غير موجودة' : 'الخدمة غير موجودة');
          return;
        }
        setName(svc.name);
        setDescription(svc.description ?? '');
        setBasePrice(String(svc.basePrice ?? ''));
        setImages(svc.images ?? []);
        const a = svc.attributes ?? {};
        if (!chalet) {
          setCapacity(toOptionalNum(a.capacity) ?? toOptionalNum(a.guests));
          setBeds(
            toOptionalNum(a.beds) ??
              toOptionalNum(a.rooms) ??
              toOptionalNum(a.bedrooms),
          );
        }
        const storedPeriod = parseStoredPeriod(a);
        setPeriod(storedPeriod);
        if (storedPeriod === 'MORNING' || storedPeriod === 'EVENING') {
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
        if (!chalet) {
          const units =
            toOptionalNum(a.inventory) ??
            toOptionalNum(a.units) ??
            (svc.availabilities?.[0]?.totalCapacity ?? 1);
          setInventory(units && units > 0 ? units : 1);
        } else {
          setInventory(facilityUnits > 0 ? facilityUnits : 1);
        }

        const saved = readServicePrices(a, svc.basePrice);
        setPrices({
          NEW_YER: saved.NEW_YER != null ? String(saved.NEW_YER) : String(svc.basePrice ?? ''),
          OLD_YER: saved.OLD_YER != null ? String(saved.OLD_YER) : '',
          SAR: saved.SAR != null ? String(saved.SAR) : '',
          USD: saved.USD != null ? String(saved.USD) : '',
        });
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

  const useMultiCurrency = isHotel || isChalet;
  const entityLabel = isHotel ? 'الغرفة' : isChalet ? 'الباقة' : 'الخدمة';
  const entityLabelIndef = isHotel ? 'غرفة' : isChalet ? 'باقة' : 'خدمة';

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(`أدخل اسم ${entityLabelIndef}`);
      return;
    }

    let newYerPrice: number;
    let multiPrices: ServicePrices | undefined;

    if (useMultiCurrency) {
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
      (period === 'MORNING' || period === 'EVENING') &&
      (!isValidTime(fromTime) || !isValidTime(toTime))
    ) {
      setError('أدخل وقت البداية والنهاية بصيغة ساعة:دقيقة (مثال 08:00)');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const attributes: Record<string, unknown> = {};

      if (isChalet) {
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
        description: description.trim() || undefined,
        basePrice: newYerPrice,
        depositPercentage: DEPOSIT_PERCENTAGE,
        images,
        attributes,
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

      if (id && (isHotel || isChalet || !isEdit)) {
        const capacity = isChalet
          ? Math.max(1, facilityInventory)
          : Math.max(1, inventory);
        await container.serviceApi.seedAvailabilities(id, {
          days: SEED_DAYS,
          totalCapacity: capacity,
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
        bottomOffset={40}
      >
        <CloudinaryImagePicker
          urls={images}
          onChange={setImages}
          label={`صور ${entityLabel}`}
        />

        <View style={styles.card}>
          {isHotel || isChalet ? (
            <Text style={styles.hint}>
              {isHotel
                ? 'الغرف هي خدمات الفندق — تظهر في «استعراض الغرف» على صفحة التفاصيل.'
                : 'الباقات هي خدمات الشاليه — تظهر في قسم «الغرف والباقات» على صفحة التفاصيل.'}
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
                  : isChalet
                    ? 'مثال: ليلة في الشاليه'
                    : 'اسم الخدمة'
              }
              placeholderTextColor={theme.colors.textSecondary}
              textAlign="right"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>الوصف</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={
                isHotel
                  ? 'وصف الغرفة والمرافق'
                  : isChalet
                    ? 'وصف الباقة وما تشمله'
                    : 'وصف الخدمة'
              }
              placeholderTextColor={theme.colors.textSecondary}
              textAlign="right"
              multiline
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>الأسعار</Text>
          {useMultiCurrency ? (
            <>
              <Text style={styles.hint}>
                أدخل السعر بكل العملات — يظهر للعميل حسب عملته المختارة.
              </Text>
              {PRICE_FIELDS.map(({ code, label, placeholder }) => (
                <View key={code} style={styles.field}>
                  <Text style={styles.label}>{label}</Text>
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
            {isHotel ? 'الغرف' : isChalet ? 'الباقات' : 'الخدمات'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>التفاصيل</Text>
          {isChalet ? (
            <Text style={styles.hint}>
              مواصفات الشاليه (الأشخاص، الحمامات، الغرف…) تؤخذ من تفاصيل المنشأة.
            </Text>
          ) : null}
          <View style={styles.steppers}>
            {isChalet ? (
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
            ) : (
              <>
                <QuantityStepper
                  label="السعة (أشخاص)"
                  value={capacity}
                  onChange={setCapacity}
                  min={0}
                />
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
            يُفتح التقويم تلقائياً لـ {SEED_DAYS} يوماً القادمة
          </Text>
        </View>

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
