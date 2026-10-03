import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { SmoothBottomSheet } from '../../core/ui/components/SmoothBottomSheet';
import { theme } from '../../core/ui/theme';
import { CURRENCIES, CurrencyCode } from '../../core/common/currency';

interface CurrencyPickerSheetProps {
  visible: boolean;
  selectedCode: CurrencyCode;
  onClose: () => void;
  onSelect: (code: CurrencyCode) => void;
}

export function CurrencyPickerSheet({
  visible,
  selectedCode,
  onClose,
  onSelect,
}: CurrencyPickerSheetProps) {
  return (
    <SmoothBottomSheet visible={visible} onClose={onClose} sheetStyle={styles.sheet}>
      <View style={styles.heading}>
        <Text style={styles.title}>عملة العرض</Text>
        <Text style={styles.subtitle}>اختر العملة التي تود عرض الأسعار بها</Text>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} bounces={false}>
        {CURRENCIES.map((item) => {
          const selected = item.code === selectedCode;
          return (
            <Pressable
              key={item.code}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => {
                onSelect(item.code);
                onClose();
              }}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <View style={styles.labels}>
                <Text style={[styles.name, selected && styles.nameSelected]}>
                  {item.label}
                </Text>
                <Text style={styles.symbol}>{item.symbol}</Text>
              </View>
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
    maxHeight: '52%',
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
  labels: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  nameSelected: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  symbol: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
});
