import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../di/AppProvider';
import { Provider, ServiceItem } from '../../domain/model/Provider';
import { cheapestService } from '../../data/mappers/homeMappers';
import {
  isFavorite,
  toggleFavorite,
} from '../../data/local/favoritesStorage';
import { RootStackParamList } from '../navigation/types';
import { BackButton } from '../../core/ui/components/BackButton';
import { DEPOSIT_PERCENTAGE } from '../../core/common/bookingConstants';
import { resolveBookingFlow } from '../booking/bookingFlow';
import { visualForCategory } from '../home/categoryIcons';
import { DETAIL, buildDetailModel, PricePackage } from './detail/detailModel';

type Route = RouteProp<RootStackParamList, 'ProviderProfile'>;

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = SCREEN_W * 0.92;

function collectImages(provider: Provider): string[] {
  const fromProvider = provider.images?.filter(Boolean) ?? [];
  const fromServices =
    provider.services?.flatMap((s) => s.images ?? (s.imageUrl ? [s.imageUrl] : [])) ?? [];
  const logo = provider.logoUrl ? [provider.logoUrl] : [];
  const all = [...fromProvider, ...fromServices, ...logo];
  return all.length ? Array.from(new Set(all)) : [];
}

export function ProviderProfileScreen() {
  const { providerId } = useRoute<Route>().params;
  const { container, formatPrice, user } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const sheetY = useRef(0);
  const packagesY = useRef(0);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [fav, setFav] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [packagesRevealed, setPackagesRevealed] = useState(false);

  useEffect(() => {
    setLoading(true);
    setSelectedPackageId(null);
    setPackagesRevealed(false);
    container.providerApi
      .getProfile(providerId)
      .then((res) => {
        const p = res.data.data;
        setProvider(p);
        const firstId = p.services?.[0]?.id ?? null;
        setSelectedPackageId(firstId);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [container, providerId]);

  useEffect(() => {
    isFavorite(providerId)
      .then(setFav)
      .catch(() => setFav(false));
  }, [providerId]);

  const onToggleFavorite = useCallback(async () => {
    if (!provider) return;
    const service = cheapestService(provider);
    const next = await toggleFavorite({
      id: provider.id,
      businessName: provider.businessName,
      images: collectImages(provider),
      image: provider.images?.[0] ?? provider.logoUrl,
      cityName: provider.cityName ?? provider.city?.name,
      regionName: provider.regionName ?? provider.region?.name,
      addressDetails: provider.addressDetails,
      categoryName: provider.categoryName ?? provider.category?.name,
      rating: provider.rating,
      price: service?.priceFrom ?? service?.basePrice,
      verified: provider.verified !== false,
    });
    setFav(next);
  }, [provider]);

  const images = useMemo(() => (provider ? collectImages(provider) : []), [provider]);
  const selectedService = useMemo(() => {
    if (!provider?.services?.length) return null;
    return (
      provider.services.find((s) => s.id === selectedPackageId) ??
      provider.services[0] ??
      null
    );
  }, [provider, selectedPackageId]);
  const detail = useMemo(
    () => (provider ? buildDetailModel(provider, selectedService) : null),
    [provider, selectedService],
  );
  const selectedPackage = useMemo(() => {
    if (!detail?.packages.length) return null;
    return (
      detail.packages.find((p) => p.id === selectedPackageId) ?? detail.packages[0] ?? null
    );
  }, [detail, selectedPackageId]);

  const onHeroScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setImageIndex(Math.round(x / SCREEN_W));
  };

  const share = async () => {
    if (!provider) return;
    try {
      await Share.share({
        message: `${provider.businessName} — عبر تطبيق حجزي`,
      });
    } catch {
      /* cancelled */
    }
  };

  const openMaps = () => {
    const q = encodeURIComponent(
      [provider?.cityName ?? provider?.city?.name, provider?.regionName ?? provider?.region?.name]
        .filter(Boolean)
        .join('، ') || provider?.businessName || 'صنعاء',
    );
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  const scrollToPackages = () => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, packagesY.current - 20),
      animated: true,
    });
  };

  const startBooking = (service: ServiceItem, pkg?: PricePackage) => {
    if (!provider) return;
    if (!user) {
      navigation.navigate('Auth');
      return;
    }
    const categoryName = provider.categoryName ?? provider.category?.name ?? 'خدمة';
    const bookingType =
      service.bookingType ??
      provider.bookingType ??
      provider.category?.bookingType ??
      resolveBookingFlow(categoryName).bookingType;
    navigation.navigate('BookingDate', {
      providerId: provider.id,
      serviceId: service.id,
      providerName: provider.businessName,
      serviceName: pkg?.title ?? service.name,
      categoryName,
      bookingType,
      price: pkg?.price ?? service.priceFrom ?? service.basePrice ?? 0,
      depositPercentage: DEPOSIT_PERCENTAGE,
      capacityLabel: pkg?.capacityLabel,
      timeLabel: pkg?.timeLabel,
      image:
        service.images?.[0] ??
        service.imageUrl ??
        provider.images?.[0] ??
        provider.logoUrl,
    });
  };

  const onStickyCta = () => {
    if (!provider || !detail) return;

    if (detail.showPackages && detail.packages.length > 0) {
      if (!packagesRevealed) {
        scrollToPackages();
        setPackagesRevealed(true);
        return;
      }
      const pkg = selectedPackage;
      const service =
        (pkg && provider.services?.find((s) => s.id === pkg.id)) || selectedService;
      if (service) startBooking(service, pkg ?? undefined);
      return;
    }

    const service = selectedService ?? cheapestService(provider);
    if (service) startBooking(service);
  };

  if (loading || !provider || !detail) {
    return (
      <View style={[styles.boot, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={DETAIL.teal} />
      </View>
    );
  }

  const location = [provider.cityName ?? provider.city?.name, provider.regionName ?? provider.region?.name]
    .filter(Boolean)
    .join('، ');
  const rating = provider.rating ?? 4.0;
  const catVisual = visualForCategory(detail.categoryLabel);
  const aboutPreview =
    detail.aboutText.length > 120 && !aboutExpanded
      ? `${detail.aboutText.slice(0, 120)}...`
      : detail.aboutText;

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {/* Hero gallery */}
        <View style={[styles.heroWrap, { height: HERO_H }]}>
          {images.length ? (
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(uri, i) => `${uri}-${i}`}
              onScroll={onHeroScroll}
              scrollEventThrottle={16}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={{ width: SCREEN_W, height: HERO_H }} />
              )}
            />
          ) : (
            <View style={[styles.heroFallback, { height: HERO_H }]}>
              <Ionicons name="image-outline" size={48} color="#fff" />
            </View>
          )}

          {images.length > 0 ? (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {imageIndex + 1} / {images.length}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Sheet */}
        <View
          style={styles.sheet}
          onLayout={(e) => {
            sheetY.current = e.nativeEvent.layout.y;
          }}
        >
          <View style={styles.metaRow}>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color={DETAIL.star} />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
            <View style={styles.catRow}>
              <Ionicons name={catVisual.icon} size={16} color={DETAIL.teal} />
              <Text style={styles.catText}>{detail.categoryLabel}</Text>
            </View>
          </View>

          <Text style={styles.title}>{provider.businessName}</Text>
          {location ? (
            <View style={styles.locRow}>
              <Ionicons name="location-sharp" size={14} color={DETAIL.muted} />
              <Text style={styles.locText}>{location}</Text>
            </View>
          ) : null}

          {detail.show360 ? (
            <Pressable style={styles.primaryBtn} onPress={openMaps}>
              <Ionicons name="sync-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>جولة 360°</Text>
            </Pressable>
          ) : null}

          {detail.showFeatureChips ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {detail.featureChips.map((chip) => (
                <View key={chip.key} style={styles.chip}>
                  <Ionicons name={chip.icon} size={22} color={DETAIL.muted} />
                  <Text style={styles.chipLabel}>{chip.label}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.divider} />

          {/* About */}
          <Text style={styles.sectionTitle}>{detail.aboutTitle}</Text>
          <Text style={styles.body}>{aboutPreview}</Text>
          {detail.aboutText.length > 120 ? (
            <Pressable onPress={() => setAboutExpanded((v) => !v)}>
              <Text style={styles.link}>
                {aboutExpanded ? 'عرض أقل' : 'عرض المزيد'}
              </Text>
            </Pressable>
          ) : null}

          {detail.showSpaces ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>المساحات المتوفرة</Text>
              {detail.spaces.map((row) => (
                <View key={row.key} style={styles.iconLine}>
                  <Text style={styles.iconLineText}>{row.label}</Text>
                  <Ionicons name={row.icon} size={18} color={DETAIL.muted} />
                </View>
              ))}
            </>
          ) : null}

          {detail.showAmenities ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>وسائل الراحة</Text>
              {detail.amenities.slice(0, 4).map((row) => (
                <View key={row.key} style={styles.iconLine}>
                  <Text style={styles.iconLineText}>{row.label}</Text>
                  <Ionicons name={row.icon} size={18} color={DETAIL.muted} />
                </View>
              ))}
              <Pressable style={styles.outlinePill}>
                <Ionicons name="chevron-back" size={16} color={DETAIL.muted} />
                <Text style={styles.outlinePillText}>
                  عرض جميع وسائل الراحة الـ {detail.amenities.length}
                </Text>
              </Pressable>
            </>
          ) : null}

          {detail.showAddress ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>العنوان</Text>
              <View style={styles.locRow}>
                <Ionicons name="location-sharp" size={14} color={DETAIL.muted} />
                <Text style={styles.locText}>{location || 'صنعاء'}</Text>
              </View>
              <Pressable style={styles.mapCard} onPress={openMaps}>
                <View style={styles.mapInner}>
                  <Ionicons name="map-outline" size={36} color={DETAIL.teal} />
                  <Text style={styles.mapHint}>اضغط لفتح الخريطة</Text>
                  <View style={styles.mapPin}>
                    <Ionicons name="location" size={28} color="#E11D48" />
                  </View>
                </View>
              </Pressable>
            </>
          ) : null}

          {detail.showDeposit && detail.depositAmount != null ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>العربون</Text>
              <Text style={styles.priceTeal}>
                {formatPrice(detail.depositAmount)}
              </Text>
              <Text style={styles.body}>{detail.depositNote}</Text>
            </>
          ) : null}

          {detail.showInsurance && detail.insuranceAmount != null ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>التأمين على الممتلكات</Text>
              <Text style={styles.priceTeal}>
                {formatPrice(detail.insuranceAmount)}
              </Text>
              {detail.insuranceMeta ? (
                <Text style={styles.bodyStrong}>{detail.insuranceMeta}</Text>
              ) : null}
              <Text style={styles.body}>{detail.insuranceNote}</Text>
            </>
          ) : null}

          {detail.showTerms ? (
            <>
              <View style={styles.divider} />
              {detail.terms.map((t, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bulletText}>{t}</Text>
                  <View style={styles.bullet} />
                </View>
              ))}
            </>
          ) : null}

          {detail.showPackages ? (
            <View
              onLayout={(e) => {
                packagesY.current = sheetY.current + e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.thickDivider} />
              <Text style={styles.sectionTitle}>باقات الأسعار</Text>
              <Text style={styles.subHint}>تختلف الأيام المتفرغة باختلاف الباقة.</Text>
              <FlatList
                data={detail.packages}
                horizontal
                inverted
                showsHorizontalScrollIndicator={false}
                keyExtractor={(p) => p.id}
                contentContainerStyle={styles.packagesRow}
                renderItem={({ item }) => (
                  <PackageCard
                    pkg={item}
                    priceLabel={formatPrice(item.price)}
                    selected={item.id === (selectedPackage?.id ?? selectedPackageId)}
                    onPress={() => {
                      setSelectedPackageId(item.id);
                      setPackagesRevealed(true);
                    }}
                  />
                )}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky top actions — outside scroll */}
      <View
        style={[styles.stickyTop, { top: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        {/* RTL: first child = physical right → back on the right */}
        <BackButton
          elevated
          color={DETAIL.text}
          onPress={() => navigation.goBack()}
        />
        <View style={styles.heroActions}>
          <Pressable style={styles.roundBtn} onPress={onToggleFavorite}>
            <Ionicons
              name={fav ? 'heart' : 'heart-outline'}
              size={20}
              color={fav ? '#E11D48' : DETAIL.text}
            />
          </Pressable>
          <Pressable style={styles.roundBtn} onPress={share}>
            <Ionicons name="share-social-outline" size={20} color={DETAIL.text} />
          </Pressable>
        </View>
      </View>

      {/* Sticky CTA */}
      <View style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable style={styles.stickyBtn} onPress={onStickyCta}>
          <Ionicons name="book-outline" size={18} color="#fff" />
          <Text style={styles.stickyBtnText}>{detail.ctaLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PackageCard({
  pkg,
  priceLabel,
  selected,
  onPress,
}: {
  pkg: PricePackage;
  priceLabel: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.packageCard, selected && styles.packageCardSelected]}
      onPress={onPress}
    >
      {selected ? (
        <View style={styles.packageCheck}>
          <Ionicons name="checkmark" size={13} color="#fff" />
        </View>
      ) : null}
      <Text style={styles.packagePrice}>{priceLabel}</Text>
      <Text style={styles.packageTitle}>{pkg.title}</Text>
      {pkg.capacityLabel || pkg.timeLabel ? <View style={styles.packageLine} /> : null}
      {pkg.capacityLabel ? (
        <View style={styles.packageMeta}>
          <Ionicons name="people-outline" size={15} color={DETAIL.muted} />
          <Text style={styles.packageMetaText}>{pkg.capacityLabel}</Text>
        </View>
      ) : null}
      {pkg.timeLabel ? (
        <View style={styles.packageMeta}>
          <Ionicons name="time-outline" size={15} color={DETAIL.muted} />
          <Text style={styles.packageMetaText}>{pkg.timeLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DETAIL.pageBg },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  heroWrap: { width: SCREEN_W, backgroundColor: '#222' },
  heroFallback: {
    width: SCREEN_W,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334',
  },
  stickyTop: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroActions: { flexDirection: 'row', gap: 8 },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  counter: {
    position: 'absolute',
    bottom: 28,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  counterText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  sheet: {
    marginTop: -22,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14, fontWeight: '700', color: DETAIL.text },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catText: { fontSize: 13, fontWeight: '700', color: DETAIL.teal },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: DETAIL.text,
    marginBottom: 8,
    width: '100%',
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },
  locText: { fontSize: 13, color: DETAIL.muted, flex: 1 },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: DETAIL.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  chipsRow: { gap: 10, paddingBottom: 14 },
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
  chipLabel: { fontSize: 12, fontWeight: '700', color: DETAIL.text, textAlign: 'center' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DETAIL.line,
    marginVertical: 16,
  },
  thickDivider: {
    height: 1,
    backgroundColor: DETAIL.border,
    marginVertical: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: DETAIL.text,
    marginBottom: 10,
    width: '100%',
  },
  body: {
    fontSize: 13,
    lineHeight: 22,
    color: DETAIL.muted,
    width: '100%',
  },
  bodyStrong: {
    fontSize: 14,
    fontWeight: '700',
    color: DETAIL.text,
    marginBottom: 6,
    width: '100%',
  },
  link: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: DETAIL.teal,
  },
  iconLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingVertical: 8,
  },
  iconLineText: { fontSize: 14, color: DETAIL.text, flex: 1 },
  outlinePill: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: DETAIL.border,
    borderRadius: 999,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  outlinePillText: { fontSize: 13, fontWeight: '600', color: DETAIL.muted },
  mapCard: {
    marginTop: 10,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E8EEF8',
    borderWidth: 1,
    borderColor: DETAIL.border,
  },
  mapInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mapHint: { fontSize: 12, color: DETAIL.muted, fontWeight: '600' },
  mapPin: { position: 'absolute', top: '42%' },
  priceTeal: {
    fontSize: 18,
    fontWeight: '800',
    color: DETAIL.teal,
    marginBottom: 8,
    width: '100%',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#B0B0B0',
    marginTop: 7,
  },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 20, color: DETAIL.muted },
  subHint: { fontSize: 12, color: DETAIL.muted, marginBottom: 12, width: '100%' },
  packagesRow: { gap: 12, paddingVertical: 4, paddingEnd: 2 },
  packageCard: {
    width: SCREEN_W * 0.7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DETAIL.border,
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    minHeight: 132,
  },
  packageCardSelected: {
    borderWidth: 2,
    borderColor: DETAIL.teal,
  },
  packageCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: DETAIL.teal,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: '800',
    color: DETAIL.teal,
    width: '100%',
    textAlign: 'right',
    paddingEnd: 28,
  },
  packageTitle: {
    fontSize: 13,
    color: DETAIL.muted,
    marginTop: 6,
    marginBottom: 12,
    width: '100%',
    textAlign: 'right',
  },
  packageLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DETAIL.line,
    marginBottom: 12,
  },
  packageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  packageMetaText: { fontSize: 13, color: DETAIL.muted, fontWeight: '600' },
  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DETAIL.line,
  },
  stickyBtn: {
    height: 54,
    borderRadius: 999,
    backgroundColor: DETAIL.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stickyBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
