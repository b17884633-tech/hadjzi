import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { Category } from '../../domain/model/Category';
import { Provider } from '../../domain/model/Provider';
import { Banner } from '../../domain/model/Banner';
import { Destination } from '../../domain/model/Search';
import { rootCategories, cheapestService } from '../../data/mappers/homeMappers';
import { getSelectedCity, saveSelectedCity } from '../../data/local/cityStorage';
import {
  HomeStackParamList,
  MainTabParamList,
  RootStackParamList,
} from '../navigation/types';
import { HomeHeader } from './components/HomeHeader';
import { HeroPromoBanner } from './components/HeroPromoBanner';
import { HomeSearchBar } from './components/HomeSearchBar';
import { CategoryScroller } from './components/CategoryScroller';
import { FeaturedOfferCard } from './components/FeaturedOfferCard';
import { TopRatedCard } from './components/TopRatedCard';
import { TrustBanner } from './components/TrustBanner';
import { CityPickerSheet } from './components/CityPickerSheet';

const FALLBACK_CITIES: Destination[] = [
  { id: 1, name: 'صنعاء' },
  { id: 2, name: 'عدن' },
  { id: 3, name: 'تعز' },
  { id: 4, name: 'الحديدة' },
  { id: 5, name: 'إب' },
  { id: 6, name: 'المكلا' },
];

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

function shortCategoryLabel(name?: string | null): string {
  if (!name) return 'خدمة';
  if (name.includes('أسنان') || name.includes('عياد')) return 'صحة';
  if (name.includes('ملعب') || name.includes('كرة')) return 'رياضة';
  if (name.includes('شالي') || name.includes('شقق')) return 'إقامة';
  if (name.includes('قاعة') || name.includes('أفراح')) return 'مناسبات';
  return name.slice(0, 10);
}

