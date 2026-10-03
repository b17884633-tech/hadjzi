import { Image, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { formatNumber } from '@/core/common/format';
import { theme } from '../../../core/ui/theme';
import { useApp } from '../../../di/AppProvider';

export function TopRatedCard({
  title,
  subtitle,
  rating,
  price,
  depositPercentage,
  categoryLabel,
  verified = true,
  image,
  onPress,
}: {
  title: string;
  subtitle?: string;
  rating?: number;
  price?: number;
  depositPercentage?: number;
  categoryLabel?: string;
  verified?: boolean;
  image?: string;
  onPress?: () => void;
}) {
  const { formatPrice } = useApp();
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.thumbWrap}>
        <Image
          source={image ? { uri: image } : require('../../../../assets/logo.png')}
          style={styles.thumb}
        />
        {categoryLabel ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText} numberOfLines={1}>
              {categoryLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <View style={styles.topRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
          </View>
          {rating != null ? (
            <View style={styles.ratingRow}>
              <Text style={styles.rating}>{formatNumber(rating, 1)}</Text>
              <Ionicons name="star" size={12} color={theme.colors.accent} />
            </View>
          ) : null}
        </View>

        {subtitle ? (
          <View style={styles.subtitleRow}>
            <View style={styles.subtitleWrap}>
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
            {verified ? (
              <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
            ) : null}
          </View>
        ) : null}

        <View style={styles.bottomRow}>
          {price != null ? (
            <View style={styles.priceWrap}>
              <Text style={styles.priceLine}>
                <Text style={styles.pricePrefix}>يبدأ من </Text>
                <Text style={styles.priceValue}>{formatPrice(price)}</Text>
              </Text>
            </View>
          ) : (
            <View style={styles.flex1} />
          )}
          {depositPercentage != null ? (
            <View style={styles.depositBadge}>
              <Text style={styles.depositText}>عربون {depositPercentage}%</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8ECF3',
    gap: 8,
  },
  pressed: {
    opacity: 0.92,
  },
  thumbWrap: {
    width: 82,
    height: 82,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: theme.colors.mint,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    start: 5,
    bottom: 5,
    backgroundColor: 'rgba(13,27,62,0.72)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    maxWidth: 72,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'right',
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  // flex-start = physical RIGHT under forceRTL
  titleWrap: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    maxWidth: '100%',
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  rating: {
    fontSize: 11,
    color: theme.colors.text,
    fontWeight: '700',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subtitleWrap: {
    flex: 1,
    alignItems: 'flex-start',
  },
  subtitle: {
    maxWidth: '100%',
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 16,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  flex1: { flex: 1 },
  priceWrap: {
    flex: 1,
    alignItems: 'flex-start',
  },
  depositBadge: {
    backgroundColor: '#E8F1FF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  depositText: {
    fontSize: 10,
    color: theme.colors.primaryLight,
    fontWeight: '700',
    textAlign: 'right',
  },
  priceLine: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  pricePrefix: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  priceValue: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '800',
  },
});
