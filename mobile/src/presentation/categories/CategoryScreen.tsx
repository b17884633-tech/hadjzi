import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { OfferCardSkeletonList } from '@/core/ui/components/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { Category } from '../../domain/model/Category';
import { Provider } from '../../domain/model/Provider';
import { Destination } from '../../domain/model/Search';
import { cheapestService, findCategoryInTree } from '../../data/mappers/homeMappers';
import { getSelectedCity } from '../../data/local/cityStorage';
import { HomeStackParamList, RootStackParamList } from '../navigation/types';
import { BackButton } from '../../core/ui/components/BackButton';
import { FilterIcon } from '../../core/ui/components/FilterIcon';
import { CategoryScroller } from '../home/components/CategoryScroller';
import { FeaturedOfferCard } from '../home/components/FeaturedOfferCard';
import { HeroPromoBanner, PromoSlide } from '../home/components/HeroPromoBanner';
import { TopRatedCard } from '../home/components/TopRatedCard';
import { handlePromoSlidePress } from '../home/bannerNavigation';
import { facilityRating } from '../home/facilityRating';
import { isEcommerceCatalogCategory } from '../provider/categoryKinds';
import { CatalogProductCard } from './CatalogProductCard';
import { CategoryFiltersSheet } from './CategoryFiltersSheet';
import {
  CategoryFilterValues,
  activeFilterChips,
  countActiveFilters,
  emptyCategoryFilters,
  filterProviders,
} from './categoryFilters';
import { Banner } from '../../domain/model/Banner';
import type { ServiceItem } from '../../domain/model/Provider';

type CatalogProduct = {
  key: string;
  providerId: string;
  serviceId: string;
  title: string;
  subtitle?: string;
  price?: number;
  images: string[];
  cityName?: string;
  regionName?: string;
  addressDetails?: string;
  categoryName?: string;
  rating?: number;
  reviewCount?: number;
  meta?: string;
  brand?: string;
};

function catalogBrand(service: ServiceItem): string | undefined {
  const raw = (service.attributes ?? {}) as Record<string, unknown>;
  return typeof raw.brand === 'string' && raw.brand.trim()
    ? raw.brand.trim()
    : undefined;
}

