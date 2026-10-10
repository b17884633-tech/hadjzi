import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { Provider } from '../../domain/model/Provider';
import { Destination } from '../../domain/model/Search';
import { cheapestService } from '../../data/mappers/homeMappers';
import { getSelectedCity, saveSelectedCity } from '../../data/local/cityStorage';
import { CityPickerSheet } from '../home/components/CityPickerSheet';
import { RootStackParamList } from '../navigation/types';

const WHATSAPP_URL = 'https://wa.me/967700000000';
const FALLBACK_CITIES: Destination[] = [
  { id: 1, name: 'صنعاء' },
  { id: 2, name: 'عدن' },
  { id: 3, name: 'تعز' },
  { id: 4, name: 'الحديدة' },
  { id: 5, name: 'إب' },
  { id: 6, name: 'المكلا' },
];

/**
 * List-based explore tab.
 * Native MapView is intentionally not imported — Android builds without a
 * Google Maps API key crash as soon as react-native-maps mounts.
 * Re-add a map panel later behind isNativeMapsEnabled() + a Maps key.
 */
export function SearchScreen() {
  const { container, formatPrice } = useApp();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [cities, setCities] = useState<Destination[]>(FALLBACK_CITIES);
  const [city, setCity] = useState<Destination>(FALLBACK_CITIES[0]);
  const [cityOpen, setCityOpen] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dests, searchRes] = await Promise.all([
        container.searchRepository.getDestinations().catch(() => FALLBACK_CITIES),
        container.searchRepository.search({ cityId: city.id }),
      ]);
      if (dests.length) setCities(dests);
      setProviders(searchRes.providers ?? []);
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [city.id, container]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getSelectedCity();
      if (!cancelled && stored) setCity(stored);
      try {
        const dests = await container.searchRepository.getDestinations();
        if (!cancelled && dests.length) setCities(dests);
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [container]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const onSelectCity = async (next: Destination) => {
    setCity(next);
    setCityOpen(false);
    await saveSelectedCity(next);
  };

  const openProvider = (id: string) =>
    navigation.navigate('ProviderProfile', { providerId: id });

  const renderProviderRow = ({ item }: { item: Provider }) => {
    const service = cheapestService(item);
    const price = service?.priceFrom ?? service?.basePrice;
    return (
      <Pressable style={styles.resultCard} onPress={() => openProvider(item.id)}>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.businessName}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {[item.cityName ?? item.city?.name, item.addressDetails]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <View style={styles.cardFooter}>
            {item.categoryName || item.category?.name ? (
              <Text style={styles.cardCat}>
                {item.categoryName ?? item.category?.name}
              </Text>
            ) : (
              <View />
            )}
            {price != null ? (
              <Text style={styles.cardPrice}>من {formatPrice(price)}</Text>
            ) : null}
          </View>
        </View>
        {item.images?.[0] || item.logoUrl ? (
          <Image
            source={{ uri: item.images?.[0] ?? item.logoUrl }}
            style={styles.cardImage}
          />
        ) : (
          <View style={[styles.cardImage, styles.cardImageFallback]}>
            <Ionicons name="business" size={22} color={theme.colors.primary} />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.listSafe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable style={styles.cityChip} onPress={() => setCityOpen(true)}>
            <Ionicons name="location" size={16} color={theme.colors.primary} />
            <Text style={styles.cityChipText} numberOfLines={1}>
              المدينة: {city.name}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={theme.colors.textSecondary}
            />
          </Pressable>
          <Pressable
            style={styles.whatsappBtn}
            onPress={() => Linking.openURL(WHATSAPP_URL)}
            accessibilityRole="button"
            accessibilityLabel="واتساب"
          >
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.listLoading}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={providers}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <Text style={styles.emptyList}>لا توجد منشآت في هذه المدينة</Text>
            }
            renderItem={renderProviderRow}
          />
        )}
      </SafeAreaView>

      <CityPickerSheet
        visible={cityOpen}
        cities={cities}
        selectedCityId={city.id}
        title="اختر المدينة"
        subtitle="عرض المنشآت حسب المدينة"
        onClose={() => setCityOpen(false)}
        onSelect={onSelectCity}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  listSafe: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 120,
  },
  listLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyList: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 6,
  },
  cityChip: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    shadowColor: '#0D1B3E',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6ECF3',
  },
  cityChipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  whatsappBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6ECF3',
    shadowColor: '#0D1B3E',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6ECF3',
    shadowColor: '#0D1B3E',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cardBody: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 4,
  },
  cardTitle: {
    width: '100%',
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  cardMeta: {
    width: '100%',
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  cardFooter: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardCat: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  cardPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.accentDark,
  },
  cardImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: theme.colors.mint,
  },
  cardImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
