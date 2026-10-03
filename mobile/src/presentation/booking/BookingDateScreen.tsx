import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../core/ui/components/BackButton';
import { DEPOSIT_PERCENTAGE } from '../../core/common/bookingConstants';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { RootStackParamList } from '../navigation/types';
import {
  eachIsoDate,
  nightsBetween,
  periodLabelForSlot,
  resolveBookingFlow,
  ServiceAvailability,
} from './bookingFlow';
import { MonthCalendar } from './components/MonthCalendar';
import { GuestDetailsSheet } from './components/GuestDetailsSheet';

type Route = RouteProp<RootStackParamList, 'BookingDate'>;

export function BookingDateScreen() {
  const params = useRoute<Route>().params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { container, formatPrice, user } = useApp();
  const insets = useSafeAreaInsets();
  const flow = useMemo(
    () => resolveBookingFlow(params.categoryName, params.bookingType),
    [params.categoryName, params.bookingType],
  );

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [loading, setLoading] = useState(true);
  const [availabilities, setAvailabilities] = useState<ServiceAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>();
  const [checkOutDate, setCheckOutDate] = useState<string>();
  const [selectedSlotId, setSelectedSlotId] = useState<string>();
  const [periodLabel, setPeriodLabel] = useState<string>();
  const [durationHours, setDurationHours] = useState<number>(
    flow.durationOptions?.[0] ?? 1,
  );
  const [quantity, setQuantity] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [deliveryTime, setDeliveryTime] = useState('');
  const [pickupPoint, setPickupPoint] = useState('');
  const [dropoffPoint, setDropoffPoint] = useState('');
  const [guestOpen, setGuestOpen] = useState(false);
  const [attendanceType, setAttendanceType] = useState('عائلة (رجال ونساء)');
  const [adults, setAdults] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const depositPct = DEPOSIT_PERCENTAGE;
  const isRange = flow.kind === 'STAY_RANGE';

  useEffect(() => {
    if (!user) navigation.replace('Auth');
  }, [user, navigation]);

  useEffect(() => {
    setLoading(true);
    container.serviceApi
      .getService(params.serviceId)
      .then((svc) => setAvailabilities(svc.availabilities))
      .catch(() => setAvailabilities([]))
      .finally(() => setLoading(false));
  }, [container, params.serviceId]);

  const availableDates = useMemo(() => {
    const set = new Set<string>();
    for (const a of availabilities) set.add(a.date);
    return set;
  }, [availabilities]);

  const daySlots = useMemo(
    () =>
      availabilities.filter(
        (a) => a.date === selectedDate && a.startTime != null && a.startTime !== '',
      ),
    [availabilities, selectedDate],
  );

  const dayAllDay = useMemo(
    () =>
      availabilities.find(
        (a) => a.date === selectedDate && (a.startTime == null || a.startTime === ''),
      ),
    [availabilities, selectedDate],
  );

  /** Period chips for EVENT_DAY / tairaman — group slots by morning/evening/full */
  const periodChoices = useMemo(() => {
    if (flow.kind !== 'DAY_PERIOD' || !selectedDate) return [];
    if (daySlots.length > 0) {
      return daySlots.map((slot) => ({
        id: slot.id,
        label: `${periodLabelForSlot(slot.startTime, slot.endTime)} (${String(slot.startTime).slice(0, 5)}${
          slot.endTime ? ` – ${String(slot.endTime).slice(0, 5)}` : ''
        })`,
        slot,
      }));
    }
    if (dayAllDay) {
      return (flow.periodOptions ?? ['يوم كامل']).map((label, i) => ({
        id: `${dayAllDay.id}-${i}`,
        label,
        slot: dayAllDay,
        softLabel: label,
      }));
    }
    return [];
  }, [flow.kind, flow.periodOptions, selectedDate, daySlots, dayAllDay]);

  const selectedAvailability = useMemo(() => {
    if (
      flow.kind === 'SLOT_TIME' ||
      flow.kind === 'SLOT_DURATION' ||
      flow.kind === 'TRANSPORT' ||
      flow.kind === 'DAY_PERIOD'
    ) {
      return availabilities.find((a) => a.id === selectedSlotId) ?? dayAllDay;
    }
    if (isRange && selectedDate) {
      return (
        availabilities.find(
          (a) => a.date === selectedDate && (a.startTime == null || a.startTime === ''),
        ) ?? availabilities.find((a) => a.date === selectedDate)
      );
    }
    return dayAllDay ?? availabilities.find((a) => a.date === selectedDate);
  }, [
    flow.kind,
    isRange,
    availabilities,
    selectedSlotId,
    dayAllDay,
    selectedDate,
  ]);

  const nights = isRange && selectedDate && checkOutDate
    ? nightsBetween(selectedDate, checkOutDate)
    : 0;

  const rangeOk = useMemo(() => {
    if (!isRange || !selectedDate || !checkOutDate || nights < 1) return false;
    const days = eachIsoDate(selectedDate, checkOutDate);
    return days.every((d) => availableDates.has(d));
  }, [isRange, selectedDate, checkOutDate, nights, availableDates]);

  const unitPrice = selectedAvailability?.customPrice ?? params.price;
  const billableUnits = (() => {
    if (flow.kind === 'QUANTITY_DELIVERY' || flow.kind === 'TRANSPORT') return quantity;
    if (isRange) return Math.max(1, nights) * (flow.needsRooms ? rooms : 1);
    if (flow.kind === 'SLOT_DURATION') return durationHours;
    return 1;
  })();
  const totalPrice = unitPrice * billableUnits;
  const depositAmount = Math.round((totalPrice * depositPct) / 100);

  const canNext = (() => {
    if (loading) return false;
    if (flow.kind === 'STAY_RANGE') return rangeOk && !!selectedAvailability;
    if (flow.kind === 'QUANTITY_DELIVERY') {
      return !!selectedDate && !!selectedAvailability && quantity >= 1;
    }
    if (flow.kind === 'TRANSPORT') {
      return (
        !!selectedDate &&
        !!selectedSlotId &&
        quantity >= 1 &&
        pickupPoint.trim().length > 0 &&
        dropoffPoint.trim().length > 0
      );
    }
    if (flow.kind === 'DAY_PERIOD') {
      return !!selectedDate && !!selectedAvailability && !!selectedSlotId;
    }
    if (flow.kind === 'SLOT_TIME' || flow.kind === 'SLOT_DURATION') {
      return !!selectedDate && !!selectedSlotId;
    }
    return !!selectedDate && !!selectedAvailability;
  })();

  const onSelectCalendarDate = (iso: string) => {
    setRangeError(null);
    if (!isRange) {
      setSelectedDate(iso);
      setSelectedSlotId(undefined);
      setPeriodLabel(undefined);
      return;
    }
    // Range: first tap = check-in, second = check-out
    if (!selectedDate || (selectedDate && checkOutDate)) {
      setSelectedDate(iso);
      setCheckOutDate(undefined);
      setSelectedSlotId(undefined);
      return;
    }
    if (iso <= selectedDate) {
      setSelectedDate(iso);
      setCheckOutDate(undefined);
      return;
    }
    const days = eachIsoDate(selectedDate, iso);
    const allFree = days.every((d) => availableDates.has(d));
    if (!allFree) {
      setRangeError('بعض الأيام ضمن المدة غير متاحة. اختر نطاقاً آخر.');
      return;
    }
    setCheckOutDate(iso);
  };

  /** API locks one capacity unit; multi-night / duration priced on the client. */
  const apiQuantity = (() => {
    if (flow.kind === 'QUANTITY_DELIVERY' || flow.kind === 'TRANSPORT') {
      return Math.min(quantity, selectedAvailability?.availableCapacity ?? quantity);
    }
    if (flow.needsRooms) {
      return Math.min(rooms, selectedAvailability?.availableCapacity ?? rooms);
    }
    return 1;
  })();

  const goCheckout = () => {
    if (!selectedAvailability || !selectedDate) return;
    // Checkout total = price × quantity → encode full bill into price when apiQuantity is 1
    const checkoutPrice =
      apiQuantity === 1 && billableUnits > 1 ? totalPrice : unitPrice;
    const checkoutQty =
      apiQuantity === 1 && billableUnits > 1 ? 1 : apiQuantity > 0 ? apiQuantity : 1;

    navigation.navigate('BookingCheckout', {
      ...params,
      bookingType: flow.bookingType,
      availabilityId: selectedAvailability.id,
      bookingDate: selectedDate,
      startTime: selectedAvailability.startTime,
      endTime: selectedAvailability.endTime,
      quantity: checkoutQty,
      attendanceType,
      adults,
      children: childrenCount,
      price: flow.kind === 'QUANTITY_DELIVERY' || flow.kind === 'TRANSPORT'
        ? unitPrice
        : checkoutPrice,
      depositPercentage: depositPct,
      checkOutDate,
      nights: nights || undefined,
      periodLabel: periodLabel ?? undefined,
      durationHours: flow.needsDuration ? durationHours : undefined,
      rooms: flow.needsRooms ? rooms : undefined,
      deliveryTime: flow.needsDeliveryTime ? deliveryTime || undefined : undefined,
      pickupPoint: flow.needsRoute ? pickupPoint.trim() : undefined,
      dropoffPoint: flow.needsRoute ? dropoffPoint.trim() : undefined,
    });
  };

  const onNext = () => {
    if (!canNext) return;
    if (flow.needsGuestStep) {
      setGuestOpen(true);
      return;
    }
    goCheckout();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{flow.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.question}>{flow.question}</Text>
        <Text style={styles.hint}>{flow.hint}</Text>

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {(flow.kind === 'QUANTITY_DELIVERY' ||
              flow.kind === 'TRANSPORT' ||
              flow.needsRooms) && (
              <View style={styles.qtyCard}>
                <Text style={styles.slotsTitle}>
                  {flow.quantityLabel ?? 'الكمية'}
                </Text>
                <View style={styles.qtyRow}>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() =>
                      flow.needsRooms
                        ? setRooms((q) => Math.max(1, q - 1))
                        : setQuantity((q) => Math.max(1, q - 1))
                    }
                  >
                    <Ionicons name="remove" size={18} color="#fff" />
                  </Pressable>
                  <Text style={styles.qtyValue}>
                    {flow.needsRooms ? rooms : quantity}
                  </Text>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() =>
                      flow.needsRooms
                        ? setRooms((q) => q + 1)
                        : setQuantity((q) => q + 1)
                    }
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                  </Pressable>
                </View>
              </View>
            )}

            {flow.needsRoute ? (
              <View style={styles.routeCard}>
                <Text style={styles.slotsTitle}>مسار الرحلة</Text>
                <TextInput
                  style={styles.input}
                  placeholder="نقطة الانطلاق"
                  placeholderTextColor="#A0AAB8"
                  value={pickupPoint}
                  onChangeText={setPickupPoint}
                  textAlign="right"
                />
                <TextInput
                  style={styles.input}
                  placeholder="نقطة الوصول"
                  placeholderTextColor="#A0AAB8"
                  value={dropoffPoint}
                  onChangeText={setDropoffPoint}
                  textAlign="right"
                />
              </View>
            ) : null}

            <MonthCalendar
              year={year}
              monthIndex={monthIndex}
              selectedDate={isRange ? undefined : selectedDate}
              rangeStart={isRange ? selectedDate : undefined}
              rangeEnd={isRange ? checkOutDate : undefined}
              availableDates={availableDates}
              onChangeMonth={(y, m) => {
                setYear(y);
                setMonthIndex(m);
              }}
              onSelectDate={onSelectCalendarDate}
            />

            {rangeError ? <Text style={styles.error}>{rangeError}</Text> : null}

            {isRange && selectedDate ? (
              <View style={styles.rangeSummary}>
                <Text style={styles.rangeText}>
                  الوصول: {selectedDate}
                  {checkOutDate ? `  ←  المغادرة: ${checkOutDate}` : '  — اختر يوم المغادرة'}
                </Text>
                {nights > 0 ? (
                  <Text style={styles.rangeMeta}>{nights} ليلة</Text>
                ) : null}
              </View>
            ) : null}

            {flow.kind === 'DAY_PERIOD' && selectedDate ? (
              <View style={styles.slotsCard}>
                <Text style={styles.slotsTitle}>الفترة / الوقت</Text>
                {periodChoices.length === 0 ? (
                  <Text style={styles.hint}>لا توجد فترات متاحة في هذا اليوم</Text>
                ) : (
                  <View style={styles.slotsWrap}>
                    {periodChoices.map((p) => {
                      const soft =
                        'softLabel' in p && typeof p.softLabel === 'string'
                          ? p.softLabel
                          : undefined;
                      const label = soft ?? p.label;
                      const on = selectedSlotId === p.slot.id && periodLabel === label;
                      return (
                        <Pressable
                          key={p.id}
                          style={[styles.slotChip, on && styles.slotChipOn]}
                          onPress={() => {
                            setSelectedSlotId(p.slot.id);
                            setPeriodLabel(label);
                          }}
                        >
                          <Text style={[styles.slotText, on && styles.slotTextOn]}>
                            {p.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}

            {(flow.kind === 'SLOT_TIME' ||
              flow.kind === 'SLOT_DURATION' ||
              flow.kind === 'TRANSPORT') &&
            selectedDate ? (
              <View style={styles.slotsCard}>
                <Text style={styles.slotsTitle}>المواعيد المتاحة</Text>
                {daySlots.length === 0 ? (
                  <Text style={styles.hint}>لا توجد مواعيد في هذا اليوم</Text>
                ) : (
                  <View style={styles.slotsWrap}>
                    {daySlots.map((slot) => {
                      const on = selectedSlotId === slot.id;
                      const label = `${String(slot.startTime).slice(0, 5)}${
                        slot.endTime ? ` - ${String(slot.endTime).slice(0, 5)}` : ''
                      }`;
                      return (
                        <Pressable
                          key={slot.id}
                          style={[styles.slotChip, on && styles.slotChipOn]}
                          onPress={() => setSelectedSlotId(slot.id)}
                        >
                          <Text style={[styles.slotText, on && styles.slotTextOn]}>
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}

            {flow.needsDuration && selectedSlotId ? (
              <View style={styles.slotsCard}>
                <Text style={styles.slotsTitle}>مدة الحجز</Text>
                <View style={styles.slotsWrap}>
                  {(flow.durationOptions ?? [1, 2]).map((h) => {
                    const on = durationHours === h;
                    const label = h === 4 ? 'نصف يوم' : `${h} ساعة`;
                    return (
                      <Pressable
                        key={h}
                        style={[styles.slotChip, on && styles.slotChipOn]}
                        onPress={() => setDurationHours(h)}
                      >
                        <Text style={[styles.slotText, on && styles.slotTextOn]}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {flow.needsDeliveryTime && selectedDate ? (
              <View style={styles.routeCard}>
                <Text style={styles.slotsTitle}>وقت التجهيز / التسليم</Text>
                <TextInput
                  style={styles.input}
                  placeholder="مثال: 4:00 مساءً"
                  placeholderTextColor="#A0AAB8"
                  value={deliveryTime}
                  onChangeText={setDeliveryTime}
                  textAlign="right"
                />
              </View>
            ) : null}

            {canNext && selectedAvailability ? (
              <View style={styles.packageCard}>
                <Text style={styles.priceNum}>{formatPrice(totalPrice)}</Text>
                <Text style={styles.packageMeta}>{params.serviceName}</Text>
                <View style={styles.divider} />
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    عربون {depositPct}% — {formatPrice(depositAmount)}
                  </Text>
                  <Ionicons name="card-outline" size={16} color={theme.colors.textSecondary} />
                </View>
                {isRange && nights > 0 ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      {nights} ليلة × {formatPrice(unitPrice)}
                      {flow.needsRooms ? ` × ${rooms} غرفة` : ''}
                    </Text>
                    <Ionicons name="moon-outline" size={16} color={theme.colors.textSecondary} />
                  </View>
                ) : null}
                {periodLabel ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{periodLabel}</Text>
                    <Ionicons name="sunny-outline" size={16} color={theme.colors.textSecondary} />
                  </View>
                ) : null}
                {flow.needsDuration ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      {durationHours === 4 ? 'نصف يوم' : `${durationHours} ساعة`}
                    </Text>
                    <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                  </View>
                ) : null}
                {params.capacityLabel ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{params.capacityLabel}</Text>
                    <Ionicons name="people-outline" size={16} color={theme.colors.textSecondary} />
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable disabled={!canNext} onPress={onNext}>
          <LinearGradient
            colors={[theme.colors.primaryLight, theme.colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.nextBtn, !canNext && { opacity: 0.45 }]}
          >
            <Text style={styles.nextText}>التالي</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <GuestDetailsSheet
        visible={guestOpen}
        attendanceType={attendanceType}
        adults={adults}
        children={childrenCount}
        onChangeAttendance={setAttendanceType}
        onChangeAdults={setAdults}
        onChangeChildren={setChildrenCount}
        onClose={() => setGuestOpen(false)}
        onNext={() => {
          setGuestOpen(false);
          goCheckout();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F6F9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  headerSpacer: { width: 40 },
  scroll: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  question: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
    marginTop: 4,
  },
  hint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
    marginBottom: 4,
  },
  error: {
    fontSize: 12,
    color: theme.colors.error,
    textAlign: 'right',
    fontWeight: '600',
  },
  rangeSummary: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  rangeText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  rangeMeta: {
    fontSize: 12,
    color: theme.colors.accentDark,
    textAlign: 'right',
    fontWeight: '700',
  },
  slotsCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  slotsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  slotsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  slotChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
  },
  slotChipOn: {
    borderColor: theme.colors.accent,
    backgroundColor: '#F8F1E4',
  },
  slotText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  slotTextOn: { color: theme.colors.primary, fontWeight: '800' },
  qtyCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
    minWidth: 28,
    textAlign: 'center',
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.primary,
    backgroundColor: '#F8FAFC',
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  priceNum: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.accent,
    textAlign: 'right',
  },
  packageMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  metaText: { fontSize: 13, color: theme.colors.textSecondary },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  nextBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