export function HomeScreen() {
  const { container, user } = useApp();
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>,
        CompositeNavigationProp<
          BottomTabNavigationProp<MainTabParamList>,
          NativeStackNavigationProp<RootStackParamList>
        >
      >
    >();

  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [cities, setCities] = useState<Destination[]>(FALLBACK_CITIES);
  const [selectedCity, setSelectedCity] = useState<Destination>(FALLBACK_CITIES[0]);
  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openSearch = (filters?: { categoryId?: number; cityId?: number }) =>
    navigation.navigate('SearchResults', {
      filters: {
        cityId: filters?.cityId ?? selectedCity.id,
        categoryId: filters?.categoryId,
      },
    });

  const openProvider = (providerId: string) =>
    navigation.navigate('ProviderProfile', { providerId });

  const openAccount = () => {
    navigation.navigate('Account');
  };

  const load = useCallback(
    async (cityId?: number) => {
      setError(null);
      const activeCityId = cityId ?? selectedCity.id;
      try {
        const [categoryRes, searchRes, bannerRes, destinations] = await Promise.all([
          container.categoryApi.tree(),
          container.searchRepository.search({ cityId: activeCityId }),
          container.bannerApi
            .listActive()
            .catch(() => ({ data: { data: [] as Banner[] } })),
          container.searchRepository.getDestinations().catch(() => FALLBACK_CITIES),
        ]);

        const destList =
          Array.isArray(destinations) && destinations.length > 0
            ? destinations
            : FALLBACK_CITIES;
        setCities(destList);

        setCategories(categoryRes.data.data ?? []);
        setProviders(searchRes.providers ?? []);
        setBanners(bannerRes.data.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'تعذر تحميل البيانات');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [container, selectedCity.id],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getSelectedCity();
      if (cancelled) return;
      if (stored) {
        setSelectedCity({ id: stored.id, name: stored.name });
        await load(stored.id);
      } else {
        await load(FALLBACK_CITIES[0].id);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Boot once from storage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectCity = useCallback(
    async (city: Destination) => {
      setSelectedCity(city);
      await saveSelectedCity({ id: city.id, name: city.name });
      setLoading(true);
      await load(city.id);
    },
    [load],
  );

  const displayCategories = useMemo(
    () => rootCategories(categories),
    [categories],
  );

  const featured = useMemo(() => providers.slice(0, 6), [providers]);
  const topRated = useMemo(() => {
    const rest = providers.slice(0, 10);
    return rest.length > 3 ? rest.slice(0, 8) : rest;
  }, [providers]);

  const heroBanner = banners[0];
  const userDisplayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
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
        <HomeHeader
          cityName={selectedCity.name}
          userName={userDisplayName || null}
          onCityPress={() => setCitySheetOpen(true)}
          onProfilePress={openAccount}
        />
        <HeroPromoBanner banner={heroBanner} onExplore={() => openSearch()} />
        <HomeSearchBar onSearchPress={() => openSearch()} />

        <View style={styles.categories}>
          <CategoryScroller
            categories={displayCategories}
            onCategoryPress={(cat) =>
              navigation.navigate('Category', {
                categoryId: cat.id,
                title: cat.name,
              })
            }
          />
        </View>

        <View style={styles.section}>
          <SectionHeading
            title="عروض حصرية مميزة"
            action="عرض الكل"
            onPress={() => openSearch()}
          />
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
          ) : error ? (
            <Text style={styles.empty}>{error}</Text>
          ) : featured.length === 0 ? (
            <Text style={styles.empty}>لا توجد عروض حالياً — جرّب التحديث لاحقاً</Text>
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
                    rating: provider.rating ?? 4.8,
                    verified: provider.verified !== false,
                  }}
                  onPress={() => openProvider(provider.id)}
                />
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <SectionHeading
            title="الأعلى تقييماً بالقرب منك"
            action="عرض الكل"
            onPress={() => openSearch()}
          />
          {!loading && topRated.length === 0 ? (
            <Text style={styles.empty}>لا توجد نتائج قريبة حالياً</Text>
          ) : (
            topRated.map((provider) => {
              const service = cheapestService(provider);
              const price = service?.priceFrom ?? service?.basePrice;
              const categoryName = provider.categoryName ?? provider.category?.name;
              return (
                <TopRatedCard
                  key={`top-${provider.id}`}
                  title={provider.businessName}
                  subtitle={
                    provider.description?.split(/[.،]/)[0]?.trim() ||
                    categoryName ||
                    provider.cityName
                  }
                  rating={provider.rating ?? 4.7}
                  price={price}
                  depositPercentage={30}
                  categoryLabel={shortCategoryLabel(categoryName)}
                  verified={provider.verified !== false}
                  image={imageFromProvider(provider)}
                  onPress={() => openProvider(provider.id)}
                />
              );
            })
          )}
        </View>

        <TrustBanner />
      </ScrollView>

      <CityPickerSheet
        visible={citySheetOpen}
        cities={cities}
        selectedCityId={selectedCity.id}
        onClose={() => setCitySheetOpen(false)}
        onSelect={handleSelectCity}
      />
    </SafeAreaView>
  );
}

function SectionHeading({
  title,
  action,
  onPress,
}: {
  title: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.headingTitleRow}>
        <View style={styles.headingMarker} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Pressable style={styles.viewAll} onPress={onPress}>
        <Text style={styles.viewAllText}>{action}</Text>
        <Ionicons name="chevron-back" size={14} color={theme.colors.accentDark} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    paddingHorizontal: 14,
    paddingBottom: 0,
  },
  categories: {
    marginTop: 4,
    marginBottom: 4,
  },
  section: {
    marginTop: 14,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headingTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headingMarker: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
  },
  sectionTitle: {
    ...theme.typography.h3,
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    ...theme.typography.caption,
    color: theme.colors.accentDark,
    textAlign: 'right',
  },
  loader: {
    marginVertical: theme.spacing.md,
  },
  empty: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginVertical: theme.spacing.sm,
  },
});
