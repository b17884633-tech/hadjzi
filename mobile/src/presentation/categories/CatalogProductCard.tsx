import { Image, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { formatNumber } from '@/core/common/format';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';

export type CatalogProductCardModel = {
  id: string;
  title: string;
  price?: number;
  image?: string;
  shopName?: string;
  cityName?: string;
  rating?: number;
  reviewCount?: number;
  verified?: boolean;
};

/** Compact 2-column product card — same visual language as FeaturedOfferCard. */
export function CatalogProductCard({
  product,
  onPress,
}: {
  product: CatalogProductCardModel;
  onPress?: () => void;
}) {
  const { formatPrice } = useApp();
  const verified = product.verified !== false;
  const shopLine = [product.shopName, product.cityName]
    .filter(Boolean)
    .join(' · ');
  const hasRating =
    product.rating != null &&
    (product.reviewCount == null || product.reviewCount > 0);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.imageWrap}>
        <Image
          source={
            product.image
              ? { uri: product.image }
              : require('../../../assets/logo.png')
          }
          style={styles.image}
          resizeMode="cover"
        />
      </View>

      <View style={styles.body}>
        <View style={styles.titlePill}>
          {verified ? (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={8} color="#fff" />
            </View>
          ) : null}
          <Text style={styles.title} numberOfLines={1}>
            {product.title}
          </Text>
        </View>

        {product.price != null ? (
          <Text style={styles.priceLine} numberOfLines={1}>
            {formatPrice(product.price)}
            <Text style={styles.priceUnit}> / يوم</Text>
          </Text>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.footer}>
          {shopLine ? (
            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={11}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.locationText} numberOfLines={1}>
                {shopLine}
              </Text>
            </View>
          ) : (
            <View style={styles.flex1} />
          )}
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={10} color={theme.colors.accent} />
            <Text style={styles.ratingValue}>
              {hasRating ? formatNumber(product.rating!, 1) : 'جديد'}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EEF2',
    marginBottom: 12,
    shadowColor: '#0D1B3E',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  pressed: { opacity: 0.96 },
  imageWrap: {
    width: '100%',
    aspectRatio: 1.05,
    backgroundColor: theme.colors.tealLight,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  body: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 9,
    gap: 5,
  },
  titlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: theme.colors.tealLight,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  verifiedBadge: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  priceLine: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  priceUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  flex1: { flex: 1 },
  locationRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    justifyContent: 'flex-start',
  },
  locationText: {
    flexShrink: 1,
    fontSize: 9,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F3EBD8',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ratingValue: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
