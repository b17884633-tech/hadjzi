import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  slotInAnyPeriod,
  timeToMinutes,
  type PricePeriod,
} from '../../../core/common/pricePeriods';
import { SmoothBottomSheet } from '../../../core/ui/components/SmoothBottomSheet';
import { theme } from '../../../core/ui/theme';
import {
  addDaysIso,
  ServiceAvailability,
  toIsoDate,
} from '../bookingFlow';
import { MonthCalendar } from './MonthCalendar';

const WEEKDAY_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const MONTHS_AR = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];
/** Tall vertical capsule — width locked so long Arabic weekdays can't stretch it. */
const DAY_PILL_WIDTH = 45;
const DAY_PILL_HEIGHT = 70;

type SlotKind = 'available' | 'unavailable' | 'booked';

export type TimelineRow = {
  key: string;
  timeLabels: string[];
  kind: SlotKind;
  availabilityId?: string;
};

type Props = {
  categoryName?: string;
  availabilities: ServiceAvailability[];
  /** When set, hours outside these bands render as unavailable. */
  pricePeriods?: PricePeriod[];
  selectedDate?: string;
  selectedSlotIds: string[];
  onSelectDate: (iso: string) => void;
  onToggleSlot: (id: string) => void;
};

function todayIso(): string {
  const n = new Date();
  return toIsoDate(n.getFullYear(), n.getMonth(), n.getDate());
}

function parseHour(time?: string | null): number | null {
  if (!time) return null;
  const h = Number(String(time).slice(0, 2));
  return Number.isFinite(h) ? h : null;
}

function parseMinutes(time?: string | null): number {
  if (!time) return 0;
  const m = Number(String(time).slice(3, 5));
  return Number.isFinite(m) ? m : 0;
}

