import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText as Text } from '@/core/ui/components/AppText';
import { BackButton } from '@/core/ui/components/BackButton';
import { ImageGalleryModal } from '@/core/ui/components/ImageGalleryModal';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEPOSIT_PERCENTAGE } from '../../core/common/bookingConstants';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { Provider, ServiceItem } from '../../domain/model/Provider';
import {
  categoryAncestorNames,
} from '../../data/mappers/homeMappers';
import { resolveBookingFlow } from '../booking/bookingFlow';
import {
  isApparelCategory,
  resolveFacilityKind,
} from '../provider/categoryKinds';
import type { FacilityReview } from '../../data/remote/reviewApi';
import { DETAIL } from '../provider/detail/detailModel';
import { FacilityDetailSections } from '../provider/detail/FacilityDetailSections';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'CatalogProduct'>;

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = Math.round(SCREEN_W * 0.92);

function asList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === 'string' && !!x.trim())
    .map((x) => x.trim());
}

function IconLine({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.iconLine}>
      <Ionicons name={icon} size={20} color={DETAIL.muted} />
      <Text style={styles.iconLineText}>{label}</Text>
    </View>
  );
}

function amenityIcon(label: string): keyof typeof Ionicons.glyphMap {
  if (/تكييف|air|ac/i.test(label)) return 'snow-outline';
  if (/gps|ملاحة|nav/i.test(label)) return 'navigate-outline';
  if (/تأمين|insur/i.test(label)) return 'shield-checkmark-outline';
  if (/واي|wifi|إنترنت/i.test(label)) return 'wifi-outline';
  if (/بلوتوث|bluetooth/i.test(label)) return 'bluetooth-outline';
  return 'checkmark-circle-outline';
}

