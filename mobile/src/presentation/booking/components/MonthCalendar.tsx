import { Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../core/ui/theme';
import { toIsoDate } from '../bookingFlow';

/** Short labels so 7 columns fit; Sat-first for Arabic. */
const WEEKDAYS = ['سبت', 'أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع'];

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

type DayCell = { day: number | null; iso?: string };

type Props = {
  year: number;
  monthIndex: number;
  selectedDate?: string;
  /** Range mode: check-in */
  rangeStart?: string;
  /** Range mode: check-out (exclusive end for nights) */
  rangeEnd?: string;
  availableDates: Set<string>;
  onChangeMonth: (year: number, monthIndex: number) => void;
  onSelectDate: (iso: string) => void;
};

function buildWeeks(year: number, monthIndex: number): DayCell[][] {
  const first = new Date(year, monthIndex, 1);
  const jsDay = first.getDay();
  const startOffset = (jsDay + 1) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const flat: DayCell[] = [];
  for (let i = 0; i < startOffset; i++) flat.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    flat.push({ day: d, iso: toIsoDate(year, monthIndex, d) });
  }
  while (flat.length % 7 !== 0) flat.push({ day: null });

  const weeks: DayCell[][] = [];
  for (let i = 0; i < flat.length; i += 7) {
    weeks.push(flat.slice(i, i + 7));
  }
  return weeks;
}

function inRange(iso: string, start?: string, end?: string): boolean {
  if (!start || !end) return false;
  return iso >= start && iso < end;
}

/** Saturday-first calendar; forced RTL so columns stay aligned. */
export function MonthCalendar({
  year,
  monthIndex,
  selectedDate,
  rangeStart,
  rangeEnd,
  availableDates,
  onChangeMonth,
  onSelectDate,
}: Props) {
  const weeks = buildWeeks(year, monthIndex);
  const todayIso = toIsoDate(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  );
  const rangeMode = rangeStart != null || rangeEnd != null;

  const prev = () => {
    if (monthIndex === 0) onChangeMonth(year - 1, 11);
    else onChangeMonth(year, monthIndex - 1);
  };
  const next = () => {
    if (monthIndex === 11) onChangeMonth(year + 1, 0);
    else onChangeMonth(year, monthIndex + 1);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.monthLabel}>
          {MONTHS_AR[monthIndex]} {year}
        </Text>
        <View style={styles.nav}>
          <Pressable style={styles.navBtn} onPress={prev} hitSlop={6}>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
          </Pressable>
          <Pressable style={styles.navBtn} onPress={next} hitSlop={6}>
            <Ionicons name="chevron-back" size={16} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.calDir}>
        <View style={styles.weekRow}>
          {WEEKDAYS.map((d) => (
            <View key={d} style={styles.cell}>
              <Text style={styles.weekday}>{d}</Text>
            </View>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={`w-${wi}`} style={styles.weekRow}>
            {week.map((cell, di) => {
              if (cell.day == null || !cell.iso) {
                return <View key={`e-${wi}-${di}`} style={styles.cell} />;
              }
              const available = availableDates.has(cell.iso) && cell.iso >= todayIso;
              const isStart = rangeStart === cell.iso;
              const isEnd = rangeEnd === cell.iso;
              const mid = inRange(cell.iso, rangeStart, rangeEnd);
              const selected = rangeMode
                ? isStart || isEnd
                : selectedDate === cell.iso;
              return (
                <Pressable
                  key={cell.iso}
                  style={[
                    styles.cell,
                    mid && styles.cellMid,
                    selected && styles.cellSelected,
                  ]}
                  disabled={!available && !(rangeMode && rangeStart && cell.iso > rangeStart)}
                  onPress={() => onSelectDate(cell.iso!)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !available && !selected && !mid && styles.dayUnavailable,
                      (selected || mid) && styles.daySelected,
                    ]}
                  >
                    {cell.day}
                  </Text>
                  {!available && !selected && !mid ? <View style={styles.strike} /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  nav: { flexDirection: 'row', gap: 8 },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F6F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDir: {
    direction: 'rtl',
  },
  weekRow: {
    flexDirection: 'row',
    width: '100%',
  },
  cell: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellMid: {
    backgroundColor: '#E8EEF8',
  },
  cellSelected: {
    backgroundColor: theme.colors.tealLight,
    borderRadius: 12,
  },
  weekday: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '700',
    textAlign: 'center',
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  dayUnavailable: {
    color: '#C5CDD6',
  },
  daySelected: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  strike: {
    position: 'absolute',
    width: 16,
    height: 1.5,
    backgroundColor: '#C5CDD6',
    transform: [{ rotate: '-20deg' }],
  },
});