export function formatArabicClock(time?: string | null): string {
  if (!time) return '';
  const h24 = parseHour(time);
  if (h24 == null) return String(time).slice(0, 5);
  const mins = String(time).slice(3, 5) || '00';
  const period = h24 < 12 ? 'ص' : 'م';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${mins} ${period}`;
}

function weekdayShort(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return WEEKDAY_AR[d.getDay()] ?? '';
}

function dayNumber(iso: string): number {
  return Number(iso.slice(8, 10));
}

function isBookable(slot: ServiceAvailability): boolean {
  if (slot.status === 'BLOCKED') return false;
  if (slot.status === 'SOLD_OUT') return false;
  return (slot.availableCapacity ?? 0) > 0;
}

function isBooked(slot: ServiceAvailability): boolean {
  if (slot.status === 'SOLD_OUT') return true;
  return (slot.availableCapacity ?? 0) <= 0 && slot.status !== 'BLOCKED';
}

function withinPricePeriods(
  periods: PricePeriod[] | undefined,
  startTime?: string | null,
): boolean {
  if (!periods?.length) return true;
  return slotInAnyPeriod(periods, startTime);
}

export function buildTimelineRows(
  daySlots: ServiceAvailability[],
  pricePeriods?: PricePeriod[],
): TimelineRow[] {
  const timed = daySlots
    .filter((s) => s.startTime)
    .slice()
    .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));

  if (!timed.length) return [];

  const hasHalfHour = timed.some((s) => parseMinutes(s.startTime) !== 0);
  if (hasHalfHour) {
    return timed.map((s) => {
      let kind: SlotKind = 'unavailable';
      if (isBookable(s) && withinPricePeriods(pricePeriods, s.startTime)) {
        kind = 'available';
      } else if (isBooked(s) && withinPricePeriods(pricePeriods, s.startTime)) {
        kind = 'booked';
      }
      return {
        key: s.id,
        timeLabels: [formatArabicClock(s.startTime)],
        kind,
        availabilityId:
          kind === 'available' || kind === 'booked' || s.status === 'BLOCKED'
            ? s.id
            : undefined,
      };
    });
  }

  const starts = timed.map((s) => parseHour(s.startTime)!);
  const ends = timed.map((s) => {
    const endH = parseHour(s.endTime);
    if (endH != null && endH > parseHour(s.startTime)!) return endH;
    return parseHour(s.startTime)! + 1;
  });

  let minH = Math.min(...starts);
  let maxH = Math.max(...ends);
  minH = Math.min(minH, 8);
  maxH = Math.max(maxH, minH + 8, 20);

  // Expand to cover configured price windows (and keep beyond-hours visible as unavailable).
  if (pricePeriods?.length) {
    for (const p of pricePeriods) {
      const fromM = timeToMinutes(p.fromTime);
      const toM = timeToMinutes(p.toTime);
      if (fromM != null) minH = Math.min(minH, Math.floor(fromM / 60));
      if (toM != null) maxH = Math.max(maxH, Math.ceil(toM / 60));
    }
  }

  type HourMark = {
    hour: number;
    kind: SlotKind;
    availabilityId?: string;
    startTime?: string;
  };

  const marks: HourMark[] = [];
  for (let h = minH; h < maxH; h++) {
    const hourStart = `${String(h).padStart(2, '0')}:00`;
    const inPeriod = withinPricePeriods(pricePeriods, hourStart);

    const covering = timed.find((s) => {
      const sh = parseHour(s.startTime)!;
      let eh = parseHour(s.endTime);
      if (eh == null || eh <= sh) eh = sh + 1;
      return h >= sh && h < eh;
    });

    // Outside provider price periods → always unavailable (even if seeded).
    if (!inPeriod) {
      marks.push({
        hour: h,
        kind: 'unavailable',
        availabilityId: covering?.id,
        startTime: covering?.startTime ?? hourStart,
      });
      continue;
    }

    if (!covering) {
      marks.push({ hour: h, kind: 'unavailable', startTime: hourStart });
      continue;
    }

    if (isBookable(covering)) {
      const sh = parseHour(covering.startTime)!;
      if (h === sh) {
        marks.push({
          hour: h,
          kind: 'available',
          availabilityId: covering.id,
          startTime: covering.startTime ?? undefined,
        });
      } else {
        marks.push({ hour: h, kind: 'unavailable' });
      }
    } else if (isBooked(covering)) {
      marks.push({
        hour: h,
        kind: 'booked',
        availabilityId: covering.id,
        startTime: covering.startTime ?? undefined,
      });
    } else {
      marks.push({
        hour: h,
        kind: 'unavailable',
        availabilityId: covering.id,
        startTime: covering.startTime ?? undefined,
      });
    }
  }

  const rows: TimelineRow[] = [];
  let i = 0;
  while (i < marks.length) {
    const m = marks[i];
    if (m.kind === 'booked') {
      let span = 1;
      while (
        i + span < marks.length &&
        marks[i + span].kind === 'booked' &&
        marks[i + span].availabilityId === m.availabilityId
      ) {
        span += 1;
      }
      const labels: string[] = [];
      for (let s = 0; s < span; s++) {
        labels.push(
          formatArabicClock(`${String(m.hour + s).padStart(2, '0')}:00`),
        );
      }
      rows.push({
        key: `booked-${m.hour}-${span}`,
        timeLabels: labels,
        kind: 'booked',
        availabilityId: m.availabilityId,
      });
      i += span;
      continue;
    }

    rows.push({
      key: `${m.kind}-${m.hour}-${m.availabilityId ?? 'x'}`,
      timeLabels: [
        formatArabicClock(
          m.startTime ?? `${String(m.hour).padStart(2, '0')}:00`,
        ),
      ],
      kind: m.kind,
      availabilityId: m.availabilityId,
    });
    i += 1;
  }

  return rows;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00`).getTime();
  const b = new Date(`${to}T12:00:00`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function monthLabelFor(iso?: string): string | null {
  if (!iso) return null;
  const m = Number(iso.slice(5, 7)) - 1;
  const y = iso.slice(0, 4);
  if (m < 0 || m > 11) return null;
  return `${MONTHS_AR[m]} ${y}`;
}

export function SlotReservationPanel({
  availabilities,
  pricePeriods,
  selectedDate,
  selectedSlotIds,
  onSelectDate,
  onToggleSlot,
}: Props) {
  const insets = useSafeAreaInsets();
  const stripRef = useRef<ScrollView>(null);
  const dayLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [stripWidth, setStripWidth] = useState(0);
  const [layoutsReady, setLayoutsReady] = useState(0);

  const availableDates = useMemo(() => {
    const set = new Set<string>();
    for (const a of availabilities) {
      const date = String(a.date ?? '').slice(0, 10);
      const hasTime =
        a.startTime != null && String(a.startTime).trim().length > 0;
      if (date && hasTime) set.add(date);
    }
    // Fallback so the strip isn't a dead-end if slots are still seeding.
    if (set.size === 0 && pricePeriods && pricePeriods.length > 0) {
      const start = todayIso();
      for (let i = 0; i < 14; i++) set.add(addDaysIso(start, i));
    }
    return set;
  }, [availabilities, pricePeriods]);

  /** Strip spans today → farthest needed day (selected or available), up to 90 days. */
  const dateStrip = useMemo(() => {
    const start = todayIso();
    let last = addDaysIso(start, 20);
    if (selectedDate && selectedDate > last) last = selectedDate;
    for (const d of availableDates) {
      if (d >= start && d > last) last = d;
    }
    const cap = addDaysIso(start, 89);
    if (last > cap) last = cap;
    if (last < start) last = start;

    const days: string[] = [];
    const count = Math.max(0, daysBetween(start, last)) + 1;
    for (let i = 0; i < count; i++) days.push(addDaysIso(start, i));
    return days;
  }, [selectedDate, availableDates]);

  /** Side inset so the first/last day can sit in the horizontal center. */
  const sidePad =
    stripWidth > 0 ? Math.max(0, (stripWidth - DAY_PILL_WIDTH) / 2) : 0;

  const scrollStripToDate = (iso: string, animated = true) => {
    const layout = dayLayouts.current[iso];
    if (!layout || stripWidth <= 0) return false;
    const target = layout.x + layout.width / 2 - stripWidth / 2;
    stripRef.current?.scrollTo({ x: Math.max(0, target), animated });
    return true;
  };

  useEffect(() => {
    dayLayouts.current = {};
  }, [dateStrip.length, sidePad]);

  useEffect(() => {
    if (!selectedDate || dateStrip.length === 0 || stripWidth <= 0) return;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = () => {
      if (scrollStripToDate(selectedDate, true)) return;
      if (tries++ < 12) timer = setTimeout(attempt, 40);
    };
    timer = setTimeout(attempt, 40);
    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, dateStrip.length, stripWidth, sidePad, layoutsReady]);

  const daySlots = useMemo(
    () =>
      availabilities.filter(
        (a) =>
          a.date === selectedDate && a.startTime != null && a.startTime !== '',
      ),
    [availabilities, selectedDate],
  );

  const rows = useMemo(
    () => buildTimelineRows(daySlots, pricePeriods),
    [daySlots, pricePeriods],
  );
  const selectedCount = selectedSlotIds.length;
  const stripMonth = monthLabelFor(selectedDate);

  return (
    <View style={styles.root}>
      {stripMonth ? <Text style={styles.monthHint}>{stripMonth}</Text> : null}

      <View style={styles.dateBar}>
        <Pressable
          style={styles.calendarBtn}
          onPress={() => {
            if (selectedDate) {
              setCalYear(Number(selectedDate.slice(0, 4)));
              setCalMonth(Number(selectedDate.slice(5, 7)) - 1);
            }
            setCalendarOpen(true);
          }}
          accessibilityLabel="فتح التقويم"
        >
          <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
        </Pressable>

        {/*
          forceRTL breaks horizontal scrollTo centering.
          Flip the strip to LTR for scroll math, then flip each pill back.
        */}
        <View
          style={styles.stripHost}
          onLayout={(e) => setStripWidth(e.nativeEvent.layout.width)}
        >
          <ScrollView
            ref={stripRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.strip}
            contentContainerStyle={[
              styles.stripContent,
              { paddingHorizontal: sidePad },
            ]}
          >
            {dateStrip.map((iso) => {
              const on = iso === selectedDate;
              const hasSlots = availableDates.has(iso);
              return (
                <View
                  key={iso}
                  style={styles.daySlot}
                  onLayout={(e) => {
                    const { x, width } = e.nativeEvent.layout;
                    const prev = dayLayouts.current[iso];
                    if (prev && prev.x === x && prev.width === width) return;
                    dayLayouts.current[iso] = { x, width };
                    setLayoutsReady((n) => n + 1);
                  }}
                >
                  <Pressable
                    disabled={!hasSlots}
                    onPress={() => onSelectDate(iso)}
                    style={styles.dayPress}
                  >
                    <View
                      style={[
                        styles.dayPill,
                        on && styles.dayPillOn,
                        !hasSlots && styles.dayPillDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNum,
                          on && styles.dayNumOn,
                          !hasSlots && styles.dayTextMuted,
                        ]}
                      >
                        {dayNumber(iso)}
                      </Text>
                      <Text
                        style={[
                          styles.dayName,
                          on && styles.dayNameOn,
                          !hasSlots && styles.dayTextMuted,
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                      >
                        {weekdayShort(iso)}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {selectedCount > 0 ? (
        <Text style={styles.multiHint}>
          تم اختيار {selectedCount} فترة — اضغط مجدداً لإلغاء التحديد
        </Text>
      ) : (
        <Text style={styles.multiHint}>يمكنك اختيار أكثر من فترة</Text>
      )}

      <ScrollView
        style={styles.timelineScroll}
        contentContainerStyle={[
          styles.timelineContent,
          { paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {!selectedDate ? (
          <Text style={styles.emptyHint}>اختر يوماً لعرض المواعيد</Text>
        ) : rows.length === 0 ? (
          <Text style={styles.emptyHint}>لا توجد مواعيد في هذا اليوم</Text>
        ) : (
          rows.map((row) => {
            const selected =
              !!row.availabilityId &&
              selectedSlotIds.includes(row.availabilityId);
            const pressable = row.kind === 'available' && !!row.availabilityId;
            const span = Math.max(1, row.timeLabels.length);

            return (
              <View key={row.key} style={styles.row}>
                <Pressable
                  disabled={!pressable}
                  onPress={() => {
                    if (row.availabilityId) onToggleSlot(row.availabilityId);
                  }}
                  style={[
                    styles.slotBtn,
                    row.kind === 'available' && styles.slotAvailable,
                    row.kind === 'unavailable' && styles.slotUnavailable,
                    row.kind === 'booked' && styles.slotBooked,
                    span > 1 && {
                      minHeight: 52 * span + 10 * (span - 1),
                    },
                    selected && styles.slotSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.slotText,
                      row.kind === 'available' && styles.slotTextAvailable,
                      row.kind === 'unavailable' && styles.slotTextUnavailable,
                      row.kind === 'booked' && styles.slotTextBooked,
                    ]}
                  >
                    {row.kind === 'available'
                      ? 'احجز هذه الفترة'
                      : row.kind === 'booked'
                        ? 'فترة محجوزة'
                        : 'غير متوفر'}
                  </Text>
                </Pressable>
                <View style={styles.timeCol}>
                  {row.timeLabels.map((label) => (
                    <Text key={label} style={styles.timeLabel}>
                      {label}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <SmoothBottomSheet
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        sheetStyle={styles.calSheet}
      >
        <View style={styles.calHeading}>
          <Text style={styles.calTitle}>اختر التاريخ</Text>
          <Text style={styles.calSubtitle}>
            الأيام المتاحة للحجز تظهر بدون خط
          </Text>
        </View>
        <MonthCalendar
          year={calYear}
          monthIndex={calMonth}
          selectedDate={selectedDate}
          availableDates={availableDates}
          onChangeMonth={(y, m) => {
            setCalYear(y);
            setCalMonth(m);
          }}
          onSelectDate={(iso) => {
            onSelectDate(iso);
            setCalendarOpen(false);
            // Scroll after sheet closes and strip may expand for later months.
            setTimeout(() => scrollStripToDate(iso, true), 120);
          }}
        />
      </SmoothBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F6F9',
    minHeight: 520,
  },
  monthHint: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 2,
    marginBottom: 2,
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: DAY_PILL_HEIGHT + 24,
  },
  calendarBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripHost: {
    flex: 1,
    height: DAY_PILL_HEIGHT + 16,
    transform: [{ scaleX: -1 }],
  },
  strip: { flex: 1 },
  stripContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    minHeight: DAY_PILL_HEIGHT + 16,
  },
  /** Fixed box so Pressable/text cannot widen the capsule. */
  daySlot: {
    width: DAY_PILL_WIDTH,
    height: DAY_PILL_HEIGHT,
    transform: [{ scaleX: -1 }],
  },
  dayPress: {
    width: DAY_PILL_WIDTH,
    height: DAY_PILL_HEIGHT,
  },
  dayPill: {
    width: DAY_PILL_WIDTH,
    height: DAY_PILL_HEIGHT,
    borderRadius: 999,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  dayPillOn: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  dayPillDisabled: {
    opacity: 0.38,
  },
  dayNum: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'center',
    lineHeight: 26,
  },
  dayNumOn: { color: theme.colors.primary },
  dayName: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '500',
    color: '#8A97A5',
    textAlign: 'center',
    lineHeight: 14,
  },
  dayNameOn: { color: theme.colors.primary, fontWeight: '600' },
  dayTextMuted: { color: '#8A97A5' },
  multiHint: {
    color: theme.colors.accentDark,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  timelineScroll: { flex: 1 },
  timelineContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slotBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1.5,
  },
  slotAvailable: {
    backgroundColor: '#fff',
    borderColor: theme.colors.border,
  },
  slotUnavailable: {
    backgroundColor: '#EEF2F6',
    borderColor: theme.colors.border,
  },
  slotBooked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  slotSelected: {
    borderColor: theme.colors.accent,
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  slotText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  slotTextAvailable: { color: theme.colors.accentDark },
  slotTextUnavailable: { color: theme.colors.textSecondary },
  slotTextBooked: { color: '#fff' },
  timeCol: {
    width: 72,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    alignSelf: 'stretch',
    paddingVertical: 14,
    gap: 22,
  },
  timeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  emptyHint: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 48,
    fontSize: 14,
    fontWeight: '600',
  },
  calSheet: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    maxHeight: '85%',
  },
  calHeading: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 4,
  },
  calTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
    width: '100%',
  },
  calSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    width: '100%',
    lineHeight: 20,
  },
});
