import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../core/ui/theme';
import { Banner } from '../../../domain/model/Banner';

export function HeroPromoBanner({
  banner,
  onExplore,
}: {
  banner?: Banner | null;
  onExplore?: () => void;
}) {
  const imageUri =
    banner?.imageUrl && /^https?:\/\//i.test(banner.imageUrl)
      ? banner.imageUrl
      : 'https://images.unsplash.com/photo-1519167758481-83f550bb49b8?w=900&q=80';

  const title = banner?.title?.trim() || 'شاليهات ومنتجعات خاصة';

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onExplore}>
        <ImageBackground
          source={{ uri: imageUri }}
          style={styles.image}
          imageStyle={styles.imageRadius}
        >
          <LinearGradient
            colors={['rgba(13,27,62,0.78)', 'rgba(10,22,40,0.97)']}
            style={styles.gradient}
          >
            <View style={styles.topLine}>
              <View style={styles.offerBadge}>
                <Ionicons name="sparkles" size={12} color={theme.colors.primary} />
                <Text style={styles.offerText}>عروض مختارة لك</Text>
              </View>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>خصم حتى 20%</Text>
              </View>
            </View>

            <View style={styles.copy}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>مساحات فاخرة تصنع لحظات لا تُنسى</Text>
            </View>

            <View style={styles.bottomLine}>
              <View style={styles.button}>
                <Text style={styles.buttonText}>استكشف</Text>
              </View>
              <Text style={styles.ctaHint}>اكتشف أفضل العروض</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </Pressable>
      <View style={styles.pagination}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 6,
  },
  image: {
    height: 148,
    borderRadius: 14,
    overflow: 'hidden',
  },
  imageRadius: {
    borderRadius: 14,
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  offerText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '700',
    textAlign: 'right',
  },
  discountBadge: {
    backgroundColor: '#EAF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 11,
    color: theme.colors.text,
    fontWeight: '700',
    textAlign: 'right',
  },
  // flex-start = RIGHT under forceRTL
  copy: {
    alignItems: 'flex-start',
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'right',
  },
  ctaHint: {
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: '700',
    textAlign: 'right',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#B8C4D8',
  },
  dotActive: {
    width: 14,
    backgroundColor: theme.colors.primary,
  },
});
