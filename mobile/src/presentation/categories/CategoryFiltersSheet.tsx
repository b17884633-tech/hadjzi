import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { DualRangeSlider } from '../../core/ui/components/DualRangeSlider';
import { FilterIcon } from '../../core/ui/components/FilterIcon';
import { SmoothBottomSheet } from '../../core/ui/components/SmoothBottomSheet';
import { theme } from '../../core/ui/theme';
import { Destination } from '../../domain/model/Search';
import { addDaysIso, toIsoDate } from '../booking/bookingFlow';
import {
  CategoryFilterValues,
  RATING_OPTIONS,
  emptyCategoryFilters,
  resolveCategoryFilterProfile,
  type FilterFieldKey,
} from './categoryFilters';

const PRICE_MIN = 0;
const PRICE_MAX = 500_000;
const PRICE_STEP = 1_000;
const DISTANCE_MIN = 1;
const DISTANCE_MAX = 50;
const MUTED = '#6B7280';
const LINE = '#EEF2F6';

type Props = {
  visible: boolean;
  onClose: () => void;
  categoryName?: string | null;
  bookingType?: string | null;
  cities: Destination[];
  initial: CategoryFilterValues;
  onApply: (filters: CategoryFilterValues) => void;
};

function todayIso() {
  const n = new Date();
  return toIsoDate(n.getFullYear(), n.getMonth(), n.getDate());
}

