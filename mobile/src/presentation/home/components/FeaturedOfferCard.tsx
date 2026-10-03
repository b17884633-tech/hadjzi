import { Image, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { formatNumber } from '@/core/common/format';
import { theme } from '../../../core/ui/theme';
import { useApp } from '../../../di/AppProvider';

const GRID_GAP = 2;

export interface FeaturedOffer {
  id: string;
  title: string;
  rating?: number;
  reviewCount?: number;
  price?: number;
  depositPercentage?: number;
  image?: string;
  images?: string[];
  cityName?: string;
  regionName?: string;
  addressDetails?: string;
  categoryName?: string;
  features?: string[];
  verified?: boolean;
  instantConfirm?: boolean;
  discountPercent?: number;
  offerTag?: string;
}

function buildImageSlots(offer: FeaturedOffer): (string | undefined)[] {
  const list = (offer.images?.length ? offer.images : offer.image ? [offer.image] : []).filter(
    Boolean,
  ) as string[];
  if (list.length === 0) return [undefined, undefined, undefined, undefined];
  return [0, 1, 2, 3].map((i) => list[i % list.length]);
}

export function FeaturedOfferCard({
  offer,
  onPress,
}: {
  offer: FeaturedOffer;
  onPress?: () => void;
}) {
  const { formatPrice } = useApp();
  const slots = buildImageSlots(offer);
  const locationLabel =
    offer.addressDetails?.trim() ||
    [offer.cityName, offer.regionName].filter(Boolean).join('، ');
  const verified = offer.verified !== false;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.imageGrid}>
        <View style={styles.gridRow}>
          <GridCell uri={slots[0]} corner="topStart" />
          <GridCell uri={slots[1]} corner="topEnd" />
        </View>
        <View style={styles.gridRow}>
          <GridCell uri={slots[2]} />
          <GridCell uri={slots[3]} />
        </View>
        <View style={styles.cubeFab}>
          <Ionicons name="cube-outline" size={15} color="#fff" />
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.titlePill}>
          {verified ? (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={9} color="#fff" />
            </View>
          ) : null}
          <Text style={styles.title} numberOfLines={1}>
            {offer.title}
          </Text>
        </View>

        {offer.price != null ? (
          <Text style={styles.priceLine} numberOfLines={1}>
            يبدأ من {formatPrice(offer.price)}
          </Text>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.footer}>
          {locationLabel ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
              <Text style={styles.locationText} numberOfLines={1}>
                {locationLabel}
              </Text>
            </View>
          ) : (
            <View style={styles.flex1} />
          )}
          {offer.rating != null ? (
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={10} color={theme.colors.accent} />
              <Text style={styles.ratingValue}>{formatNumber(offer.rating, 1)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function GridCell({
  uri,
  corner,
}: {
  uri?: string;
  corner?: 'topStart' | 'topEnd';
}) {
  return (
    <View
      style={[
        styles.gridCell,
        corner === 'topStart' && styles.cornerTopStart,
        corner === 'topEnd' && styles.cornerTopEnd,
      ]}
    >
      <Image
        source={uri ? { uri } : require('../../../../assets/logo.png')}
        style={styles.gridImage}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
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
  imageGrid: {
    height: 228,
    backgroundColor: theme.colors.border,
    position: 'relative',
    gap: GRID_GAP,
    padding: GRID_GAP,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  gridCell: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: theme.colors.tealLight,
  },
  cornerTopStart: {
    borderTopRightRadius: 16,
  },
  cornerTopEnd: {
    borderTopLeftRadius: 16,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  cubeFab: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  body: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 4,
  },
  titlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: theme.colors.tealLight,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  verifiedBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flexShrink: 1,
    fontSize: 12,
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
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  flex1: { flex: 1 },
  locationRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    justifyContent: 'flex-start',
  },
  locationText: {
    flexShrink: 1,
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3EBD8',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ratingValue: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
