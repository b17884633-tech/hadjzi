import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { SmoothBottomSheet } from '@/core/ui/components/SmoothBottomSheet';
import { theme } from '../../../core/ui/theme';
import { addDaysIso, toIsoDate } from '../../booking/bookingFlow';
import { MonthCalendar } from '../../booking/components/MonthCalendar';
import { HomeWhenFilter, whenFilterLabel } from './HomeSearchBar';

const QUICK_OPTIONS: HomeWhenFilter[] = ['any', 'today', 'tomorrow'];
/** Leave room for title + sticky confirm + safe area inside the sheet. */
const SCROLL_MAX_H = Math.min(380, Dimensions.get('window').height * 0.48);

type Props = {
  visible: boolean;
  selected: HomeWhenFilter;
  customDate?: string;
  onClose: () => void;
  onSelect: (when: HomeWhenFilter, customDate?: string) => void;
};

function buildFutureDates(days: number): Set<string> {
  const now = new Date();
  let cur = toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
  const set = new Set<string>();
  for (let i = 0; i < days; i++) {
    set.add(cur);
    cur = addDaysIso(cur, 1);
  }
  return set;
}

export function WhenPickerSheet({
  visible,
  selected,
  customDate,
  onClose,
  onSelect,
}: Props) {
  const now = new Date();
  const [showCalendar, setShowCalendar] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [picked, setPicked] = useState(customDate);
  const availableDates = useMemo(() => buildFutureDates(180), []);

  useEffect(() => {
    if (!visible) return;
    setShowCalendar(selected === 'custom');
    setPicked(customDate);
    if (customDate) {
      const [y, m] = customDate.split('-').map(Number);
      if (y && m) {
        setYear(y);
        setMonthIndex(m - 1);
      }
    }
  }, [visible, selected, customDate]);

  const openCustom = () => {
    setShowCalendar(true);
    if (customDate) {
      const [y, m] = customDate.split('-').map(Number);
      if (y && m) {
        setYear(y);
        setMonthIndex(m - 1);
      }
    }
  };

  const closeSheet = () => {
    setShowCalendar(false);
    onClose();
  };

  return (
    <SmoothBottomSheet visible={visible} onClose={closeSheet} sheetStyle={styles.sheet}>
      <Text style={styles.title}>متى تبحث؟</Text>
      <Text style={styles.subtitle}>تصفية المنشآت حسب التوفر</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.list}>
          {QUICK_OPTIONS.map((opt) => {
            const on = opt === selected && selected !== 'custom';
            return (
              <Pressable
                key={opt}
                style={[styles.row, on && styles.rowOn]}
                onPress={() => {
                  setShowCalendar(false);
                  onSelect(opt);
                  onClose();
                }}
              >
                <Ionicons
                  name={on ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={on ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={[styles.rowText, on && styles.rowTextOn]}>
                  {whenFilterLabel(opt)}
                </Text>
              </Pressable>
            );
          })}

          <Pressable
            style={[styles.row, (selected === 'custom' || showCalendar) && styles.rowOn]}
            onPress={openCustom}
          >
            <Ionicons
              name={selected === 'custom' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={
                selected === 'custom' || showCalendar
                  ? theme.colors.primary
                  : theme.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.rowText,
                (selected === 'custom' || showCalendar) && styles.rowTextOn,
              ]}
            >
              {selected === 'custom' && customDate
                ? `تاريخ مخصص · ${customDate}`
                : 'تاريخ مخصص'}
            </Text>
            <Ionicons
              name={showCalendar ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>

        {showCalendar ? (
          <View style={styles.calendarWrap}>
            <MonthCalendar
              year={year}
              monthIndex={monthIndex}
              selectedDate={picked}
              availableDates={availableDates}
              onChangeMonth={(y, m) => {
                setYear(y);
                setMonthIndex(m);
              }}
              onSelectDate={(iso) => setPicked(iso)}
            />
          </View>
        ) : null}
      </ScrollView>

      {showCalendar ? (
        <View style={styles.footer}>
          <Pressable
            style={[styles.confirmBtn, !picked && styles.confirmDisabled]}
            disabled={!picked}
            onPress={() => {
              if (!picked) return;
              onSelect('custom', picked);
              setShowCalendar(false);
              onClose();
            }}
          >
            <Text style={styles.confirmText}>تأكيد التاريخ</Text>
          </Pressable>
        </View>
      ) : null}
    </SmoothBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 18,
    paddingBottom: 8,
    maxHeight: '88%',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  scroll: {
    flexGrow: 0,
    maxHeight: SCROLL_MAX_H,
  },
  scrollContent: {
    paddingBottom: 8,
    gap: 12,
  },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F7FB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  rowOn: {
    backgroundColor: '#EEF2FA',
    borderColor: theme.colors.primary,
  },
  rowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rowTextOn: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  calendarWrap: {
    marginTop: 4,
  },
  footer: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8EDF5',
  },
  confirmBtn: {
    height: 50,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDisabled: { opacity: 0.45 },
  confirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
