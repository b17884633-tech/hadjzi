import { StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../core/ui/theme';
import {
  offerPeriodLabel,
  type ProviderOffer,
} from '../../../domain/model/ProviderOffer';

type Props = {
  offer: Pick<ProviderOffer, 'discountPercent' | 'startsOn' | 'endsOn'>;
};

/**
 * Discount coupon under the facility name.
 * Top row: large % (top-aligned) + label; bottom: period with clock.
 */
export function FacilityOfferBanner({ offer }: Props) {
  const pct = Number(offer.discountPercent);
  if (!Number.isFinite(pct) || pct <= 0) return null;

  const pctLabel = pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.percent}>{pctLabel} %</Text>
        <Text style={styles.headLabel}>تخفيض على قيمة الحجز</Text>
      </View>
      <View style={styles.periodRow}>
        <Ionicons name="time-outline" size={15} color={theme.colors.primary} />
        <Text style={styles.period}>
          {offerPeriodLabel(offer.startsOn, offer.endsOn)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.tealLight,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    gap: 10,
  },
  head: {
    // forceRTL: flex-start = physical right → % sits top-right
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  percent: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
    lineHeight: 26,
    textAlign: 'right',
  },
  headLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    lineHeight: 22,
    // Align with the top of the large % numeral
    paddingTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  period: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    color: theme.colors.primaryLight,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
