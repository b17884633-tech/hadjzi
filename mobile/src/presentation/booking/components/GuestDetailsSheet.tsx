import { Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SmoothBottomSheet } from '../../../core/ui/components/SmoothBottomSheet';
import { theme } from '../../../core/ui/theme';
import { AttendanceTypeSheet } from './AttendanceTypeSheet';
import { useState } from 'react';

type Props = {
  visible: boolean;
  attendanceType: string;
  adults: number;
  children: number;
  onChangeAttendance: (v: string) => void;
  onChangeAdults: (n: number) => void;
  onChangeChildren: (n: number) => void;
  onClose: () => void;
  onNext: () => void;
};

function Stepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        style={[styles.stepBtn, value <= 0 && styles.stepBtnDisabled]}
        disabled={value <= 0}
        onPress={() => onChange(Math.max(0, value - 1))}
      >
        <Ionicons name="remove" size={16} color="#fff" />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable style={styles.stepBtn} onPress={() => onChange(value + 1)}>
        <Ionicons name="add" size={16} color="#fff" />
      </Pressable>
    </View>
  );
}

export function GuestDetailsSheet({
  visible,
  attendanceType,
  adults,
  children,
  onChangeAttendance,
  onChangeAdults,
  onChangeChildren,
  onClose,
  onNext,
}: Props) {
  const [typeOpen, setTypeOpen] = useState(false);

  return (
    <>
      <SmoothBottomSheet visible={visible} onClose={onClose} sheetStyle={styles.sheet}>
        <Text style={styles.title}>بيانات الأشخاص في الحجز</Text>
        <Text style={styles.subtitle}>
          قم بتحديد نوع الحضور وعدد الأشخاص الحاضرين للحجز
        </Text>

        <Text style={styles.fieldLabel}>نوع الحجز</Text>
        <Pressable style={styles.select} onPress={() => setTypeOpen(true)}>
          <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
          <View style={styles.selectRight}>
            <Ionicons name="person-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.selectText}>{attendanceType}</Text>
          </View>
        </Pressable>

        <View style={styles.countRow}>
          <Stepper value={adults} onChange={onChangeAdults} />
          <View style={styles.countLabel}>
            <Text style={styles.countTitle}>عدد الكبار</Text>
            <Ionicons name="people-outline" size={18} color={theme.colors.accent} />
          </View>
        </View>

        <View style={styles.countRow}>
          <Stepper value={children} onChange={onChangeChildren} />
          <View style={styles.countLabel}>
            <Text style={styles.countTitle}>عدد الأطفال</Text>
            <Ionicons name="people-outline" size={18} color={theme.colors.accent} />
          </View>
        </View>

        <Pressable onPress={onNext} style={styles.nextWrap}>
          <LinearGradient
            colors={[theme.colors.primaryLight, theme.colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextBtn}
          >
            <Text style={styles.nextText}>التالي</Text>
          </LinearGradient>
        </Pressable>
      </SmoothBottomSheet>

      <AttendanceTypeSheet
        visible={typeOpen}
        selected={attendanceType}
        onClose={() => setTypeOpen(false)}
        onSelect={onChangeAttendance}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 8,
    textAlign: 'right',
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  selectRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  countLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.accent },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3F6F9',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { backgroundColor: '#D0D5DD' },
  stepValue: {
    minWidth: 18,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  nextWrap: { marginTop: 10 },
  nextBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
