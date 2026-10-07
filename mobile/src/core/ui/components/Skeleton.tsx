import { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { theme } from '../theme';

const BONE = '#E6ECF2';
const BONE_SOFT = '#F1F5F9';

type BoneProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

/** Soft pulsing placeholder block. */
export function SkeletonBone({
  width = '100%',
  height = 14,
  radius = 8,
  style,
}: BoneProps) {
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: BONE,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Listing card skeleton — matches FeaturedOfferCard / home list layout. */
export function OfferCardSkeleton() {
  return (
    <View style={styles.offerCard}>
      <SkeletonBone height={180} radius={0} style={styles.offerImage} />
      <View style={styles.offerBody}>
        <View style={styles.offerTitleRow}>
          <SkeletonBone width="58%" height={14} radius={7} />
          <SkeletonBone width={56} height={22} radius={999} />
        </View>
        <SkeletonBone width="92%" height={11} radius={6} style={{ marginTop: 10 }} />
        <View style={styles.offerFooter}>
          <SkeletonBone width={72} height={18} radius={999} />
          <SkeletonBone width={22} height={22} radius={11} />
        </View>
      </View>
    </View>
  );
}

export function OfferCardSkeletonList({ count = 2 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, i) => (
        <OfferCardSkeleton key={i} />
      ))}
    </View>
  );
}

function IconLineSkeleton() {
  return (
    <View style={styles.iconLine}>
      <SkeletonBone width={22} height={22} radius={6} />
      <SkeletonBone width="72%" height={13} radius={6} />
    </View>
  );
}

/** Provider detail skeleton — hero + meta + spaces / amenities rows. */
export function ProviderProfileSkeleton({
  heroHeight,
  bottomPad = 24,
}: {
  heroHeight: number;
  bottomPad?: number;
}) {
  return (
    <View style={[styles.providerRoot, { paddingBottom: bottomPad }]}>
      <SkeletonBone height={heroHeight} radius={0} style={styles.providerHero} />

      <View style={styles.providerSheet}>
        <View style={styles.providerMetaRow}>
          <SkeletonBone width={64} height={16} radius={8} />
          <SkeletonBone width={88} height={16} radius={8} />
        </View>

        <SkeletonBone width="72%" height={22} radius={8} style={{ marginTop: 14 }} />
        <SkeletonBone width="48%" height={13} radius={6} style={{ marginTop: 10 }} />

        <View style={styles.providerAbout}>
          <SkeletonBone width="100%" height={12} radius={6} />
          <SkeletonBone width="96%" height={12} radius={6} />
          <SkeletonBone width="88%" height={12} radius={6} />
        </View>

        <Text style={styles.sectionLabel}>المساحات المتوفرة</Text>
        {Array.from({ length: 5 }, (_, i) => (
          <IconLineSkeleton key={`space-${i}`} />
        ))}

        <Text style={styles.sectionLabel}>وسائل الراحة</Text>
        {Array.from({ length: 5 }, (_, i) => (
          <IconLineSkeleton key={`amenity-${i}`} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 0,
  },
  offerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6ECF3',
    marginBottom: 12,
  },
  offerImage: {
    backgroundColor: BONE_SOFT,
  },
  offerBody: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
  },
  offerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  offerFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerRoot: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  providerHero: {
    backgroundColor: BONE_SOFT,
  },
  providerSheet: {
    marginTop: -22,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 28,
    minHeight: 420,
  },
  providerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerAbout: {
    marginTop: 18,
    gap: 10,
  },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  iconLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEF2F6',
  },
});
