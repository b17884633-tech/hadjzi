import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { BackButton } from '@/core/ui/components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { ServiceAvailability } from '../booking/bookingFlow';
import {
  addDaysIso,
  toIsoDate,
} from '../booking/bookingFlow';
import { formatArabicClock } from '../booking/components/SlotReservationPanel';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProviderSlotSchedule'>;

const WEEKDAY_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

function todayIso() {
  const n = new Date();
  return toIsoDate(n.getFullYear(), n.getMonth(), n.getDate());
}

export function ProviderSlotScheduleScreen({ route, navigation }: Props) {
  const { serviceId, serviceName } = route.params;
  const { container } = useApp();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [slots, setSlots] = useState<ServiceAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayIso());

  const load = useCallback(async () => {
    const svc = await container.serviceApi.getService(serviceId);
    setSlots(svc.availabilities ?? []);
  }, [container, serviceId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      load()
        .catch(() => {
          if (active) setSlots([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [load]),
  );

  const dateStrip = useMemo(() => {
    const start = todayIso();
    return Array.from({ length: 21 }, (_, i) => addDaysIso(start, i));
  }, []);

  const daySlots = useMemo(
    () =>
      slots
        .filter((s) => s.date === selectedDate && s.startTime)
        .slice()
        .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime))),
    [slots, selectedDate],
  );

  const seedHours = async () => {
    setBusy(true);
    try {
      const res = await container.serviceApi.seedHourlyAvailabilities(serviceId, {
        fromDate: todayIso(),
        days: 14,
        startHour: 8,
        endHour: 22,
        totalCapacity: 1,
      });
      await load();
      Alert.alert(
        'تم',
        res.inserted > 0
          ? `تمت إضافة ${res.inserted} فترة زمنية.`
          : 'الفترات موجودة مسبقاً.',
      );
    } catch (e) {
      Alert.alert(
        'تعذر التوليد',
        e instanceof Error ? e.message : 'حاول مرة أخرى',
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleSlot = async (slot: ServiceAvailability) => {
    if (busy) return;
    const next = slot.status === 'BLOCKED' ? 'AVAILABLE' : 'BLOCKED';
    if (slot.status === 'SOLD_OUT' || (slot.availableCapacity ?? 0) <= 0 && slot.status !== 'BLOCKED') {
      Alert.alert('محجوزة', 'لا يمكن تعديل فترة عليها حجز قائم.');
      return;
    }
    setBusy(true);
    try {
      await container.serviceApi.updateAvailabilityStatus(
        serviceId,
        slot.id,
        next,
      );
      await load();
    } catch (e) {
      Alert.alert(
        'تعذر التحديث',
        e instanceof Error ? e.message : 'حاول مرة أخرى',
      );
    } finally {
      setBusy(false);
    }
  };

  const addBlockedHour = async (hour: number) => {
    if (busy) return;
    const startTime = `${String(hour).padStart(2, '0')}:00`;
    const endTime = `${String(hour + 1).padStart(2, '0')}:00`;
    setBusy(true);
    try {
      await container.serviceApi.addAvailability(serviceId, {
        date: selectedDate,
        startTime,
        endTime,
        totalCapacity: 1,
        status: 'BLOCKED',
      });
      await load();
    } catch (e) {
      Alert.alert(
        'تعذر الإضافة',
        e instanceof Error ? e.message : 'حاول مرة أخرى',
      );
    } finally {
      setBusy(false);
    }
  };

  /** Hours 8–21 that have no slot yet — provider can mark unavailable. */
  const missingHours = useMemo(() => {
    const have = new Set(
      daySlots.map((s) => Number(String(s.startTime).slice(0, 2))),
    );
    const out: number[] = [];
    for (let h = 8; h < 22; h++) {
      if (!have.has(h)) out.push(h);
    }
    return out;
  }, [daySlots]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={styles.headerText}>
          <Text style={styles.title}>إدارة الفترات</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {serviceName}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.hint}>
        اضغط على فترة متاحة لجعلها غير متوفرة، أو على غير متوفرة لإعادة فتحها.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {dateStrip.map((iso) => {
          const on = iso === selectedDate;
          const d = new Date(`${iso}T12:00:00`);
          return (
            <Pressable
              key={iso}
              style={[styles.dayPill, on && styles.dayPillOn]}
              onPress={() => setSelectedDate(iso)}
            >
              <Text style={[styles.dayNum, on && styles.dayOn]}>{iso.slice(8, 10)}</Text>
              <Text style={[styles.dayName, on && styles.dayOn]}>
                {WEEKDAY_AR[d.getDay()]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        style={[styles.seedBtn, busy && { opacity: 0.5 }]}
        disabled={busy}
        onPress={() => void seedHours()}
      >
        <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
        <Text style={styles.seedText}>توليد فترات يومية (8ص–10م)</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: 24 + insets.bottom },
          ]}
        >
          {daySlots.length === 0 ? (
            <Text style={styles.empty}>
              لا توجد فترات لهذا اليوم. استخدم زر التوليد أولاً.
            </Text>
          ) : (
            daySlots.map((slot) => {
              const blocked = slot.status === 'BLOCKED';
              const booked =
                slot.status === 'SOLD_OUT' ||
                ((slot.availableCapacity ?? 0) <= 0 && !blocked);
              return (
                <Pressable
                  key={slot.id}
                  disabled={booked || busy}
                  onPress={() => void toggleSlot(slot)}
                  style={[
                    styles.row,
                    blocked && styles.rowBlocked,
                    booked && styles.rowBooked,
                  ]}
                >
                  <Text style={styles.rowTime}>
                    {formatArabicClock(slot.startTime)}
                  </Text>
                  <Text
                    style={[
                      styles.rowLabel,
                      blocked && styles.rowLabelBlocked,
                      booked && styles.rowLabelBooked,
                    ]}
                  >
                    {booked
                      ? 'محجوزة'
                      : blocked
                        ? 'غير متوفرة — اضغط لفتحها'
                        : 'متاحة — اضغط لإغلاقها'}
                  </Text>
                  <Ionicons
                    name={
                      booked
                        ? 'lock-closed-outline'
                        : blocked
                          ? 'close-circle-outline'
                          : 'checkmark-circle-outline'
                    }
                    size={20}
                    color={
                      booked
                        ? theme.colors.textSecondary
                        : blocked
                          ? theme.colors.error
                          : theme.colors.success
                    }
                  />
                </Pressable>
              );
            })
          )}

          {missingHours.length > 0 ? (
            <View style={styles.missingBlock}>
              <Text style={styles.missingTitle}>إضافة فترة غير متوفرة</Text>
              <View style={styles.missingWrap}>
                {missingHours.map((h) => (
                  <Pressable
                    key={h}
                    style={styles.missingChip}
                    disabled={busy}
                    onPress={() => void addBlockedHour(h)}
                  >
                    <Text style={styles.missingChipText}>
                      {formatArabicClock(`${String(h).padStart(2, '0')}:00`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
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
  headerText: { flex: 1, alignItems: 'center' },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  sub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  hint: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
  },
  strip: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 12,
    gap: 6,
    paddingBottom: 8,
  },
  dayPill: {
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  dayPillOn: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  dayNum: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  dayOn: { color: theme.colors.primary },
  seedBtn: {
    marginHorizontal: 16,
    marginBottom: 10,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8F1E4',
    borderWidth: 1,
    borderColor: 'rgba(197,163,104,0.35)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  seedText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  list: { paddingHorizontal: 14, gap: 8 },
  empty: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: 32,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowBlocked: {
    backgroundColor: '#FDECEC',
    borderColor: '#F5C2C2',
  },
  rowBooked: {
    opacity: 0.55,
  },
  rowTime: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
    minWidth: 64,
    textAlign: 'right',
  },
  rowLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  rowLabelBlocked: { color: theme.colors.error },
  rowLabelBooked: { color: theme.colors.textSecondary },
  missingBlock: { marginTop: 16, gap: 10 },
  missingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  missingWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  missingChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  missingChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
