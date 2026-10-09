import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  I18nManager,
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
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText as Text } from '@/core/ui/components/AppText';
import { BackButton } from '../../core/ui/components/BackButton';
import { ImageGalleryModal } from '@/core/ui/components/ImageGalleryModal';
import { MapFallback } from '@/core/ui/components/MapFallback';
import { ProviderProfileSkeleton } from '@/core/ui/components/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { isNativeMapsEnabled } from '../../core/maps/mapsEnabled';
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
import { DEPOSIT_PERCENTAGE } from '../../core/common/bookingConstants';
import {
  convertFromNewYer,
  getCurrency,
} from '../../core/common/currency';
import { formatNumber } from '../../core/common/format';
import { parsePricePeriods } from '../../core/common/pricePeriods';
import {
  guestsPerUnit,
  childrenPerUnit,
  packagePeriodLabel,
  readPackagePeriod,
  resolveBookingFlow,
} from '../booking/bookingFlow';
import { visualForCategory } from '../home/categoryIcons';
import { centerForCityName, coordsForProvider } from '../search/mapGeo';
import type { FacilityReview } from '../../data/remote/reviewApi';
import { DETAIL, buildDetailModel, PricePackage } from './detail/detailModel';
import { PricePeriodsTicket } from './detail/PricePeriodsTicket';
import { RatingsSection } from './detail/RatingsSection';
import { HotelRoomsSheet } from './HotelRoomsSheet';

type Route = RouteProp<RootStackParamList, 'ProviderProfile'>;

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = SCREEN_W * 0.88;
const RTL_MAP_FIX = I18nManager.isRTL ? ([{ scaleX: -1 }] as const) : [];

function collectImages(provider: Provider): string[] {
  const fromProvider = provider.images?.filter(Boolean) ?? [];
  const fromServices =
    provider.services?.flatMap((s) => s.images ?? (s.imageUrl ? [s.imageUrl] : [])) ?? [];
  const logo = provider.logoUrl ? [provider.logoUrl] : [];
  const all = [...fromProvider, ...fromServices, ...logo];
  return all.length ? Array.from(new Set(all)) : [];
}

/** Stars: filled from the right (RTL start). Empty stars sit on the left. */
function StarRow({ rating }: { rating: number }) {
  const filled = Math.round(Math.min(5, Math.max(0, rating)));
  return (
    <View style={styles.starRow}>
      {Array.from({ length: 5 }, (_, i) => (
        <Ionicons
          key={i}
          name="star"
          size={22}
          color={i < filled ? DETAIL.gold : DETAIL.starEmpty}
        />
      ))}
    </View>
  );
}

/** Icon on the far right (RTL start), label beside it. */
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