function catalogMeta(service: ServiceItem, categoryName?: string): string | undefined {
  const a = (service.attributes ?? {}) as Record<string, unknown>;
  if (isEcommerceCatalogCategory(categoryName) && /ملبوس|ملابس|أزياء/i.test(categoryName ?? '')) {
    const size = typeof a.size === 'string' ? a.size.trim() : '';
    const color = typeof a.color === 'string' ? a.color.trim() : '';
    const parts = [size ? `مقاس ${size}` : null, color || null].filter(Boolean);
    return parts.length ? parts.join(' · ') : undefined;
  }
  const brand = catalogBrand(service);
  const seats = typeof a.seats === 'number' ? a.seats : Number(a.seats);
  const year = typeof a.year === 'number' ? a.year : Number(a.year);
  const parts = [
    brand || null,
    Number.isFinite(seats) && seats > 0 ? `${seats} مقاعد` : null,
    Number.isFinite(year) && year > 0 ? String(year) : null,
    a.transmission === 'MANUAL' ? 'عادي' : a.transmission === 'AUTO' ? 'أوتوماتيك' : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

function flattenCatalogProducts(providers: Provider[]): CatalogProduct[] {
  const out: CatalogProduct[] = [];
  for (const p of providers) {
    const services = (p.services ?? []).filter(
      (s) => !s.status || s.status === 'ACTIVE',
    );
    for (const s of services) {
      const images =
        (s.images?.filter(Boolean) as string[] | undefined)?.length
          ? (s.images!.filter(Boolean) as string[])
          : s.imageUrl
            ? [s.imageUrl]
            : imagesFromProvider(p);
      const categoryName = p.categoryName ?? p.category?.name;
      out.push({
        key: `${p.id}:${s.id}`,
        providerId: p.id,
        serviceId: s.id,
        title: s.name?.trim() || 'منتج',
        subtitle: p.businessName,
        price: s.priceFrom ?? s.basePrice,
        images,
        cityName: p.cityName ?? p.city?.name,
        regionName: p.regionName ?? p.region?.name,
        addressDetails: p.addressDetails,
        categoryName,
        rating: facilityRating(p),
        reviewCount: p.reviewCount ?? 0,
        meta: catalogMeta(s, categoryName),
        brand: catalogBrand(s),
      });
    }
  }
  return out;
}

type Props = {
  route: NativeStackScreenProps<HomeStackParamList, 'Category'>['route'];
  navigation: CompositeNavigationProp<
    NativeStackNavigationProp<HomeStackParamList, 'Category'>,
    NativeStackNavigationProp<RootStackParamList>
  >;
};

function imageFromProvider(provider: Provider): string | undefined {
  return imagesFromProvider(provider)[0];
}

function imagesFromProvider(provider: Provider): string[] {
  const fromProvider = provider.images?.filter(Boolean) ?? [];
  if (fromProvider.length) return fromProvider;
  const fromServices =
    provider.services?.flatMap((s) => s.images?.filter(Boolean) ?? []) ?? [];
  if (fromServices.length) return fromServices;
  if (provider.logoUrl) return [provider.logoUrl];
  return [];
}

export function CategoryScreen({ route, navigation }: Props) {
  const { categoryId, title: titleParam } = route.params;
  const { container } = useApp();

  const [category, setCategory] = useState<Category | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [cities, setCities] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CategoryFilterValues>(emptyCategoryFilters());
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [banners, setBanners] = useState<Banner[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const storedCity = await getSelectedCity();
      const cityId = filters.cityId ?? storedCity?.id;
      const [treeRes, searchRes, dests, bannerRes] = await Promise.all([
        container.categoryApi.tree(),
        container.searchRepository.search({
          categoryId,
          cityId,
          date: filters.availableDate,
          endDate: filters.availableEndDate,
          time: filters.availableTime,
        }),
        container.searchRepository.getDestinations().catch(() => [] as Destination[]),
        container.bannerApi
          .listActive()
          .catch(() => ({ data: { data: [] as Banner[] } })),
      ]);
      const tree = treeRes.data.data ?? [];
      const found = findCategoryInTree(tree, categoryId);
      setCategory(found);
      setProviders(searchRes.providers ?? []);
      setCities(dests);
      setBanners(bannerRes.data.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل التصنيف');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    categoryId,
    container,
    filters.cityId,
    filters.availableDate,
    filters.availableEndDate,
    filters.availableTime,
  ]);

  useEffect(() => {
    setLoading(true);
    load().catch(() => undefined);
  }, [load]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const title = category?.name ?? titleParam ?? 'التصنيف';
  const subcategories = category?.children ?? [];
  const bookingType = category?.bookingType;
  const isCatalog = isEcommerceCatalogCategory(title);

  const filtered = useMemo(() => {
    const byFilters = filterProviders(providers, filters);
    const q = query.trim().toLowerCase();
    if (!q) return byFilters;
    return byFilters.filter((p) => {
      const name = p.businessName?.toLowerCase() ?? '';
      const city = (p.cityName ?? p.city?.name ?? '').toLowerCase();
      const cat = (p.categoryName ?? p.category?.name ?? '').toLowerCase();
      const addr = (p.addressDetails ?? '').toLowerCase();
      const serviceHit = (p.services ?? []).some((s) =>
        (s.name ?? '').toLowerCase().includes(q),
      );
      return (
        name.includes(q) ||
        city.includes(q) ||
        cat.includes(q) ||
        addr.includes(q) ||
        serviceHit
      );
    });
  }, [providers, filters, query]);

  const catalogProducts = useMemo(() => {
    if (!isCatalog) return [] as CatalogProduct[];
    const q = query.trim().toLowerCase();
    let all = flattenCatalogProducts(filtered);
    const brandKeys = (filters.brands ?? []).map((b) => b.trim().toLowerCase());
    if (brandKeys.length) {
      all = all.filter(
        (item) =>
          !!item.brand &&
          brandKeys.includes(item.brand.trim().toLowerCase()),
      );
    }
    if (!q) return all;
    return all.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle ?? '').toLowerCase().includes(q) ||
        (item.meta ?? '').toLowerCase().includes(q) ||
        (item.brand ?? '').toLowerCase().includes(q),
    );
  }, [filtered, isCatalog, query, filters.brands]);

  const [showAllOffers, setShowAllOffers] = useState(false);
  const [showAllTopRated, setShowAllTopRated] = useState(false);

  // New category / filters → collapse back to preview
  useEffect(() => {
    setShowAllOffers(false);
    setShowAllTopRated(false);
  }, [categoryId, filters, query]);

  const PREVIEW_OFFERS = 8;
  const PREVIEW_TOP = 6;

  const featured = useMemo(
    () => (showAllOffers ? filtered : filtered.slice(0, PREVIEW_OFFERS)),
    [filtered, showAllOffers],
  );
  const topRatedAll = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const ra = a.reviewCount && a.reviewCount > 0 ? (a.rating ?? 0) : 0;
        const rb = b.reviewCount && b.reviewCount > 0 ? (b.rating ?? 0) : 0;
        if (rb !== ra) return rb - ra;
        return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      }),
    [filtered],
  );
  const topRated = useMemo(
    () => (showAllTopRated ? topRatedAll : topRatedAll.slice(0, PREVIEW_TOP)),
    [topRatedAll, showAllTopRated],
  );

  const activeCount = countActiveFilters(filters);
  const chips = activeFilterChips(filters);
  const productBrands = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of flattenCatalogProducts(providers)) {
      const brand = item.brand?.trim();
      if (!brand) continue;
      const key = brand.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(brand);
    }
    return out;
  }, [providers]);

  const productSpecialties = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of providers) {
      const raw = p.attributes?.specialty;
      const specialty =
        typeof raw === 'string' ? raw.trim() : '';
      if (!specialty) continue;
      const key = specialty.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(specialty);
    }
    return out;
  }, [providers]);

  const openCategory = (cat: Category) => {
    navigation.push('Category', { categoryId: cat.id, title: cat.name });
  };

  const openProvider = (providerId: string, serviceId?: string) =>
    navigation.navigate('ProviderProfile', { providerId, serviceId });

  const openProduct = (providerId: string, serviceId: string) =>
    navigation.navigate('CatalogProduct', { providerId, serviceId });

  const catalogSectionTitle = /ملبوس|ملابس/i.test(title)
    ? 'المنتجات'
    : /نقل/i.test(title)
      ? 'المركبات'
      : 'السيارات';

  /** Expand the offers list on this page (no separate SearchResults screen). */
  const showAllOnPage = () => setShowAllOffers(true);

  const openPromoSlide = (slide: PromoSlide) => {
    handlePromoSlidePress(slide, {
      openCategory: (id, title) =>
        navigation.push('Category', { categoryId: id, title }),
      openProvider,
      openService: async (serviceId) => {
        try {
          const service = await container.serviceApi.getService(serviceId);
          if (service.providerId) openProvider(service.providerId);
          else showAllOnPage();
        } catch {
          showAllOnPage();
        }
      },
      fallback: showAllOnPage,
    });
  };

  const clearChip = (key: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (key === 'price') {
        delete next.minPrice;
        delete next.maxPrice;
      } else if (key === 'city') {
        delete next.cityId;
        delete next.cityName;
      }       else if (key === 'distance') delete next.maxDistanceKm;
      else if (key === 'rating') delete next.minRating;
      else if (key === 'rooms') delete next.minRooms;
      else if (key === 'beds') delete next.minBeds;
      else if (key === 'bathrooms') delete next.minBathrooms;
      else if (key === 'capacity') delete next.minCapacity;
      else if (key === 'players') delete next.minPlayers;
      else if (key === 'brands') delete next.brands;
      else if (key === 'specialties') delete next.specialties;
      else if (key === 'availability') {
        delete next.availableDate;
        delete next.availableEndDate;
        delete next.availableTime;
        delete next.availablePeriod;
      }
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={styles.searchBar}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={
              isCatalog ? `ابحث في ${catalogSectionTitle}..` : 'ابحث عن منشأة..'
            }
            placeholderTextColor="#9AA6B2"
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          <Ionicons name="search-outline" size={20} color="#6B7280" />
        </View>
        <Pressable
          style={styles.filterBtn}
          onPress={() => setFilterOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="تصفية"
        >
          <FilterIcon size={20} color="#374151" />
          {activeCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {chips.length > 0 ? (
        <View style={styles.chipBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}
          >
            {chips.map((chip) => (
              <Pressable
                key={chip.key}
                style={styles.chip}
                onPress={() => clearChip(chip.key)}
              >
                <Text style={styles.chipText}>{chip.label}</Text>
                <Ionicons name="close" size={14} color={theme.colors.primary} />
              </Pressable>
            ))}
            <Pressable
              style={styles.chipClearAll}
              onPress={() => setFilters(emptyCategoryFilters())}
            >
              <Text style={styles.chipClearAllText}>مسح الكل</Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={theme.colors.primary}
          />
        }
      >
        <HeroPromoBanner
          banners={banners}
          categoryId={categoryId}
          categoryName={category?.name ?? titleParam}
          onPressSlide={openPromoSlide}
          onExplore={showAllOnPage}
        />

        {subcategories.length > 0 ? (
          <View style={styles.categories}>
            <CategoryScroller
              title="التصنيفات الفرعية"
              categories={subcategories}
              onCategoryPress={openCategory}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeading
            title={isCatalog ? catalogSectionTitle : 'عروض في هذا التصنيف'}
            action={
              isCatalog || showAllOffers || filtered.length <= PREVIEW_OFFERS
                ? undefined
                : 'عرض الكل'
            }
            onPress={showAllOnPage}
            count={isCatalog ? catalogProducts.length : filtered.length}
          />
          {loading ? (
            <OfferCardSkeletonList count={2} />
          ) : error ? (
            <Text style={styles.empty}>{error}</Text>
          ) : isCatalog ? (
            catalogProducts.length === 0 ? (
              <Text style={styles.empty}>
                {activeCount > 0
                  ? 'لا توجد نتائج مطابقة للتصفية الحالية'
                  : `لا توجد ${catalogSectionTitle} في هذا التصنيف حالياً`}
              </Text>
            ) : (
              <View style={styles.productGrid}>
                {catalogProducts.map((item) => (
                  <CatalogProductCard
                    key={item.key}
                    product={{
                      id: item.serviceId,
                      title: item.title,
                      price: item.price,
                      image: item.images[0],
                      shopName: item.subtitle,
                      cityName: item.cityName,
                      rating: item.rating,
                      reviewCount: item.reviewCount,
                      verified: true,
                    }}
                    onPress={() => openProduct(item.providerId, item.serviceId)}
                  />
                ))}
              </View>
            )
          ) : featured.length === 0 ? (
            <Text style={styles.empty}>
              {activeCount > 0
                ? 'لا توجد نتائج مطابقة للتصفية الحالية'
                : 'لا توجد عروض في هذا التصنيف حالياً'}
            </Text>
          ) : (
            featured.map((provider) => {
              const service = cheapestService(provider);
              const price = service?.priceFrom ?? service?.basePrice;
              return (
                <FeaturedOfferCard
                  key={provider.id}
                  offer={{
                    id: provider.id,
                    title: provider.businessName,
                    price,
                    images: imagesFromProvider(provider),
                    image: imageFromProvider(provider),
                    cityName: provider.cityName ?? provider.city?.name,
                    regionName: provider.regionName ?? provider.region?.name,
                    addressDetails: provider.addressDetails,
                    categoryName: provider.categoryName ?? provider.category?.name,
                    rating: facilityRating(provider),
                    reviewCount: provider.reviewCount ?? 0,
                    verified: provider.verified !== false,
                  }}
                  onPress={() => openProvider(provider.id)}
                />
              );
            })
          )}
        </View>

        {!loading && !isCatalog && topRated.length > 0 ? (
          <View style={styles.section}>
            <SectionHeading
              title="الأعلى تقييماً"
              action={
                showAllTopRated || topRatedAll.length <= PREVIEW_TOP
                  ? undefined
                  : 'عرض الكل'
              }
              onPress={() => setShowAllTopRated(true)}
            />
            {topRated.map((provider) => {
              const service = cheapestService(provider);
              const price = service?.priceFrom ?? service?.basePrice;
              const categoryName =
                provider.categoryName ?? provider.category?.name;
              return (
                <TopRatedCard
                  key={`top-${provider.id}`}
                  title={provider.businessName}
                  subtitle={
                    provider.description?.split(/[.،]/)[0]?.trim() ||
                    categoryName ||
                    provider.cityName
                  }
                  rating={facilityRating(provider)}
                  reviewCount={provider.reviewCount ?? 0}
                  price={price}
                  depositPercentage={30}
                  categoryLabel={categoryName?.slice(0, 12) ?? 'خدمة'}
                  verified={provider.verified !== false}
                  image={imageFromProvider(provider)}
                  onPress={() => openProvider(provider.id)}
                />
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      <CategoryFiltersSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        categoryName={title}
        bookingType={bookingType}
        cities={cities}
        productBrands={productBrands}
        productSpecialties={productSpecialties}
        initial={filters}
        onApply={setFilters}
      />
    </SafeAreaView>
  );
}

function SectionHeading({
  title,
  action,
  onPress,
  count,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
  count?: number;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.headingTitleRow}>
        <View style={styles.headingMarker} />
        <Text style={styles.sectionTitle}>
          {title}
          {count != null ? ` (${count})` : ''}
        </Text>
      </View>
      {action && onPress ? (
        <Pressable style={styles.viewAll} onPress={onPress}>
          <Text style={styles.viewAllText}>{action}</Text>
          <Ionicons name="chevron-back" size={14} color={theme.colors.accentDark} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchBar: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'right',
    paddingVertical: 0,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  chipBar: {
    flexGrow: 0,
    flexShrink: 0,
  },
  // ScrollView defaults to flexGrow:1 — without this the chip row steals half the screen.
  chipScroll: {
    flexGrow: 0,
  },
  chipRow: {
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 8,
    gap: 8,
    alignItems: 'center',
    flexGrow: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.mint,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  chipClearAll: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipClearAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accentDark,
  },
  mainScroll: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 14,
    paddingBottom: 110,
  },
  categories: {
    marginTop: 4,
    marginBottom: 8,
  },
  section: {
    marginTop: 14,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  headingMarker: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accentDark,
  },
  empty: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 22,
  },
});
