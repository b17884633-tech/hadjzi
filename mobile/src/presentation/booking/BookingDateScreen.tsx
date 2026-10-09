import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
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
import { FormKeyboardView } from '../../core/ui/components/FormKeyboardView';
import { KeyboardAwareScrollView } from '../../core/ui/components/KeyboardAwareScrollView';
import { DEPOSIT_PERCENTAGE } from '../../core/common/bookingConstants';
import {
  findPeriodForSlot,
  priceForSlotHour,
  slotInAnyPeriod,
} from '../../core/common/pricePeriods';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { RootStackParamList } from '../navigation/types';
import {
  eachBlockedIsoDate,
  nightsBetween,
  packagePeriodLabel,
  periodLabelForSlot,
  resolveBookingFlow,
  ServiceAvailability,
  toIsoDate,
} from './bookingFlow';
import { MonthCalendar } from './components/MonthCalendar';
import { GuestDetailsSheet } from './components/GuestDetailsSheet';
import { SlotReservationPanel } from './components/SlotReservationPanel';

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
  /** Multi-period selection for SLOT_TIME / SLOT_DURATION timeline. */
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
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
  const packagePeriod = params.packagePeriod;
  const isHallCategory = /صالة|قاعة|صالات|قاعات|hall|زفاف/i.test(
    params.categoryName ?? '',
  );
  const isTairamanCategory = /طيرمان|طرمان|tairaman/i.test(
    params.categoryName ?? '',
  );
  /** Package already defines the schedule — customer only picks a day. */
  const isDayPackage =
    packagePeriod === 'MORNING' ||
    packagePeriod === 'EVENING' ||
    isHallCategory ||
    (isTairamanCategory &&
      (!!params.timeLabel || !!params.packageFromTime)) ||
    (flow.kind === 'DAY_PERIOD' &&
      (!!params.timeLabel || !!params.packageFromTime));
  /** Overnight / hotel-style range — not for morning/evening chalet packages. */
  const isRange = flow.kind === 'STAY_RANGE' && !isDayPackage;
  /** Football / doctors / pools — dark timeline date+time picker. */
  const isSlotTimeline =
    !isDayPackage &&
    (flow.kind === 'SLOT_TIME' || flow.kind === 'SLOT_DURATION');
  const fixedPeriodLabel =
    params.timeLabel ?? packagePeriodLabel(packagePeriod) ?? undefined;

  const guestsPerRoom = params.guestsPerRoom;
  const maxGuests =
    guestsPerRoom != null && guestsPerRoom > 0
      ? guestsPerRoom * (flow.needsRooms ? Math.max(1, rooms) : 1)
      : undefined;
  const maxChildren =
    params.maxChildrenPerRoom != null && params.maxChildrenPerRoom >= 0
      ? params.maxChildrenPerRoom *
        (flow.needsRooms ? Math.max(1, rooms) : 1)
      : undefined;

  const clampGuests = (nextAdults: number, nextChildren: number) => {
    let a = Math.max(1, nextAdults);
    let c = Math.max(0, nextChildren);
    // Children are not counted toward person capacity.
    if (maxGuests != null && a > maxGuests) {
      a = Math.max(1, maxGuests);
    }
    if (maxChildren != null && c > maxChildren) {
      c = maxChildren;
    }
    setAdults(a);
    setChildrenCount(c);
  };

  useEffect(() => {
    if (maxGuests == null && maxChildren == null) return;
    if (
      (maxGuests != null && adults > maxGuests) ||
      (maxChildren != null && childrenCount > maxChildren)
    ) {
      clampGuests(adults, childrenCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clamp when rooms/capacity change
  }, [maxGuests, maxChildren, rooms]);

  useEffect(() => {
    if (!user) navigation.replace('Auth');
  }, [user, navigation]);

  const pricePeriods = params.pricePeriods ?? [];
  const hasPeriodPricing = pricePeriods.length > 0;

  useEffect(() => {
    let active = true;
    setLoading(true);
    container.serviceApi
      .getService(params.serviceId)
      .then((svc) => {
        if (!active) return;
        const list = Array.isArray(svc.availabilities) ? svc.availabilities : [];
        setAvailabilities(list);
        // Auto-pick the soonest day that has timed slots for timeline flows.
        if (isSlotTimeline && !selectedDate) {
          const today = toIsoDate(
            new Date().getFullYear(),
            new Date().getMonth(),
            new Date().getDate(),
          );
          const periods = params.pricePeriods ?? [];
          const first = list
            .filter((a) => {
              const date = String(a.date ?? '').slice(0, 10);
              if (!a.startTime || !date || date < today) return false;
              if (!periods.length) return true;
              return slotInAnyPeriod(periods, a.startTime);
            })
            .map((a) => String(a.date).slice(0, 10))
            .sort()[0];
          if (first) setSelectedDate(first);
        }
      })
      .catch((e) => {
        if (!active) return;
        if (__DEV__) {
          console.warn('[BookingDate] getService failed', params.serviceId, e);
        }
        setAvailabilities([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload when service changes
  }, [container, params.serviceId, isSlotTimeline]);

  const availableDates = useMemo(() => {
    const set = new Set<string>();
    for (const a of availabilities) {
      if (
        !a.startTime ||
        !hasPeriodPricing ||
        slotInAnyPeriod(pricePeriods, a.startTime)
      ) {
        set.add(a.date);
      }
    }
    return set;
  }, [availabilities, hasPeriodPricing, pricePeriods]);

  const daySlots = useMemo(
    () =>
      availabilities.filter(
        (a) => a.date === selectedDate && a.startTime != null && a.startTime !== '',
      ),
    [availabilities, selectedDate],
  );

  // Drop selections that fall outside provider price periods.
  useEffect(() => {
    if (!isSlotTimeline || !hasPeriodPricing) return;
    setSelectedSlotIds((prev) => {
      const next = prev.filter((id) => {
        const slot = availabilities.find((a) => a.id === id);
        return slot ? slotInAnyPeriod(pricePeriods, slot.startTime) : false;
      });
      return next.length === prev.length ? prev : next;
    });
  }, [isSlotTimeline, hasPeriodPricing, availabilities, pricePeriods]);

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
    if (isSlotTimeline && selectedSlotIds.length) {
      const sorted = selectedSlotIds
        .map((id) => availabilities.find((a) => a.id === id))
        .filter(Boolean) as ServiceAvailability[];
      sorted.sort((a, b) =>
        String(a.startTime).localeCompare(String(b.startTime)),
      );
      return sorted[0];
    }
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
    isSlotTimeline,
    availabilities,
    selectedSlotId,
    selectedSlotIds,
    dayAllDay,
    selectedDate,
  ]);

  const nights = isRange && selectedDate && checkOutDate
    ? nightsBetween(selectedDate, checkOutDate)
    : 0;

  const rangeOk = useMemo(() => {
    if (!isRange || !selectedDate || !checkOutDate || nights < 1) return false;
    const days = eachBlockedIsoDate(selectedDate, checkOutDate);
    return days.every((d) => availableDates.has(d));
  }, [isRange, selectedDate, checkOutDate, nights, availableDates]);

  const selectedSlots = useMemo(() => {
    if (!isSlotTimeline) return [];
    return selectedSlotIds
      .map((id) => availabilities.find((a) => a.id === id))
      .filter((slot): slot is ServiceAvailability => {
        if (!slot) return false;
        if (!hasPeriodPricing) return true;
        return slotInAnyPeriod(pricePeriods, slot.startTime);
      });
  }, [
    isSlotTimeline,
    selectedSlotIds,
    availabilities,
    hasPeriodPricing,
    pricePeriods,
  ]);

  const unitPrice = selectedAvailability?.customPrice ?? params.price;
  const billableUnits = (() => {
    if (isSlotTimeline) return Math.max(1, selectedSlotIds.length);
    if (flow.kind === 'QUANTITY_DELIVERY' || flow.kind === 'TRANSPORT') return quantity;
    if (isRange) return Math.max(1, nights) * (flow.needsRooms ? rooms : 1);
    if (flow.kind === 'SLOT_DURATION') return durationHours;
    return 1;
  })();

  /** Sports: each selected hour priced by its period band. */
  const timelineTotal = useMemo(() => {
    if (!isSlotTimeline || !selectedSlots.length) return 0;
    if (!hasPeriodPricing) return unitPrice * selectedSlots.length;
    return selectedSlots.reduce((sum, slot) => {
      const hourPrice =
        slot.customPrice ??
        priceForSlotHour(pricePeriods, slot.startTime, params.price);
      return sum + hourPrice;
    }, 0);
  }, [
    isSlotTimeline,
    selectedSlots,
    hasPeriodPricing,
    unitPrice,
    pricePeriods,
    params.price,
  ]);

  const totalPrice = isSlotTimeline
    ? timelineTotal
    : unitPrice * billableUnits;

  const activePeriodLabel = useMemo(() => {
    if (!hasPeriodPricing || !selectedSlots.length) return undefined;
    const labels = new Set<string>();
    for (const slot of selectedSlots) {
      const p = findPeriodForSlot(pricePeriods, slot.startTime);
      if (p) labels.add(p.label);
    }
    return labels.size ? [...labels].join(' · ') : undefined;
  }, [hasPeriodPricing, selectedSlots, pricePeriods]);
  const depositAmount = Math.round((totalPrice * depositPct) / 100);

  const canNext = (() => {
    if (loading) return false;
    if (isSlotTimeline) {
      return !!selectedDate && selectedSlotIds.length > 0 && !!selectedAvailability;
    }
    if (isRange) return rangeOk && !!selectedAvailability;
    if (isDayPackage) return !!selectedDate && !!selectedAvailability;
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
      setCheckOutDate(undefined);
      setSelectedSlotId(undefined);
      setPeriodLabel(isDayPackage ? fixedPeriodLabel : undefined);
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
    const days = eachBlockedIsoDate(selectedDate, iso);
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

    const multi =
      isSlotTimeline && selectedSlotIds.length > 1;
    const multiIds = multi
      ? [...selectedSlotIds].sort((a, b) => {
          const sa = availabilities.find((x) => x.id === a);
          const sb = availabilities.find((x) => x.id === b);
          return String(sa?.startTime).localeCompare(String(sb?.startTime));
        })
      : selectedSlotIds.length === 1
        ? selectedSlotIds
        : undefined;

    const multiLabel =
      isSlotTimeline && selectedSlots.length
        ? selectedSlots
            .slice()
            .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)))
            .map((s) => String(s.startTime).slice(0, 5))
            .join(' · ')
        : undefined;

    const lastSlot =
      selectedSlots.length > 1
        ? selectedSlots
            .slice()
            .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)))
            .at(-1)
        : undefined;

    // Multi-slot timeline: checkout creates one booking per slot at unit price.
    // With period pricing, pass the average hour rate so N × price ≈ total;
    // backend also resolves period from service attributes per slot start time.
    const navPrice = (() => {
      if (isSlotTimeline && hasPeriodPricing && selectedSlots.length) {
        return Math.round(timelineTotal / selectedSlots.length);
      }
      if (multi || flow.kind === 'QUANTITY_DELIVERY' || flow.kind === 'TRANSPORT') {
        return unitPrice;
      }
      return checkoutPrice;
    })();

    navigation.navigate('BookingCheckout', {
      ...params,
      bookingType: flow.bookingType,
      availabilityId: selectedAvailability.id,
      availabilityIds: multiIds,
      bookingDate: selectedDate,
      startTime: isDayPackage
        ? params.packageFromTime ?? selectedAvailability.startTime
        : selectedAvailability.startTime,
      endTime: isDayPackage
        ? params.packageToTime ?? selectedAvailability.endTime
        : lastSlot?.endTime ?? selectedAvailability.endTime,
      quantity: multi ? 1 : checkoutQty,
      attendanceType,
      adults,
      children: childrenCount,
      price: navPrice,
      depositPercentage: depositPct,
      checkOutDate: isRange ? checkOutDate : undefined,
      nights: isRange && nights > 0 ? nights : undefined,
      periodLabel:
        activePeriodLabel ??
        multiLabel ??
        periodLabel ??
        fixedPeriodLabel ??
        undefined,
      durationHours: isSlotTimeline
        ? Math.max(1, selectedSlotIds.length)
        : flow.needsDuration
          ? durationHours
          : undefined,
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

  if (isSlotTimeline) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>{flow.title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ flex: 1 }}>
            {!availabilities.some((a) => a.startTime) ? (
              <Text
                style={{
                  textAlign: 'center',
                  color: theme.colors.textSecondary,
                  marginTop: 16,
                  marginHorizontal: 20,
                  fontSize: 13,
                  lineHeight: 20,
                }}
              >
                لا توجد مواعيد مفتوحة حالياً. أعد فتح الصفحة أو تأكد أن مزوّد
                الخدمة أضاف فترات الأسعار.
              </Text>
            ) : null}
            <SlotReservationPanel
              categoryName={params.categoryName}
              availabilities={availabilities}
              pricePeriods={hasPeriodPricing ? pricePeriods : undefined}
              selectedDate={selectedDate}
              selectedSlotIds={selectedSlotIds}
              onSelectDate={(iso) => {
                setSelectedDate(iso);
                setSelectedSlotIds([]);
                setSelectedSlotId(undefined);
                setPeriodLabel(undefined);
              }}
              onToggleSlot={(id) => {
                setSelectedSlotIds((prev) =>
                  prev.includes(id)
                    ? prev.filter((x) => x !== id)
                    : [...prev, id],
                );
              }}
            />
          </View>
        )}

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          {canNext && selectedAvailability ? (
            <Text style={styles.slotFooterMeta}>
              {formatPrice(totalPrice)}
              {selectedSlotIds.length > 1
                ? ` · ${selectedSlotIds.length} فترات`
                : ''}
            </Text>
          ) : null}
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
          maxGuests={maxGuests}
          maxChildren={maxChildren}
          onChangeAttendance={setAttendanceType}
          onChangeAdults={(n) => clampGuests(n, childrenCount)}
          onChangeChildren={(n) => clampGuests(adults, n)}
          onClose={() => setGuestOpen(false)}
          onNext={() => {
            setGuestOpen(false);
            goCheckout();
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FormKeyboardView>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{flow.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        avoidKeyboard={false}
        bottomOffset={100}
      >
        <Text style={styles.question}>
          {isDayPackage ? 'اختر يوم الحجز' : flow.question}
        </Text>
        <Text style={styles.hint}>
          {isDayPackage
            ? `باقة ${fixedPeriodLabel ?? 'يومية'} — اختر يوماً واحداً متاحاً.`
            : flow.hint}
        </Text>
        {isDayPackage && fixedPeriodLabel ? (
          <View style={styles.rangeSummary}>
            <Text style={styles.rangeText}>{fixedPeriodLabel}</Text>
            {params.packageFromTime && params.packageToTime ? (
              <Text style={styles.rangeMeta}>
                من {params.packageFromTime} إلى {params.packageToTime}
              </Text>
            ) : null}
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {(flow.kind === 'QUANTITY_DELIVERY' ||
              flow.kind === 'TRANSPORT' ||
              flow.needsRooms) && (
              <View style={styles.rowStepper}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {flow.quantityLabel ?? 'الكمية'}
                </Text>
                <View style={styles.rowControls}>
                  <Pressable
                    style={styles.rowBtn}
                    hitSlop={6}
                    onPress={() =>
                      flow.needsRooms
                        ? setRooms((q) => q + 1)
                        : setQuantity((q) => q + 1)
                    }
                  >
                    <Ionicons name="add" size={16} color="#374151" />
                  </Pressable>
                  <Text style={styles.rowValue}>
                    {flow.needsRooms ? rooms : quantity}
                  </Text>
                  <Pressable
                    style={styles.rowBtn}
                    hitSlop={6}
                    onPress={() =>
                      flow.needsRooms
                        ? setRooms((q) => Math.max(1, q - 1))
                        : setQuantity((q) => Math.max(1, q - 1))
                    }
                  >
                    <Ionicons name="remove" size={16} color="#374151" />
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

            {flow.kind === 'DAY_PERIOD' && selectedDate && !isDayPackage ? (
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
                {isRange ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      {nights > 0
                        ? `${nights} ليلة × ${formatPrice(unitPrice)}${
                            flow.needsRooms ? ` × ${rooms} غرفة` : ''
                          }`
                        : `السعر لليلة: ${formatPrice(unitPrice)}`}
                    </Text>
                    <Ionicons name="moon-outline" size={16} color={theme.colors.textSecondary} />
                  </View>
                ) : null}
                {isSlotTimeline && selectedSlots.length > 0 ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      {activePeriodLabel
                        ? `${activePeriodLabel} · ${selectedSlots.length} ساعة`
                        : `${selectedSlots.length} ساعة × ${formatPrice(
                            Math.round(totalPrice / selectedSlots.length),
                          )}`}
                    </Text>
                    <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                  </View>
                ) : null}
                {periodLabel && !isSlotTimeline ? (
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
      </KeyboardAwareScrollView>

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
      </FormKeyboardView>

      <GuestDetailsSheet
        visible={guestOpen}
        attendanceType={attendanceType}
        adults={adults}
        children={childrenCount}
        maxGuests={maxGuests}
        maxChildren={maxChildren}
        onChangeAttendance={setAttendanceType}
        onChangeAdults={(n) => clampGuests(n, childrenCount)}
        onChangeChildren={(n) => clampGuests(adults, n)}
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
  slotFooterMeta: {
    color: theme.colors.accentDark,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
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
  scroll: { paddingHorizontal: 14, paddingBottom: 100, gap: 12 },
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
    marginBottom: 2,
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
  rowStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  rowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    color: theme.colors.primary,
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
