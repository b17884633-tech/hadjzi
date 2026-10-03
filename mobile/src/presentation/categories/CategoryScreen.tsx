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
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { Category } from '../../domain/model/Category';
import { Provider } from '../../domain/model/Provider';
import { cheapestService, findCategoryInTree } from '../../data/mappers/homeMappers';
import { getSelectedCity } from '../../data/local/cityStorage';
import { HomeStackParamList, RootStackParamList } from '../navigation/types';
import { BackButton } from '../../core/ui/components/BackButton';
import { CategoryScroller } from '../home/components/CategoryScroller';
import { FeaturedOfferCard } from '../home/components/FeaturedOfferCard';
import { TopRatedCard } from '../home/components/TopRatedCard';

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const storedCity = await getSelectedCity();
      const [treeRes, searchRes] = await Promise.all([
        container.categoryApi.tree(),
        container.searchRepository.search({
          categoryId,
          cityId: storedCity?.id,
        }),
      ]);
      const tree = treeRes.data.data ?? [];
      const found = findCategoryInTree(tree, categoryId);
      setCategory(found);
      setProviders(searchRes.providers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل التصنيف');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId, container]);

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
  const featured = useMemo(() => providers.slice(0, 8), [providers]);
  const topRated = useMemo(() => providers.slice(0, 6), [providers]);

  const openCategory = (cat: Category) => {
    navigation.push('Category', { categoryId: cat.id, title: cat.name });
  };

  const openProvider = (providerId: string) =>
    navigation.navigate('ProviderProfile', { providerId });

  const openSearch = () =>
    navigation.navigate('SearchResults', {
      filters: { categoryId },
    });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

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
            title="عروض في هذا التصنيف"
            action="عرض الكل"
            onPress={openSearch}
          />
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
          ) : error ? (
            <Text style={styles.empty}>{error}</Text>
          ) : featured.length === 0 ? (
            <Text style={styles.empty}>لا توجد عروض في هذا التصنيف حالياً</Text>
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

        {!loading && topRated.length > 0 ? (
          <View style={styles.section}>
            <SectionHeading
              title="الأعلى تقييماً"
              action="عرض الكل"
              onPress={openSearch}
            />
            {topRated.map((provider) => {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primary,
    marginHorizontal: 10,
  },
  headerSpacer: {
    width: 40,
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
  loader: {
    marginVertical: 24,
  },
  empty: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 22,
  },
});