export function ProviderProfileScreen() {
  const { providerId } = useRoute<Route>().params;
  const { container, formatPrice, user, currency } = useApp();
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
  const [amenitiesExpanded, setAmenitiesExpanded] = useState(false);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [heroGalleryOpen, setHeroGalleryOpen] = useState(false);
  const [reviews, setReviews] = useState<FacilityReview[]>([]);

  useEffect(() => {
    setLoading(true);
    setSelectedPackageId(null);
    setPackagesRevealed(false);
    setAmenitiesExpanded(false);
    setRoomsOpen(false);
    setReviews([]);
    container.providerApi
      .getProfile(providerId)
      .then(async (res) => {
        const p = res.data.data;
        try {
          const summary = await container.reviewApi.summary(providerId);
          p.rating = summary.count > 0 ? summary.average : undefined;
          p.reviewCount = summary.count;
          setReviews(summary.reviews ?? []);
        } catch {
          p.rating = undefined;
          p.reviewCount = 0;
          setReviews([]);
        }
        setProvider(p);
        const firstActive =
          (p.services ?? []).find((s) => !s.status || s.status === 'ACTIVE') ??
          null;
        setSelectedPackageId(firstActive?.id ?? null);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [container, providerId]);

  useEffect(() => {
    if (!user?.id) {
      setFav(false);
      return;
    }
    isFavorite(providerId, user.id)
      .then(setFav)
      .catch(() => setFav(false));
  }, [providerId, user?.id]);

  const onToggleFavorite = useCallback(async () => {
    if (!provider) return;
    if (!user?.id) {
      navigation.navigate('Auth');
      return;
    }
    const service = cheapestService(provider);
    const next = await toggleFavorite(
      {
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
      },
      user.id,
    );
    setFav(next);
  }, [navigation, provider, user?.id]);

  const images = useMemo(() => (provider ? collectImages(provider) : []), [provider]);
  const activeServices = useMemo(
    () =>
      (provider?.services ?? []).filter(
        (s) => !s.status || s.status === 'ACTIVE',
      ),
    [provider?.services],
  );

  const selectedService = useMemo(() => {
    if (!activeServices.length) return null;
    return (
      activeServices.find((s) => s.id === selectedPackageId) ??
      activeServices[0] ??
      null
    );
  }, [activeServices, selectedPackageId]);
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

  const mapCoords = useMemo(() => {
    if (!provider) return centerForCityName('صنعاء');
    const city = provider.cityName ?? provider.city?.name;
    return coordsForProvider(provider, centerForCityName(city));
  }, [provider]);

  const onHeroScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setImageIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
  };

  const share = async () => {
    if (!provider) return;
    try {
      await Share.share({ message: `${provider.businessName} — عبر تطبيق حجزي` });
    } catch {
      /* cancelled */
    }
  };

  const openMaps = () => {
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${mapCoords.latitude},${mapCoords.longitude}`,
    );
  };

  const openTour = () => {
    const url = detail?.tourUrl?.trim();
    if (url) {
      Linking.openURL(url).catch(() => openMaps());
      return;
    }
    openMaps();
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
    const attrs = (service.attributes ?? {}) as Record<string, unknown>;
    const packagePeriod = pkg?.period ?? readPackagePeriod(attrs);
    const fromTime =
      pkg?.fromTime ??
      (typeof attrs.fromTime === 'string' ? String(attrs.fromTime).slice(0, 5) : undefined);
    const toTime =
      pkg?.toTime ??
      (typeof attrs.toTime === 'string' ? String(attrs.toTime).slice(0, 5) : undefined);
    const pricePeriods = parsePricePeriods(attrs.pricePeriods);
    const minPeriodPrice = pricePeriods.length
      ? Math.min(...pricePeriods.map((p) => p.pricePerHour))
      : undefined;
    navigation.navigate('BookingDate', {
      providerId: provider.id,
      serviceId: service.id,
      providerName: provider.businessName,
      serviceName: pkg?.title ?? service.name,
      categoryName,
      bookingType,
      price:
        minPeriodPrice ??
        pkg?.price ??
        service.priceFrom ??
        service.basePrice ??
        0,
      depositPercentage: DEPOSIT_PERCENTAGE,
      capacityLabel: pkg?.capacityLabel,
      timeLabel: pkg?.timeLabel ?? packagePeriodLabel(packagePeriod),
      guestsPerRoom:
        guestsPerUnit(service.attributes) ?? guestsPerUnit(provider.attributes),
      maxChildrenPerRoom:
        childrenPerUnit(service.attributes) ??
        childrenPerUnit(provider.attributes),
      packagePeriod,
      packageFromTime: fromTime,
      packageToTime: toTime,
      pricePeriods: pricePeriods.length ? pricePeriods : undefined,
      image:
        service.images?.[0] ??
        service.imageUrl ??
        provider.images?.[0] ??
        provider.logoUrl,
    });
  };

  const onStickyCta = () => {
    if (!provider || !detail) return;

    // Hotels: open rooms sheet (images + prices) — no packages section
    if (detail.isHotel) {
      setRoomsOpen(true);
      return;
    }

    if (detail.showPricePeriods) {
      if (!packagesRevealed) {
        scrollToPackages();
        setPackagesRevealed(true);
        return;
      }
      const service =
        selectedService ??
        activeServices.find((s) =>
          parsePricePeriods(
            ((s.attributes ?? {}) as Record<string, unknown>).pricePeriods,
          ).length,
        ) ??
        cheapestService(provider);
      if (service) startBooking(service);
      return;
    }

    if (detail.showPackages && detail.packages.length > 0) {
      if (!packagesRevealed) {
        scrollToPackages();
        setPackagesRevealed(true);
        return;
      }
      const pkg = selectedPackage;
      const service =
        (pkg && activeServices.find((s) => s.id === pkg.id)) || selectedService;
      if (service) startBooking(service, pkg ?? undefined);
      return;
    }
    const service = selectedService ?? cheapestService(provider);
    if (service) startBooking(service);
  };

  if (loading || !provider || !detail) {
    return (
      <View style={styles.root}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        >
          <ProviderProfileSkeleton heroHeight={HERO_H} bottomPad={insets.bottom} />
        </ScrollView>
        <View style={[styles.stickyTop, { top: insets.top + 8 }]} pointerEvents="box-none">
          <BackButton elevated color={DETAIL.navy} onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  const addressLine =
    provider.addressDetails?.trim() ||
    [provider.cityName ?? provider.city?.name, provider.regionName ?? provider.region?.name]
      .filter(Boolean)
      .join('، ');
  const rating =
    provider.reviewCount && provider.reviewCount > 0 && provider.rating != null
      ? provider.rating
      : 0;
  const hasReviews = (provider.reviewCount ?? 0) > 0;
  const ratingLabel = hasReviews ? rating.toFixed(1) : 'جديد';
  const catVisual = visualForCategory(detail.categoryLabel);
  const aboutPreview =
    detail.aboutText.length > 140 && !aboutExpanded
      ? `${detail.aboutText.slice(0, 140)}...`
      : detail.aboutText;
  const visibleAmenities = amenitiesExpanded
    ? detail.amenities
    : detail.amenities.slice(0, 4);

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
      >
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
              renderItem={({ item, index }) => (
                <Pressable
                  onPress={() => {
                    setImageIndex(index);
                    setHeroGalleryOpen(true);
                  }}
                >
                  <Image source={{ uri: item }} style={{ width: SCREEN_W, height: HERO_H }} />
                </Pressable>
              )}
            />
          ) : (
            <View style={[styles.heroFallback, { height: HERO_H }]}>
              <Ionicons name="image-outline" size={48} color="#fff" />
            </View>
          )}
          {images.length > 0 ? (
            <Pressable
              style={styles.counter}
              onPress={() => setHeroGalleryOpen(true)}
            >
              <Text style={styles.counterText}>
                {imageIndex + 1} / {images.length}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View
          style={styles.sheet}
          onLayout={(e) => {
            sheetY.current = e.nativeEvent.layout.y;
          }}
        >
          {/* RTL: first = right → category right, rating left */}
          <View style={styles.metaRow}>
            <View style={styles.catRow}>
              <Ionicons name={catVisual.icon} size={16} color={DETAIL.navy} />
              <Text style={styles.catText}>{detail.categoryLabel}</Text>
            </View>
            <View style={styles.ratingRow}>
              {/* RTL: number first (right), star second (left) */}
              <Text style={styles.ratingText}>{ratingLabel}</Text>
              <Ionicons name="star" size={15} color={DETAIL.gold} />
              {hasReviews ? (
                <Text style={styles.ratingCount}>({provider.reviewCount})</Text>
              ) : null}
            </View>
          </View>

          <Text style={styles.title}>{provider.businessName}</Text>

          {addressLine ? (
            <View style={styles.locRow}>
              <Ionicons name="location-sharp" size={14} color={DETAIL.muted} />
              <Text style={styles.locText}>{addressLine}</Text>
            </View>
          ) : null}

          {detail.show360 ? (
            <Pressable style={styles.primaryBtn} onPress={openTour}>
              <Text style={styles.primaryBtnText}>جولة 360°</Text>
              <Ionicons name="sync-outline" size={18} color="#fff" />
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

          <Text style={styles.sectionTitle}>{detail.aboutTitle}</Text>
          <Text style={styles.body}>{aboutPreview}</Text>
          {detail.aboutText.length > 140 ? (
            <Pressable onPress={() => setAboutExpanded((v) => !v)}>
              <Text style={styles.link}>{aboutExpanded ? 'عرض أقل' : 'عرض المزيد'}</Text>
            </Pressable>
          ) : null}

          {detail.showSpaces ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>المساحات المتوفرة</Text>
              {detail.spaces.map((row) => (
                <IconLine key={row.key} icon={row.icon} label={row.label} />
              ))}
            </>
          ) : null}

          {detail.showAmenities ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>وسائل الراحة</Text>
              {visibleAmenities.map((row) => (
                <IconLine key={row.key} icon={row.icon} label={row.label} />
              ))}
              {detail.amenities.length > 4 ? (
                <Pressable
                  style={styles.outlinePill}
                  onPress={() => setAmenitiesExpanded((v) => !v)}
                >
                  <Text style={styles.outlinePillText}>
                    {amenitiesExpanded
                      ? 'عرض أقل'
                      : `عرض جميع وسائل الراحة الـ ${detail.amenities.length}`}
                  </Text>
                  <Ionicons
                    name={amenitiesExpanded ? 'chevron-down' : 'chevron-back'}
                    size={16}
                    color={DETAIL.muted}
                  />
                </Pressable>
              ) : null}
            </>
          ) : null}

          {detail.showAddress ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>العنوان</Text>
              <View style={styles.locRowTight}>
                <Ionicons name="location-sharp" size={14} color={DETAIL.muted} />
                <Text style={styles.locText}>{addressLine || 'صنعاء'}</Text>
              </View>
              <Pressable style={styles.mapCard} onPress={openMaps}>
                {isNativeMapsEnabled() ? (
                  <MapView
                    style={[styles.map, { transform: [...RTL_MAP_FIX] }]}
                    pointerEvents="none"
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    toolbarEnabled={false}
                    initialRegion={{
                      ...mapCoords,
                      latitudeDelta: 0.012,
                      longitudeDelta: 0.012,
                    }}
                  >
                    <Marker coordinate={mapCoords} pinColor="#E11D48" />
                  </MapView>
                ) : (
                  <MapFallback
                    latitude={mapCoords.latitude}
                    longitude={mapCoords.longitude}
                    height={160}
                  />
                )}
              </Pressable>
            </>
          ) : null}

          {detail.showRatingBanner ? (
            <>
              <View style={styles.divider} />
              <RatingsSection
                average={hasReviews ? rating : 0}
                count={provider.reviewCount ?? 0}
                reviews={reviews}
              />
            </>
          ) : null}

          {detail.showDeposit && detail.depositAmount != null ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>العربون</Text>
              <Text style={styles.priceAccent}>{formatPrice(detail.depositAmount)}</Text>
              <Text style={styles.body}>{detail.depositNote}</Text>
            </>
          ) : null}

          {detail.showInsurance && detail.insuranceAmount != null ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>التأمين على الممتلكات</Text>
              <Text style={styles.priceAccent}>{formatPrice(detail.insuranceAmount)}</Text>
              {detail.insuranceMeta ? (
                <Text style={styles.bodyStrong}>{detail.insuranceMeta}</Text>
              ) : null}
              {detail.insuranceNote?.trim() ? (
                <Text style={styles.body}>{detail.insuranceNote}</Text>
              ) : null}
            </>
          ) : null}

          {detail.showTerms ? (
            <>
              <View style={styles.divider} />
              {detail.terms.map((t, i) => {
                const raw = t.trim();
                const labeled = /^\d+[\.\-\)]\s*/.test(raw)
                  ? raw
                  : `${i + 1}. ${raw}`;
                return (
                  <Text key={`term-${i}`} style={styles.termLine}>
                    {labeled}
                  </Text>
                );
              })}
              {detail.policyBullets.map((t, i) => (
                <View key={`pol-${i}`} style={styles.bulletRow}>
                  <View style={styles.diamond} />
                  <Text style={styles.bulletText}>{t}</Text>
                </View>
              ))}
            </>
          ) : null}

          {detail.showPricePeriods ? (
            <View
              onLayout={(e) => {
                packagesY.current = sheetY.current + e.nativeEvent.layout.y;
              }}
              style={styles.packagesSection}
            >
              <PricePeriodsTicket
                periods={detail.pricePeriods}
                currency={currency}
              />
            </View>
          ) : null}

          {detail.showPackages ? (
            <View
              onLayout={(e) => {
                packagesY.current = sheetY.current + e.nativeEvent.layout.y;
              }}
              style={styles.packagesSection}
            >
              <Text style={styles.packagesHeading}>باقات الأسعار</Text>
              <Text style={styles.packagesSub}>
                تختلف الأيام المتفرغة باختلاف الباقة.
              </Text>
              <FlatList
                data={detail.packages}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(p) => p.id}
                contentContainerStyle={styles.packagesRow}
                renderItem={({ item }) => {
                  const converted = convertFromNewYer(item.price, currency);
                  const amount =
                    currency === 'USD' || currency === 'SAR'
                      ? formatNumber(converted, 2)
                      : formatNumber(Math.round(converted));
                  return (
                    <PackageCard
                      pkg={item}
                      amountLabel={amount}
                      currencyLabel={getCurrency(currency).label}
                      capacityLabel={
                        item.capacityLabel ?? detail.maxGuestsLabel
                      }
                      selected={item.id === (selectedPackage?.id ?? selectedPackageId)}
                      onPress={() => {
                        setSelectedPackageId(item.id);
                        setPackagesRevealed(true);
                      }}
                    />
                  );
                }}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky top: back right; share then heart so heart is outermost left in RTL */}
      <View style={[styles.stickyTop, { top: insets.top + 8 }]} pointerEvents="box-none">
        <BackButton elevated color={DETAIL.navy} onPress={() => navigation.goBack()} />
        <View style={styles.heroActions}>
          <Pressable style={styles.roundBtn} onPress={share}>
            <Ionicons name="paper-plane-outline" size={19} color={DETAIL.navy} />
          </Pressable>
          <Pressable style={styles.roundBtn} onPress={onToggleFavorite}>
            <Ionicons
              name={fav ? 'heart' : 'heart-outline'}
              size={20}
              color={fav ? '#E11D48' : DETAIL.navy}
            />
          </Pressable>
        </View>
      </View>

      <View style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable onPress={onStickyCta}>
          <LinearGradient
            colors={[DETAIL.navyLight, DETAIL.navy, DETAIL.navyDeep]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.stickyBtn}
          >
            <Text style={styles.stickyBtnText}>{detail.ctaLabel}</Text>
            <Ionicons name="book-outline" size={18} color="#fff" />
          </LinearGradient>
        </Pressable>
      </View>

      {detail.isHotel ? (
        <HotelRoomsSheet
          visible={roomsOpen}
          onClose={() => setRoomsOpen(false)}
          rooms={activeServices}
          fallbackImage={provider.images?.[0] ?? provider.logoUrl}
          currency={currency}
          onReserve={(room) => {
            setRoomsOpen(false);
            startBooking(room);
          }}
        />
      ) : null}

      <ImageGalleryModal
        visible={heroGalleryOpen && images.length > 0}
        title={provider.businessName}
        uris={images}
        initialIndex={imageIndex}
        onClose={() => setHeroGalleryOpen(false)}
      />
    </View>
  );
}

function PackageCard({
  pkg,
  amountLabel,
  currencyLabel,
  capacityLabel,
  selected,
  onPress,
}: {
  pkg: PricePackage;
  amountLabel: string;
  currencyLabel: string;
  capacityLabel?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const guestsLabel = capacityLabel ?? pkg.capacityLabel;
  return (
    <Pressable
      style={[styles.packageCard, selected && styles.packageCardSelected]}
      onPress={onPress}
    >
      <View style={styles.packageTop}>
        <View style={styles.packagePriceRow}>
          <Text style={styles.packageAmount} numberOfLines={1}>
            {amountLabel}
          </Text>
          <Text style={styles.packageCurrency}>
            {currencyLabel}
            {pkg.period === 'PER_NIGHT' ? ' / ليلة' : ''}
          </Text>
        </View>
        <Text style={styles.packageTitle} numberOfLines={2}>
          {pkg.title}
        </Text>
      </View>

      <View style={styles.packageLine} />

      <View style={styles.packageDetails}>
        {guestsLabel ? (
          <View style={styles.packageMeta}>
            <Ionicons name="people-outline" size={20} color="#98A2B3" />
            <Text style={styles.packageMetaText}>{guestsLabel}</Text>
          </View>
        ) : null}
        {pkg.timeLabel ? (
          <View style={styles.packageMeta}>
            <Ionicons name="time-outline" size={20} color="#98A2B3" />
            <Text style={styles.packageMetaText}>{pkg.timeLabel}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DETAIL.pageBg },
  heroWrap: { width: SCREEN_W, backgroundColor: '#222' },
  heroFallback: {
    width: SCREEN_W,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DETAIL.navyLight,
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
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  counter: {
    position: 'absolute',
    bottom: 36,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  counterText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  sheet: {
    marginTop: -28,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14, fontWeight: '700', color: DETAIL.text },
  ratingCount: { fontSize: 12, color: DETAIL.muted, marginStart: 2 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catText: { fontSize: 13, fontWeight: '700', color: DETAIL.navy },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: DETAIL.text,
    marginBottom: 8,
    width: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  locRowTight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locText: {
    fontSize: 13,
    color: DETAIL.muted,
    flex: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: DETAIL.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  chipsRow: { gap: 10, paddingBottom: 4, paddingTop: 12 },
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
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DETAIL.line,
    marginVertical: 18,
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
    marginBottom: 12,
    width: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    fontSize: 14,
    lineHeight: 24,
    color: DETAIL.muted,
    width: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  bodyStrong: {
    fontSize: 14,
    fontWeight: '700',
    color: DETAIL.text,
    marginBottom: 6,
    width: '100%',
    textAlign: 'right',
  },
  link: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: DETAIL.navy,
    textAlign: 'right',
  },
  iconLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
  },
  iconLineText: {
    fontSize: 14,
    color: DETAIL.text,
    flex: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
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
    height: 168,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E8EEF8',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DETAIL.border,
  },
  map: { ...StyleSheet.absoluteFillObject },
  ratingBanner: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingBannerValue: {
    fontSize: 28,
    fontWeight: '800',
    color: DETAIL.text,
  },
  ratingBannerCount: {
    fontSize: 12,
    color: DETAIL.muted,
    fontWeight: '600',
  },
  priceAccent: {
    fontSize: 20,
    fontWeight: '800',
    color: DETAIL.navy,
    marginBottom: 8,
    width: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  termLine: {
    fontSize: 14,
    lineHeight: 26,
    color: DETAIL.muted,
    marginBottom: 6,
    width: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
  },
  diamond: {
    width: 8,
    height: 8,
    backgroundColor: DETAIL.navy,
    transform: [{ rotate: '45deg' }],
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 22,
    color: DETAIL.muted,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subHint: {
    fontSize: 12,
    color: DETAIL.muted,
    marginBottom: 12,
    width: '100%',
    textAlign: 'right',
  },
  packagesSection: {
    marginTop: 8,
    paddingTop: 8,
  },
  packagesHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: DETAIL.text,
    marginBottom: 6,
    width: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  packagesSub: {
    fontSize: 13,
    color: DETAIL.muted,
    marginBottom: 18,
    width: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  packagesRow: {
    gap: 14,
    paddingVertical: 4,
    paddingBottom: 8,
  },
  packageCard: {
    width: SCREEN_W * 0.84,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E6EBF1',
    paddingTop: 22,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    shadowColor: '#0D1B3E',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  packageCardSelected: {
    borderWidth: 1.5,
    borderColor: DETAIL.navy,
    shadowOpacity: 0.14,
  },
  packageTop: {
    gap: 8,
    marginBottom: 16,
  },
  packagePriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  packageAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: DETAIL.navy,
    letterSpacing: -0.3,
  },
  packageCurrency: {
    fontSize: 15,
    fontWeight: '600',
    color: DETAIL.text,
  },
  packageTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: DETAIL.muted,
    width: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  packageLine: {
    height: 1,
    backgroundColor: '#EEF1F5',
    marginBottom: 16,
  },
  packageDetails: {
    gap: 12,
  },
  packageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
  },
  packageMetaText: {
    flexShrink: 1,
    fontSize: 14,
    color: DETAIL.muted,
    fontWeight: '500',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: 'rgba(255,255,255,0.97)',
  },
  stickyBtn: {
    height: 54,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: DETAIL.navy,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  stickyBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
