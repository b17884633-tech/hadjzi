import { Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { SmoothBottomSheet } from '../../../core/ui/components/SmoothBottomSheet';
import { theme } from '../../../core/ui/theme';
import { ATTENDANCE_OPTIONS, AttendanceType } from '../bookingFlow';

type Props = {
  visible: boolean;
  selected?: string;
  onClose: () => void;
  onSelect: (value: AttendanceType) => void;
};

export function AttendanceTypeSheet({ visible, selected, onClose, onSelect }: Props) {
  return (
    <SmoothBottomSheet visible={visible} onClose={onClose} sheetStyle={styles.sheet}>
      <Text style={styles.title}>نوع الحضور</Text>
      <Text style={styles.subtitle}>اختر نوع الحضور المناسب للحجز</Text>

      {ATTENDANCE_OPTIONS.map((opt) => {
        const isSelected = selected === opt;
        return (
          <Pressable
            key={opt}
            style={styles.row}
            onPress={() => {
              onSelect(opt);
              onClose();
            }}
          >
            <View style={[styles.radio, isSelected && styles.radioOn]}>
              {isSelected ? <View style={styles.dot} /> : null}
            </View>
            <Text style={[styles.label, isSelected && styles.labelOn]}>{opt}</Text>
          </Pressable>
        );
      })}
    </SmoothBottomSheet>
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
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8EDF5',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: theme.colors.accent },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.accent,
  },
  label: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '500',
  },
  labelOn: { fontWeight: '700', color: theme.colors.primary },
});
