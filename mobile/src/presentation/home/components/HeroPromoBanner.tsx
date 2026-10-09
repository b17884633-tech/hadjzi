import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../core/ui/theme';
import { Banner } from '../../../domain/model/Banner';

const SCREEN_W = Dimensions.get('window').width;
/** Matches home / category ScrollView horizontal padding. */
const H_PAD = 14;
const SLIDE_W = SCREEN_W - H_PAD * 2;
const AUTO_MS = 4200;

export type PromoSlide = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  cta: string;
  imageUrl: string;
  actionType?: Banner['actionType'];
  actionTarget?: string;
};

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1519167758481-83f550bb49b8?w=900&q=80',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&q=80',
  'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=900&q=80',
];

function isHttp(url?: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

/** Curated fallbacks when the API has no matching banners for a category. */
export function defaultPromosForCategory(categoryName?: string | null): PromoSlide[] {
  const name = (categoryName ?? '').trim();
  const key = name || 'home';

  const pack = (
    items: Array<Omit<PromoSlide, 'id' | 'imageUrl'> & { imageUrl?: string }>,
  ): PromoSlide[] =>
    items.map((item, i) => ({
      id: `default-${key}-${i}`,
      imageUrl: item.imageUrl ?? FALLBACK_IMAGES[i % FALLBACK_IMAGES.length],
      title: item.title,
      subtitle: item.subtitle,
      badge: item.badge,
      cta: item.cta,
    }));

  if (/فنادق|فندق|hotel/i.test(name)) {
    return pack([
      {
        title: 'فنادق مميزة لإقامة مريحة',
        subtitle: 'غرف فاخرة بأسعار تنافسية في مدينتك',
        badge: 'عروض الفنادق',
        cta: 'استعرض الغرف',
      },
      {
        title: 'احجز لياليك بسهولة',
        subtitle: 'تأكيد فوري ودفع عربون آمن عبر حجزي',
        badge: 'حجز سريع',
        cta: 'ابدأ الحجز',
        imageUrl: FALLBACK_IMAGES[1],
      },
    ]);
  }
  if (/شالي|منتجع|chalet/i.test(name)) {
    return pack([
      {
        title: 'شاليهات ومنتجعات خاصة',
        subtitle: 'مساحات فاخرة تصنع لحظات لا تُنسى',
        badge: 'عروض مختارة',
        cta: 'استكشف',
      },
      {
        title: 'عطلة عائلية مثالية',
        subtitle: 'مسابح ومجالس وجلسات خارجية جاهزة لك',
        badge: 'للعائلات',
        cta: 'اكتشف المزيد',
        imageUrl: FALLBACK_IMAGES[3],
      },
    ]);
  }
  if (/صالة|قاعة|أفراح/i.test(name)) {
    return pack([
      {
        title: 'صالات أفراح مجهزة بالكامل',
        subtitle: 'مساحات واسعة لإحياء مناسباتك بأناقة',
        badge: 'مناسبات',
        cta: 'استعرض الصالات',
      },
    ]);
  }
  if (/ملاعب|ملعب|رياض|بادل|كرة/i.test(name)) {
    return pack([
      {
        title: 'احجز ملعبك الآن',
        subtitle: 'أوقات متاحة طوال اليوم بأسعار واضحة',
        badge: 'رياضة',
        cta: 'اختر الوقت',
        imageUrl: FALLBACK_IMAGES[4],
      },
    ]);
  }
  if (/مسبح|نادي/i.test(name)) {
    return pack([
      {
        title: 'مسابح ونوادٍ يومية',
        subtitle: 'استرخِ أو تمرّن في أفضل الأماكن القريبة',
        badge: 'ترفيه',
        cta: 'استكشف',
        imageUrl: FALLBACK_IMAGES[3],
      },
    ]);
  }
  if (/صح|عياد|مستشفى|طبي/i.test(name)) {
    return pack([
      {
        title: 'مواعيد طبية بسهولة',
        subtitle: 'احجز كشفك في العيادات والمراكز المعتمدة',
        badge: 'صحة',
        cta: 'احجز موعد',
        imageUrl: FALLBACK_IMAGES[2],
      },
    ]);
  }
  if (/كوافير|حلاق|تجميل/i.test(name)) {
    return pack([
      {
        title: 'جلسات تجميل وكوافير',
        subtitle: 'مواعيد مرنة مع أفضل الصالونات',
        badge: 'جمال',
        cta: 'احجز جلسة',
      },
    ]);
  }
  if (/سيار|نقل/i.test(name)) {
    return pack([
      {
        title: 'سيارات ونقليات موثوقة',
        subtitle: 'احجز مركبتك لرحلتك القادمة بخطوات بسيطة',
        badge: 'تنقل',
        cta: 'استعرض',
        imageUrl: FALLBACK_IMAGES[1],
      },
    ]);
  }
  if (/زفاف|فنان|تصوير/i.test(name)) {
    return pack([
      {
        title: 'فنانون وجلسات تصوير',
        subtitle: 'أكمل مناسبتك بفريق محترف عبر حجزي',
        badge: 'مناسبات',
        cta: 'اكتشف',
      },
    ]);
  }
  if (/مستلزم|عرس|ماء|زينة|كوش/i.test(name)) {
    return pack([
      {
        title: 'مستلزمات الأعراس',
        subtitle: 'كل ما تحتاجه لمناسبتك في مكان واحد',
        badge: 'تجهيزات',
        cta: 'تسوق العروض',
      },
    ]);
  }

  // Home / generic
  return pack([
    {
      title: 'شاليهات ومنتجعات خاصة',
      subtitle: 'مساحات فاخرة تصنع لحظات لا تُنسى',
      badge: 'عروض مختارة لك',
      cta: 'استكشف',
    },
    {
      title: 'فنادق وصالات وملاعب',
      subtitle: 'كل خدمات الحجوزات في تطبيق واحد',
      badge: 'حجزي',
      cta: 'تصفح الكل',
      imageUrl: FALLBACK_IMAGES[1],
    },
    {
      title: 'احجز بثقة',
      subtitle: 'عربون آمن وتأكيد فوري للمنشآت المعتمدة',
      badge: 'موثوق',
      cta: 'ابدأ الآن',
      imageUrl: FALLBACK_IMAGES[2],
    },
  ]);
}

export function bannersToSlides(banners: Banner[]): PromoSlide[] {
  return banners
    .filter((b) => b && (b.title || isHttp(b.imageUrl)))
    .map((b, i) => ({
      id: `api-${b.id}`,
      title: b.title?.trim() || 'عرض خاص',
      subtitle: 'اكتشف أفضل العروض عبر حجزي',
      badge: 'عرض مميز',
      cta: 'استكشف',
      imageUrl: isHttp(b.imageUrl) ? b.imageUrl : FALLBACK_IMAGES[i % FALLBACK_IMAGES.length],
      actionType: b.actionType,
      actionTarget: b.actionTarget,
    }));
}

/** Prefer category-targeted banners; otherwise curated defaults for that category. */
export function resolvePromoSlides(
  banners: Banner[],
  opts?: { categoryId?: number | string | null; categoryName?: string | null },
): PromoSlide[] {
  const { categoryId, categoryName } = opts ?? {};
  const all = bannersToSlides(banners);

  if (categoryId != null || categoryName) {
    const idStr = categoryId != null ? String(categoryId) : '';
    const name = (categoryName ?? '').trim();
    const matched = all.filter((s) => {
      if (s.actionType !== 'CATEGORY') return false;
      const target = (s.actionTarget ?? '').trim();
      if (!target) return false;
      if (idStr && target === idStr) return true;
      if (name && (target === name || name.includes(target) || target.includes(name))) {
        return true;
      }
      return false;
    });
    if (matched.length) return matched;
    return defaultPromosForCategory(categoryName);
  }

  return all.length ? all : defaultPromosForCategory(null);
}

type Props = {
  banners?: Banner[];
  categoryId?: number | string | null;
  categoryName?: string | null;
  onPressSlide?: (slide: PromoSlide) => void;
  onExplore?: () => void;
};

export function HeroPromoBanner({
  banners = [],
  categoryId,
  categoryName,
  onPressSlide,
  onExplore,
}: Props) {
  const slides = useMemo(
    () => resolvePromoSlides(banners, { categoryId, categoryName }),
    [banners, categoryId, categoryName],
  );
  const listRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    setIndex(0);
    indexRef.current = 0;
    listRef.current?.scrollTo({ x: 0, animated: false });
  }, [slides.length, categoryId, categoryName]);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const timer = setInterval(() => {
      const next = (indexRef.current + 1) % slides.length;
      listRef.current?.scrollTo({ x: next * SLIDE_W, animated: true });
      setIndex(next);
    }, AUTO_MS);
    return () => clearInterval(timer);
  }, [slides.length, paused]);

  if (!slides.length) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={listRef}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        bounces={false}
        style={styles.list}
        onScrollBeginDrag={() => setPaused(true)}
        onScrollEndDrag={() => setPaused(false)}
        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / SLIDE_W);
          setIndex(i);
          setPaused(false);
        }}
      >
        {slides.map((item) => (
          <Pressable
            key={item.id}
            style={styles.slide}
            onPress={() => {
              const hasTarget =
                !!item.actionType && !!(item.actionTarget ?? '').trim();
              if (hasTarget && onPressSlide) {
                onPressSlide(item);
                return;
              }
              onPressSlide?.(item);
              onExplore?.();
            }}
          >
            <ImageBackground
              source={{ uri: item.imageUrl }}
              style={styles.image}
              imageStyle={styles.imageRadius}
            >
              <LinearGradient
                colors={['rgba(10,22,40,0.2)', 'rgba(10,22,40,0.92)']}
                locations={[0.1, 1]}
                style={styles.gradient}
              >
                <View style={styles.content}>
                  <View style={styles.badge}>
                    <Ionicons name="sparkles" size={11} color={theme.colors.primary} />
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>

                  <View style={styles.copy}>
                    <Text style={styles.title} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.subtitle} numberOfLines={2}>
                      {item.subtitle}
                    </Text>
                  </View>

                  <View style={styles.ctaBtn}>
                    <Text style={styles.ctaText}>{item.cta}</Text>
                    <Ionicons name="arrow-back" size={14} color="#fff" />
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </Pressable>
        ))}
      </ScrollView>

      {slides.length > 1 ? (
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View
              key={s.id}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    marginBottom: 2,
  },
  list: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  slide: {
    width: SLIDE_W,
  },
  image: {
    width: SLIDE_W,
    height: 168,
  },
  imageRadius: {
    borderRadius: 18,
  },
  gradient: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    justifyContent: 'flex-end',
  },
  content: {
    width: '100%',
    alignItems: 'flex-start',
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  copy: {
    width: '100%',
    gap: 4,
    alignItems: 'flex-start',
  },
  title: {
    width: '100%',
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 26,
  },
  subtitle: {
    width: '100%',
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C5D0DE',
  },
  dotActive: {
    width: 16,
    backgroundColor: theme.colors.primary,
  },
});
