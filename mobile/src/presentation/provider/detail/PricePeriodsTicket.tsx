import { Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import {
  formatPeriodRange,
  type PricePeriod,
} from '../../../core/common/pricePeriods';
import { formatNumber } from '../../../core/common/format';
import {
  convertFromNewYer,
  getCurrency,
  type CurrencyCode,
} from '../../../core/common/currency';
import { theme } from '../../../core/ui/theme';

type Props = {
  periods: PricePeriod[];
  currency: CurrencyCode;
  selectedId?: string | null;
  onSelect?: (period: PricePeriod) => void;
};

/**
 * Light ticket-style «تفاصيل الأسعار» — time + price stay on one line.
 */
export function PricePeriodsTicket({
  periods,
  currency,
  selectedId,
  onSelect,
}: Props) {
  if (!periods.length) return null;
  const currencyMeta = getCurrency(currency);

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>تفاصيل الأسعار</Text>
      <View style={styles.ticket}>
        {periods.map((p, index) => {
          const converted = convertFromNewYer(p.pricePerHour, currency);
          const amount =
            currency === 'USD' || currency === 'SAR'
              ? formatNumber(converted, 2)
              : formatNumber(Math.round(converted));
          const selected = selectedId === p.id;
          const isLast = index === periods.length - 1;
          const body = (
            <>
              <View style={styles.periodTitleRow}>
                <Ionicons
                  name="hourglass-outline"
                  size={12}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.periodLabel} numberOfLines={1}>
                  {p.label}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.timeRange} numberOfLines={1}>
                  {formatPeriodRange(p.fromTime, p.toTime)}
                </Text>
                <Text style={styles.price} numberOfLines={1}>
                  {amount} {currencyMeta.symbol} / ساعة
                </Text>
              </View>
            </>
          );

          return (
            <View key={p.id}>
              {onSelect ? (
                <Pressable
                  style={[styles.row, selected && styles.rowSelected]}
                  onPress={() => onSelect(p)}
                >
                  {body}
                </Pressable>
              ) : (
                <View style={styles.row}>{body}</View>
              )}
              {!isLast ? (
                <View style={styles.dividerRow}>
                  <View style={styles.notchLeft} />
                  <View style={styles.dashLine} />
                  <View style={styles.notchRight} />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 10,
    marginTop: 4,
  },
  heading: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  ticket: {
    backgroundColor: '#F7F9FC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    paddingVertical: 2,
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  rowSelected: {
    backgroundColor: theme.colors.tealLight,
  },
  periodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },
  periodLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  timeRange: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  price: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.accentDark,
    textAlign: 'left',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 12,
  },
  notchLeft: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    marginLeft: -6,
  },
  notchRight: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    marginRight: -6,
  },
  dashLine: {
    flex: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
  },
});