export function CatalogProductScreen() {
  const { providerId, serviceId } = useRoute<Route>().params;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { container, formatPrice, user } = useApp();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [service, setService] = useState<ServiceItem | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [amenitiesExpanded, setAmenitiesExpanded] = useState(false);
  const [categoryHints, setCategoryHints] = useState<string[]>([]);
  const [reviews, setReviews] = useState<FacilityReview[]>([]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [profileRes, treeRes, reviewSummary] = await Promise.all([
        container.providerApi.getProfile(providerId),
        container.categoryApi
          .tree()
          .catch(() => ({ data: { data: [] as never[] } })),
        container.reviewApi.summary(providerId).catch(() => ({
          providerId,
          count: 0,
          average: 0,
          reviews: [] as FacilityReview[],
        })),
      ]);
      const p = profileRes.data.data;
      p.rating =
        reviewSummary.count > 0 ? reviewSummary.average : undefined;
      p.reviewCount = reviewSummary.count;
      setReviews(reviewSummary.reviews ?? []);
      const treeData = treeRes.data.data ?? [];
      const ancestors = categoryAncestorNames(
        treeData,
        p.categoryId ?? p.category?.id ?? null,
      );
      setCategoryHints(ancestors);
      setProvider(p);
      const found =
        (p.services ?? []).find((s) => s.id === serviceId) ?? null;
      if (!found) {
        // Fallback: public service endpoint if not embedded on profile.
        const remote = await container.serviceApi.getService(serviceId);
        setService({
          id: remote.id,
          name: remote.name,
          basePrice: remote.basePrice,
          priceFrom: remote.basePrice,
          depositPercentage: remote.depositPercentage,
          images: remote.images,
          imageUrl: remote.images?.[0],
          attributes: remote.attributes,
          bookingType: remote.bookingType,
          status: 'ACTIVE',
        });
      } else {
        setService(found);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل المنتج');
    } finally {
      setLoading(false);
    }
  }, [container, providerId, serviceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const images = useMemo(() => {
    const fromService =
      service?.images?.filter(Boolean) ??
      (service?.imageUrl ? [service.imageUrl] : []);
    if (fromService.length) return fromService as string[];
    return (provider?.images ?? []).filter(Boolean) as string[];
  }, [service, provider]);

  const attrs = (service?.attributes ?? {}) as Record<string, unknown>;
  const categoryName =
    provider?.categoryName ?? provider?.category?.name ?? 'منتج';
  const facilityKind = resolveFacilityKind(
    categoryName,
    provider?.category?.name,
    ...categoryHints,
  );
  const isApparel =
    facilityKind === 'apparel' || isApparelCategory(categoryName);
  const isTransport = facilityKind === 'transport';

  const specs = useMemo(() => {
    const out: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [];
    if (isApparel) {
      const size = typeof attrs.size === 'string' ? attrs.size.trim() : '';
      const color = typeof attrs.color === 'string' ? attrs.color.trim() : '';
      if (size) out.push({ icon: 'resize-outline', label: `مقاس ${size}` });
      if (color) out.push({ icon: 'color-palette-outline', label: color });
      out.push({ icon: 'calendar-outline', label: 'تأجير يومي' });
    } else {
      const brand =
        typeof attrs.brand === 'string' ? attrs.brand.trim() : '';
      if (brand && !isTransport) {
        out.push({ icon: 'pricetag-outline', label: brand });
      }
      const seats = Number(attrs.seats);
      const year = Number(attrs.year);
      if (Number.isFinite(seats) && seats > 0) {
        out.push({
          icon: isTransport ? 'bus-outline' : 'car-outline',
          label: `${seats} مقاعد`,
        });
      }
      if (Number.isFinite(year) && year > 0) {
        out.push({ icon: 'calendar-outline', label: `موديل ${year}` });
      }
      if (attrs.transmission === 'AUTO' || attrs.transmission === 'MANUAL') {
        out.push({
          icon: 'settings-outline',
          label: attrs.transmission === 'AUTO' ? 'أوتوماتيك' : 'عادي',
        });
      }
    }
    return out;
  }, [attrs, isApparel, isTransport]);

  const amenities = useMemo(() => {
    const fromProduct = asList(attrs.amenities);
    if (fromProduct.length) return fromProduct;
    return asList(provider?.attributes?.amenities);
  }, [attrs.amenities, provider?.attributes]);

  const price = service?.priceFrom ?? service?.basePrice ?? 0;
  const deposit = Math.round((price * DEPOSIT_PERCENTAGE) / 100);

  const onBook = () => {
    if (!provider || !service) return;
    if (!user) {
      navigation.navigate('Auth');
      return;
    }
    const flow = resolveBookingFlow(categoryName);
    navigation.navigate('BookingDate', {
      providerId: provider.id,
      serviceId: service.id,
      providerName: provider.businessName,
      serviceName: service.name,
      categoryName,
      bookingType: service.bookingType ?? flow.bookingType,
      price,
      depositPercentage: DEPOSIT_PERCENTAGE,
      image: images[0],
      timeLabel: 'السعر لليوم — حسب تاريخ الاستلام والإرجاع',
    });
  };

  const onShare = async () => {
    if (!service) return;
    try {
      await Share.share({
        message: `${service.name} — ${formatPrice(price)} / يوم`,
      });
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !provider || !service) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'المنتج غير موجود'}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backLinkText}>رجوع</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
      >
        <View style={styles.hero}>
          {images.length ? (
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(uri, i) => `${uri}-${i}`}
              onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                const next = Math.round(
                  e.nativeEvent.contentOffset.x / SCREEN_W,
                );
                if (next !== imageIndex) setImageIndex(next);
              }}
              scrollEventThrottle={16}
              renderItem={({ item, index }) => (
                <Pressable
                  onPress={() => {
                    setImageIndex(index);
                    setGalleryOpen(true);
                  }}
                >
                  <Image
                    source={{ uri: item }}
                    style={styles.heroImage}
                    resizeMode="cover"
                  />
                </Pressable>
              )}
            />
          ) : (
            <View style={styles.heroFallback}>
              <Ionicons name="image-outline" size={48} color="#fff" />
            </View>
          )}
          <View style={[styles.heroTop, { top: insets.top + 8 }]} pointerEvents="box-none">
            <BackButton elevated color={DETAIL.navy} onPress={() => navigation.goBack()} />
            <View style={styles.heroActions}>
              <Pressable style={styles.iconBtn} onPress={onShare}>
                <Ionicons name="share-outline" size={20} color={DETAIL.navy} />
              </Pressable>
            </View>
          </View>
          {images.length > 0 ? (
            <Pressable
              style={styles.counter}
              onPress={() => setGalleryOpen(true)}
            >
              <Text style={styles.counterText}>
                {imageIndex + 1} / {images.length}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.sheet}>
          <View style={styles.catRow}>
            <Ionicons
              name={
                isApparel
                  ? 'shirt-outline'
                  : isTransport
                    ? 'bus-outline'
                    : 'car-outline'
              }
              size={16}
              color={DETAIL.navy}
            />
            <Text style={styles.catLabel}>{categoryName}</Text>
          </View>

          {/* RTL: first = right (name), second = left (price) */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {service.name}
            </Text>
            <Text style={styles.priceLine}>
              {formatPrice(price)}
              <Text style={styles.priceUnit}> / يوم</Text>
            </Text>
          </View>

          {specs.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {specs.map((s) => (
                <View key={s.label} style={styles.chip}>
                  <Ionicons name={s.icon} size={22} color={DETAIL.muted} />
                  <Text style={styles.chipLabel}>{s.label}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}

          {service.description?.trim() ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>عن المنتج</Text>
              <Text style={styles.body}>{service.description.trim()}</Text>
            </View>
          ) : null}

          {amenities.length ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>وسائل الراحة</Text>
              {(amenitiesExpanded ? amenities : amenities.slice(0, 4)).map(
                (a) => (
                  <IconLine key={a} icon={amenityIcon(a)} label={a} />
                ),
              )}
              {amenities.length > 4 ? (
                <Pressable
                  style={styles.outlinePill}
                  onPress={() => setAmenitiesExpanded((v) => !v)}
                >
                  <Text style={styles.outlinePillText}>
                    {amenitiesExpanded
                      ? 'عرض أقل'
                      : `عرض جميع وسائل الراحة الـ ${amenities.length}`}
                  </Text>
                  <Ionicons
                    name={amenitiesExpanded ? 'chevron-down' : 'chevron-back'}
                    size={16}
                    color={DETAIL.muted}
                  />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View style={styles.block}>
            <Text style={styles.blockTitle}>العربون</Text>
            <Text style={styles.body}>
              {DEPOSIT_PERCENTAGE}% عند الحجز ({formatPrice(deposit)}) — يُخصم من
              الإجمالي.
            </Text>
          </View>

          <View style={styles.facilityDivider} />
          <Text style={styles.facilitySectionLabel}>تفاصيل المنشأة</Text>
          <FacilityDetailSections
            provider={provider}
            categoryHints={categoryHints}
            reviews={reviews}
            formatPrice={formatPrice}
            hideProductExtras
          />
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <Pressable onPress={onBook}>
          <LinearGradient
            colors={[theme.colors.primaryLight, theme.colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cta}
          >
            <Ionicons name="calendar-outline" size={20} color="#fff" />
            <Text style={styles.ctaText}>اختيار أيام التأجير</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <ImageGalleryModal
        visible={galleryOpen}
        uris={images}
        initialIndex={imageIndex}
        onClose={() => setGalleryOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DETAIL.pageBg ?? '#F0F4F8' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  backLink: { padding: 8 },
  backLinkText: { color: theme.colors.primary, fontWeight: '700' },
  hero: {
    width: SCREEN_W,
    height: HERO_H,
    backgroundColor: '#222',
  },
  heroImage: { width: SCREEN_W, height: HERO_H },
  heroFallback: {
    width: SCREEN_W,
    height: HERO_H,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DETAIL.navyLight,
  },
  heroTop: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    bottom: 36,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    zIndex: 10,
  },
  counterText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  sheet: {
    marginTop: -24,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 14,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
  },
  catLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: DETAIL.navy,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  priceLine: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'left',
    flexShrink: 0,
  },
  priceUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipsRow: {
    gap: 10,
    paddingBottom: 4,
    paddingTop: 4,
  },
  chip: {
    width: 100,
    minHeight: 84,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DETAIL.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: DETAIL.chipBg,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DETAIL.text,
    textAlign: 'center',
  },
  block: { gap: 4 },
  blockTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'right',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  iconLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  iconLineText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: DETAIL.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  outlinePill: {
    marginTop: 8,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: DETAIL.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  outlinePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: DETAIL.muted,
  },
  facilityDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DETAIL.line,
    marginTop: 10,
    marginBottom: 16,
  },
  facilitySectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8EEF2',
  },
  cta: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
