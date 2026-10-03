import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../core/ui/components/Screen';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { SearchResult } from '../../domain/model/Search';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { FiltersBottomSheet } from './FiltersBottomSheet';

type Route = RouteProp<MainTabParamList & RootStackParamList, 'Explore' | 'SearchResults'>;

export function SearchResultsScreen() {
  const { container, formatPrice } = useApp();
  const route = useRoute<Route>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [level, setLevel] = useState<string>('DESTINATION');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState(route.params?.filters ?? {});

  const search = useCallback(async () => {
    const response = await container.searchRepository.search(filters);
    setResults(response.results);
    setLevel(response.level);
  }, [container, filters]);

  useEffect(() => {
    setFilters(route.params?.filters ?? {});
  }, [route.params?.filters]);

  useEffect(() => {
    search().catch(() => undefined);
  }, [search]);

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>البحث</Text>
          <Pressable onPress={() => setFiltersVisible(true)}>
            <Text style={styles.filtersLink}>فلاتر</Text>
          </Pressable>
        </View>
        <Text style={styles.level}>{level.replace(/_/g, ' ')}</Text>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>لا توجد نتائج. عدّل الفلاتر وحاول مجدداً.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('ProviderProfile', { providerId: item.id })}
          >
            <Text style={styles.name}>{item.name}</Text>
            {item.cityName ? <Text style={styles.meta}>{item.cityName}</Text> : null}
            {item.categoryName ? <Text style={styles.meta}>{item.categoryName}</Text> : null}
            {item.priceFrom != null ? (
              <Text style={styles.price}>من {formatPrice(item.priceFrom)}</Text>
            ) : null}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    writingDirection: 'rtl',
  },
  filtersLink: {
    ...theme.typography.bodySmall,
    color: theme.colors.accent,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
  level: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  list: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'flex-end',
  },
  name: {
    ...theme.typography.h3,
    color: theme.colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  meta: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    writingDirection: 'rtl',
  },
  price: {
    ...theme.typography.body,
    color: theme.colors.accent,
    marginTop: theme.spacing.sm,
    writingDirection: 'rtl',
  },
  empty: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    writingDirection: 'rtl',
  },
});
