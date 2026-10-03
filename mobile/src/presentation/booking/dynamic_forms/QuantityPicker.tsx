import { Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../core/ui/theme';

interface QuantityPickerProps {
  quantity: number;
  min?: number;
  max?: number;
  label?: string;
  onChange: (quantity: number) => void;
}

export function QuantityPicker({
  quantity,
  min = 1,
  max = 99,
  label = 'الكمية',
  onChange,
}: QuantityPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{label}</Text>
      <View style={styles.controls}>
        <Pressable
          style={styles.button}
          onPress={() => onChange(Math.max(min, quantity - 1))}
        >
          <Ionicons name="remove" size={18} color="#fff" />
        </Pressable>
        <Text style={styles.value}>{quantity}</Text>
        <Pressable
          style={styles.button}
          onPress={() => onChange(Math.min(max, quantity + 1))}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
    minWidth: 28,
    textAlign: 'center',
  },
});