export function CategoryFiltersSheet({
  visible,
  onClose,
  categoryName,
  bookingType,
  cities,
  initial,
  onApply,
}: Props) {
  const profile = useMemo(
    () => resolveCategoryFilterProfile(categoryName, bookingType),
    [categoryName, bookingType],
  );

  const [draft, setDraft] = useState<CategoryFilterValues>(initial);
  const [cityOpen, setCityOpen] = useState(false);
  const [priceMin, setPriceMin] = useState(PRICE_MIN);
  const [priceMax, setPriceMax] = useState(PRICE_MAX);
  const [minText, setMinText] = useState('');
  const [maxText, setMaxText] = useState('');
  const [distanceKm, setDistanceKm] = useState(DISTANCE_MAX);
  const [distanceText, setDistanceText] = useState('');
  const [distanceActive, setDistanceActive] = useState(false);
  const [priceActive, setPriceActive] = useState(false);
  const cityOptions = cities.slice(0, 40);

  useEffect(() => {
    if (!visible) return;
    setDraft(initial);
    const hasPrice = initial.minPrice != null || initial.maxPrice != null;
    setPriceActive(hasPrice);
    const lo = initial.minPrice ?? PRICE_MIN;
    const hi = initial.maxPrice ?? PRICE_MAX;
    setPriceMin(lo);
    setPriceMax(hi);
    setMinText(hasPrice ? String(lo) : '');
    setMaxText(hasPrice ? String(hi) : '');
    setDistanceActive(initial.maxDistanceKm != null);
    const d = initial.maxDistanceKm ?? DISTANCE_MAX;
    setDistanceKm(d);
    setDistanceText(initial.maxDistanceKm != null ? String(d) : '');
    setCityOpen(false);
  }, [visible, initial]);

  const has = (key: FilterFieldKey) => profile.fields.includes(key);

  const setNum = (key: keyof CategoryFilterValues, value?: number) => {
    setDraft((prev) => {
      const next = { ...prev };
      if (value == null || Number.isNaN(value)) delete next[key];
      else (next as Record<string, unknown>)[key] = value;
      return next;
    });
  };

  const setPriceRange = (lo: number, hi: number) => {
    const a = Math.min(lo, hi);
    const b = Math.max(lo, hi);
    setPriceActive(true);
    setPriceMin(a);
    setPriceMax(b);
    setMinText(String(Math.round(a)));
    setMaxText(String(Math.round(b)));
  };

  const commitMinText = (raw: string) => {
    setMinText(raw);
    const n = Number(raw.replace(/,/g, ''));
    if (raw.trim() === '' || Number.isNaN(n)) return;
    setPriceActive(true);
    setPriceMin(Math.min(Math.max(n, PRICE_MIN), priceMax));
  };

  const commitMaxText = (raw: string) => {
    setMaxText(raw);
    const n = Number(raw.replace(/,/g, ''));
    if (raw.trim() === '' || Number.isNaN(n)) return;
    setPriceActive(true);
    setPriceMax(Math.max(Math.min(n, PRICE_MAX), priceMin));
  };

  const commitDistanceText = (raw: string) => {
    setDistanceText(raw);
    const n = Number(raw.replace(/,/g, ''));
    if (raw.trim() === '' || Number.isNaN(n)) return;
    setDistanceActive(true);
    setDistanceKm(Math.min(DISTANCE_MAX, Math.max(DISTANCE_MIN, Math.round(n))));
  };

  const apply = () => {
    const next: CategoryFilterValues = { ...draft };
    if (priceActive) {
      next.minPrice = Math.round(priceMin);
      next.maxPrice = Math.round(priceMax);
    } else {
      delete next.minPrice;
      delete next.maxPrice;
    }
    if (distanceActive) next.maxDistanceKm = Math.round(distanceKm);
    else delete next.maxDistanceKm;
    onApply(next);
    onClose();
  };

  const reset = () => {
    setDraft(emptyCategoryFilters());
    setPriceMin(PRICE_MIN);
    setPriceMax(PRICE_MAX);
    setMinText('');
    setMaxText('');
    setPriceActive(false);
    setDistanceKm(DISTANCE_MAX);
    setDistanceText('');
    setDistanceActive(false);
    setCityOpen(false);
  };

  const mode = profile.availabilityMode;

  return (
    <SmoothBottomSheet visible={visible} onClose={onClose} sheetStyle={styles.sheet}>
      <View style={styles.heading}>
        <Text style={styles.title}>تصفية النتائج</Text>
        <Text style={styles.subtitle}>
          خصّص البحث حسب بيانات {categoryName || 'هذا التصنيف'}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.body}
      >
        {has('price') ? (
          <Section
            title="نطاق السعر (ر.ي)"
            trailing={priceActive ? `${fmt(priceMin)} – ${fmt(priceMax)}` : 'الكل'}
          >
            <View style={styles.inputsRow}>
              <Field
                label="إلى (أقصى)"
                value={maxText}
                onChangeText={commitMaxText}
                placeholder={String(PRICE_MAX)}
              />
              <Field
                label="من (أدنى)"
                value={minText}
                onChangeText={commitMinText}
                placeholder={String(PRICE_MIN)}
              />
            </View>
            <View style={styles.sliderPad}>
              <DualRangeSlider
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={PRICE_STEP}
                low={priceMin}
                high={priceMax}
                rtl
                onChange={setPriceRange}
              />
            </View>
          </Section>
        ) : null}

        {has('place') ? (
          <Section title="المدينة">
            <Pressable style={styles.select} onPress={() => setCityOpen((o) => !o)}>
              <Ionicons name="location-outline" size={18} color={theme.colors.accentDark} />
              <Text style={[styles.selectText, !draft.cityName && styles.placeholder]}>
                {draft.cityName ?? 'اختر المدينة'}
              </Text>
              <Ionicons
                name={cityOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={MUTED}
              />
            </Pressable>
            {cityOpen ? (
              <View style={styles.cityList}>
                {cityOptions.map((city) => {
                  const selected = draft.cityId === city.id;
                  return (
                    <Pressable
                      key={city.id}
                      style={[styles.cityRow, selected && styles.cityRowOn]}
                      onPress={() => {
                        setDraft((prev) => ({
                          ...prev,
                          cityId: city.id,
                          cityName: city.name,
                        }));
                        setCityOpen(false);
                      }}
                    >
                      <Text style={[styles.cityName, selected && styles.cityNameOn]}>
                        {city.name}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark" size={16} color={theme.colors.accent} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </Section>
        ) : null}

        {has('distance') ? (
          <Section
            title="المسافة القصوى"
            trailing={distanceActive ? `${Math.round(distanceKm)} كم` : 'الكل'}
          >
            <Field
              label="كم"
              value={distanceText}
              onChangeText={commitDistanceText}
              placeholder={String(DISTANCE_MAX)}
            />
            <View style={styles.sliderPad}>
              <Slider
                style={styles.slider}
                minimumValue={DISTANCE_MIN}
                maximumValue={DISTANCE_MAX}
                step={1}
                value={distanceKm}
                onValueChange={(v) => {
                  setDistanceActive(true);
                  setDistanceKm(v);
                  setDistanceText(String(Math.round(v)));
                }}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor="#E5EAF0"
                thumbTintColor={theme.colors.accent}
              />
              <View style={styles.scaleRow}>
                <Text style={styles.scale}>{DISTANCE_MAX} كم</Text>
                <Text style={styles.scale}>{DISTANCE_MIN} كم</Text>
              </View>
            </View>
          </Section>
        ) : null}

        {has('availability') && mode !== 'none' ? (
          <Section title="التوفر">
            <Text style={styles.hint}>
              {mode === 'date_range'
                ? 'اختر تاريخ الدخول والخروج لعرض المتاح فقط'
                : mode === 'date_time'
                  ? 'اختر التاريخ والوقت لعرض المنشآت المتاحة'
                  : mode === 'date_period'
                    ? 'اختر تاريخ المناسبة والفترة'
                    : 'اختر التاريخ المطلوب'}
            </Text>
            <View style={styles.quickRow}>
              <Quick
                label="اليوم"
                onPress={() =>
                  setDraft((p) => ({
                    ...p,
                    availableDate: todayIso(),
                    availableEndDate:
                      mode === 'date_range' ? addDaysIso(todayIso(), 1) : undefined,
                  }))
                }
              />
              <Quick
                label="غداً"
                onPress={() => {
                  const t = addDaysIso(todayIso(), 1);
                  setDraft((p) => ({
                    ...p,
                    availableDate: t,
                    availableEndDate:
                      mode === 'date_range' ? addDaysIso(t, 1) : undefined,
                  }));
                }}
              />
              {draft.availableDate ? (
                <Quick
                  label="مسح"
                  muted
                  onPress={() =>
                    setDraft((p) => {
                      const n = { ...p };
                      delete n.availableDate;
                      delete n.availableEndDate;
                      delete n.availableTime;
                      delete n.availablePeriod;
                      return n;
                    })
                  }
                />
              ) : null}
            </View>
            <View style={styles.inputsRow}>
              {mode === 'date_range' ? (
                <>
                  <Field
                    label="تاريخ الخروج"
                    value={draft.availableEndDate ?? ''}
                    onChangeText={(t) =>
                      setDraft((p) => ({ ...p, availableEndDate: t.trim() || undefined }))
                    }
                    placeholder="YYYY-MM-DD"
                    keyboardType="default"
                  />
                  <Field
                    label="تاريخ الدخول"
                    value={draft.availableDate ?? ''}
                    onChangeText={(t) =>
                      setDraft((p) => ({ ...p, availableDate: t.trim() || undefined }))
                    }
                    placeholder="YYYY-MM-DD"
                    keyboardType="default"
                  />
                </>
              ) : (
                <Field
                  label="التاريخ"
                  value={draft.availableDate ?? ''}
                  onChangeText={(t) =>
                    setDraft((p) => ({ ...p, availableDate: t.trim() || undefined }))
                  }
                  placeholder="YYYY-MM-DD"
                  keyboardType="default"
                />
              )}
            </View>
            {mode === 'date_time' ? (
              <Field
                label="الوقت (اختياري)"
                value={draft.availableTime ?? ''}
                onChangeText={(t) =>
                  setDraft((p) => ({ ...p, availableTime: t.trim() || undefined }))
                }
                placeholder="HH:mm"
                keyboardType="default"
              />
            ) : null}
            {mode === 'date_period' && profile.periodOptions?.length ? (
              <View style={styles.chips}>
                {profile.periodOptions.map((period) => {
                  const on = draft.availablePeriod === period;
                  return (
                    <Pressable
                      key={period}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() =>
                        setDraft((p) => ({
                          ...p,
                          availablePeriod: on ? undefined : period,
                        }))
                      }
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{period}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </Section>
        ) : null}

        {has('rating') ? (
          <Section title="التقييم الأدنى">
            <View style={styles.chips}>
              {RATING_OPTIONS.map((r) => {
                const on = draft.minRating === r;
                return (
                  <Pressable
                    key={r}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setNum('minRating', on ? undefined : r)}
                  >
                    <Ionicons name="star" size={12} color={on ? '#fff' : theme.colors.accent} />
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{r}+</Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>
        ) : null}

        {has('rooms') ||
        has('beds') ||
        has('bathrooms') ||
        has('capacity') ||
        has('players') ? (
          <View style={styles.rowStack}>
            {has('rooms') ? (
              <RowStepper
                label="عدد الغرف"
                value={draft.minRooms}
                onChange={(v) => setNum('minRooms', v)}
              />
            ) : null}
            {has('beds') ? (
              <RowStepper
                label="عدد الأسرّة"
                value={draft.minBeds}
                onChange={(v) => setNum('minBeds', v)}
              />
            ) : null}
            {has('bathrooms') ? (
              <RowStepper
                label="عدد الحمامات"
                value={draft.minBathrooms}
                onChange={(v) => setNum('minBathrooms', v)}
              />
            ) : null}
            {has('capacity') ? (
              <RowStepper
                label="عدد الأشخاص"
                value={draft.minCapacity}
                onChange={(v) => setNum('minCapacity', v)}
              />
            ) : null}
            {has('players') ? (
              <RowStepper
                label="عدد اللاعبين"
                value={draft.minPlayers}
                onChange={(v) => setNum('minPlayers', v)}
              />
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.resetBtn} onPress={reset}>
          <Text style={styles.resetText}>إعادة تعيين</Text>
        </Pressable>
        <Pressable style={styles.applyBtn} onPress={apply}>
          <FilterIcon size={18} color="#fff" />
          <Text style={styles.applyText}>تطبيق التصفية</Text>
        </Pressable>
      </View>
    </SmoothBottomSheet>
  );
}

function Section({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'number-pad',
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: 'number-pad' | 'default';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#B0B8C4"
        keyboardType={keyboardType}
        style={styles.fieldInput}
        autoCapitalize="none"
      />
    </View>
  );
}

function Quick({
  label,
  onPress,
  muted,
}: {
  label: string;
  onPress: () => void;
  muted?: boolean;
}) {
  return (
    <Pressable style={[styles.quick, muted && styles.quickMuted]} onPress={onPress}>
      <Text style={[styles.quickText, muted && styles.quickTextMuted]}>{label}</Text>
    </Pressable>
  );
}

/** Single-line RTL row: label on the right, editable +/- stepper on the left. */
function RowStepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
}: {
  label: string;
  value?: number;
  onChange: (value?: number) => void;
  step?: number;
  min?: number;
}) {
  const current = value ?? 0;
  const [text, setText] = useState(String(current));

  useEffect(() => {
    setText(String(value ?? 0));
  }, [value]);

  const commitText = (raw: string) => {
    const cleaned = raw.replace(/[^\d]/g, '');
    if (cleaned === '') {
      setText('0');
      onChange(undefined);
      return;
    }
    const n = parseInt(cleaned, 10);
    if (!Number.isFinite(n)) {
      setText(String(value ?? 0));
      return;
    }
    const clamped = Math.max(min, n);
    setText(String(clamped));
    onChange(clamped === 0 ? undefined : clamped);
  };

  return (
    <View style={styles.rowStepper}>
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.rowControls}>
        <Pressable
          style={styles.rowBtn}
          hitSlop={6}
          onPress={() => onChange(current + step)}
        >
          <Ionicons name="add" size={16} color="#374151" />
        </Pressable>
        <TextInput
          style={styles.rowInput}
          value={text}
          onChangeText={(t) => {
            const cleaned = t.replace(/[^\d]/g, '');
            setText(cleaned);
          }}
          onBlur={() => commitText(text)}
          onSubmitEditing={() => commitText(text)}
          keyboardType="number-pad"
          selectTextOnFocus
          textAlign="center"
          maxLength={4}
        />
        <Pressable
          style={styles.rowBtn}
          hitSlop={6}
          onPress={() => {
            const next = Math.max(min, current - step);
            onChange(next === 0 ? undefined : next);
          }}
        >
          <Ionicons name="remove" size={16} color="#374151" />
        </Pressable>
      </View>
    </View>
  );
}

function fmt(n: number) {
  return Math.round(n).toLocaleString('en-US');
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    maxHeight: '90%',
    backgroundColor: '#F7F9FC',
  },
  heading: {
    gap: 4,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
    width: '100%',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
    width: '100%',
  },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 20,
    width: '100%',
  },
  body: {
    gap: 12,
    paddingBottom: 6,
  },
  section: {
    gap: 8,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  trailing: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accentDark,
  },
  sectionBody: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    padding: 12,
    gap: 10,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: '#FBFCFD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.text,
    textAlign: 'right',
  },
  sliderPad: {
    paddingTop: 2,
  },
  slider: {
    width: '100%',
    height: 34,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scale: {
    fontSize: 11,
    color: '#A0AAB6',
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: '#FBFCFD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  placeholder: {
    color: '#B0B8C4',
    fontWeight: '500',
  },
  cityList: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: 160,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  cityRowOn: { backgroundColor: theme.colors.mint },
  cityName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  cityNameOn: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  hint: {
    fontSize: 12,
    color: MUTED,
    lineHeight: 18,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quick: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: theme.colors.mint,
  },
  quickMuted: {
    backgroundColor: '#F1F4F8',
  },
  quickText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  quickTextMuted: {
    color: MUTED,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FBFCFD',
    borderWidth: 1,
    borderColor: LINE,
  },
  chipOn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  chipTextOn: { color: '#fff' },
  rowStack: {
    gap: 8,
  },
  rowStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'right',
  },
  rowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // Keep + value − order like the design, independent of app RTL
    direction: 'ltr',
  },
  rowBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEF1F5',
    shadowColor: '#0D1B3E',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rowValue: {
    minWidth: 22,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  rowInput: {
    minWidth: 40,
    maxWidth: 56,
    paddingHorizontal: 4,
    paddingVertical: 4,
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: LINE,
  },
  resetBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  resetText: {
    fontSize: 14,
    fontWeight: '700',
    color: MUTED,
  },
  applyBtn: {
    flex: 1.35,
    height: 50,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
});
