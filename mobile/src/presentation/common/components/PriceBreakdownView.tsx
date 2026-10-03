import { StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { theme } from '../../../core/ui/theme';
import { useApp } from '../../../di/AppProvider';

interface PriceBreakdownViewProps {
  total: number;
  depositPercentage: number;
  depositAmount: number;
  remainingAmount: number;
  /** @deprecated Ignored — display currency comes from app settings */
  currency?: string;
}

export function PriceBreakdownView({
  total,
  depositPercentage,
  depositAmount,
  remainingAmount,
}: PriceBreakdownViewProps) {
  const { formatPrice } = useApp();

  return (
    <View style={styles.container}>
      <Row label="الإجمالي" value={formatPrice(total)} bold />
      <Row
        label={`العربون (${depositPercentage}%)`}
        value={formatPrice(depositAmount)}
        accent
      />
      <Row label="المتبقي" value={formatPrice(remainingAmount)} />
    </View>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, bold && styles.bold]}>{label}</Text>
      <Text
        style={[
          styles.value,
          bold && styles.bold,
          accent && { color: theme.colors.accent },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  value: {
    ...theme.typography.body,
    color: theme.colors.text,
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  bold: {
    fontWeight: '700',
    color: theme.colors.text,
  },
});
