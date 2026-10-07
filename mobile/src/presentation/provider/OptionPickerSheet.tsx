import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { SmoothBottomSheet } from '../../core/ui/components/SmoothBottomSheet';
import { theme } from '../../core/ui/theme';

export type PickerOption = {
  id: number | string;
  name: string;
};

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: PickerOption[];
  selectedId?: number | string | null;
  onClose: () => void;
  onSelect: (option: PickerOption) => void;
};

export function OptionPickerSheet({
  visible,
  title,
  subtitle,
  options,
  selectedId,
  onClose,
  onSelect,
}: Props) {
  return (
    <SmoothBottomSheet visible={visible} onClose={onClose} sheetStyle={styles.sheet}>
      <View style={styles.heading}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} bounces={false}>
        {options.map((opt) => {
          const selected = opt.id === selectedId;
          return (
            <Pressable
              key={String(opt.id)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => {
                onSelect(opt);
                onClose();
              }}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <Text style={[styles.name, selected && styles.nameSelected]}>
                {opt.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SmoothBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxHeight: '58%',
  },
  heading: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
    width: '100%',
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    width: '100%',
    lineHeight: 20,
  },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8EDF5',
  },
  rowPressed: { opacity: 0.7 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: theme.colors.accent },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.accent,
  },
  name: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
    textAlign: 'right',
  },
  nameSelected: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
