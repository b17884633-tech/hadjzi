import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { Provider } from '../../domain/model/Provider';
import { Destination } from '../../domain/model/Search';
import { getSelectedCity, saveSelectedCity } from '../../data/local/cityStorage';
import { CityPickerSheet } from '../home/components/CityPickerSheet';
import { RootStackParamList } from '../navigation/types';
import { SearchMapView } from './SearchMapView';

const WHATSAPP_URL = 'https://wa.me/967700000000';
const FALLBACK_CITIES: Destination[] = [
  { id: 1, name: 'صنعاء' },
  { id: 2, name: 'عدن' },
  { id: 3, name: 'تعز' },
  { id: 4, name: 'الحديدة' },
  { id: 5, name: 'إب' },
  { id: 6, name: 'المكلا' },
];

export function SearchScreen() {
  const { container } = useApp();
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

  const header = (
    <View style={styles.header}>
      <Pressable style={styles.cityChip} onPress={() => setCityOpen(true)}>
        <Ionicons name="location" size={16} color={theme.colors.primary} />
        <Text style={styles.cityChipText} numberOfLines={1}>
          المدينة: {city.name}
        </Text>
        <Ionicons name="chevron-down" size={14} color={theme.colors.textSecondary} />
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
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.mapSafe} edges={['top', 'left', 'right']}>
        <SearchMapView
          cityName={city.name}
          providers={providers}
          loading={loading}
          onOpenProvider={openProvider}
          header={header}
        />
      </SafeAreaView>
      <CityPickerSheet
        visible={cityOpen}
        cities={cities}
        selectedCityId={city.id}
        title="اختر المدينة"
        subtitle="عرض المنشآت على الخريطة حسب المدينة"
        onClose={() => setCityOpen(false)}
        onSelect={onSelectCity}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F8' },
  mapSafe: { flex: 1 },
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
});
