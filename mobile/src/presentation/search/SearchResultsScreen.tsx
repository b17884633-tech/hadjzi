import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { OfferCardSkeletonList } from '@/core/ui/components/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { SearchFilters, SearchResult } from '../../domain/model/Search';
import { BackButton } from '../../core/ui/components/BackButton';
import { FilterIcon } from '../../core/ui/components/FilterIcon';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { FiltersBottomSheet } from './FiltersBottomSheet';

type Route = RouteProp<MainTabParamList & RootStackParamList, 'Explore' | 'SearchResults'>;

export function SearchResultsScreen() {
  const { container, formatPrice } = useApp();
  const route = useRoute<Route>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(route.params?.filters ?? {});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const response = await container.searchRepository.search(filters);
      setResults(response.results);
    } finally {
      setLoading(false);
    }
  }, [container, filters]);

  useEffect(() => {
    setFilters(route.params?.filters ?? {});
  }, [route.params?.filters]);

  useEffect(() => {
    search().catch(() => undefined);
  }, [search]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return results;
    return results.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.cityName ?? '').toLowerCase().includes(q) ||
        (item.categoryName ?? '').toLowerCase().includes(q),
    );
  }, [results, query]);

  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        {canGoBack ? <BackButton onPress={() => navigation.goBack()} /> : <View style={styles.spacer} />}
        <View style={styles.searchBar}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث عن منشأة.."
            placeholderTextColor="#9AA6B2"
            style={styles.searchInput}
            returnKeyType="search"
          />
          <Ionicons name="search-outline" size={20} color="#6B7280" />
        </View>
        <Pressable
          style={styles.filterBtn}
          onPress={() => setFiltersVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="تصفية"
        >
          <FilterIcon size={20} color="#374151" />
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={() => search().catch(() => undefined)}
        ListEmptyComponent={
          loading ? (
            <OfferCardSkeletonList count={3} />
          ) : (
            <Text style={styles.empty}>لا توجد نتائج. عدّل البحث أو الفلاتر.</Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('ProviderProfile', { providerId: item.id })}
          >
            <View style={styles.cardBody}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              {item.cityName ? <Text style={styles.meta}>{item.cityName}</Text> : null}
              {item.categoryName ? <Text style={styles.meta}>{item.categoryName}</Text> : null}
              {item.priceFrom != null ? (
                <Text style={styles.price}>من {formatPrice(item.priceFrom)}</Text>
              ) : null}
            </View>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbFallback]}>
                <Ionicons name="business-outline" size={20} color={theme.colors.primary} />
              </View>
            )}
          </Pressable>
        )}
      />

      <FiltersBottomSheet
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        initialFilters={filters}
        onApply={(next) => {
          setFilters(next);
          setFiltersVisible(false);
        }}
      />
    </SafeAreaView>
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
  spacer: { width: 40 },
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
  list: {
    paddingHorizontal: 14,
    paddingBottom: 120,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  cardBody: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 3,
  },
  name: {
    width: '100%',
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'right',
  },
  meta: {
    width: '100%',
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  price: {
    width: '100%',
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.accent,
    marginTop: 4,
    textAlign: 'right',
  },
  thumb: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: theme.colors.mint,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 22,
  },
});
