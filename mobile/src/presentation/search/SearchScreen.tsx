import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
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
import { MapProviderMarker } from './MapProviderMarker';
import { centerForCityName, coordsForProvider, DEFAULT_CENTER } from './mapGeo';

const WHATSAPP_URL = 'https://wa.me/967700000000';
const FALLBACK_CITIES: Destination[] = [
  { id: 1, name: 'صنعاء' },
  { id: 2, name: 'عدن' },
  { id: 3, name: 'تعز' },
  { id: 4, name: 'الحديدة' },
  { id: 5, name: 'إب' },
  { id: 6, name: 'المكلا' },
];

/** MapView draws black under forceRTL on Android — double-flip restores tiles. */
const RTL_MAP_FIX = I18nManager.isRTL ? ([{ scaleX: -1 }] as const) : [];

export function SearchScreen() {
  const { container, formatPrice } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const mapRef = useRef<MapView>(null);

  const [cities, setCities] = useState<Destination[]>(FALLBACK_CITIES);
  const [city, setCity] = useState<Destination>(FALLBACK_CITIES[0]);
  const [cityOpen, setCityOpen] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const cityCenter = useMemo(() => centerForCityName(city.name), [city.name]);

  const markers = useMemo(
    () =>
      providers.map((p) => ({
        provider: p,
        coordinate: coordsForProvider(p, cityCenter),
      })),
    [providers, cityCenter],
  );

  const selected = useMemo(
    () => providers.find((p) => p.id === selectedId) ?? null,
    [providers, selectedId],
  );

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

  useEffect(() => {
    if (!mapReady) return;
    const region: Region = {
      ...cityCenter,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
    mapRef.current?.animateToRegion(region, 450);
    setSelectedId(null);
  }, [cityCenter, mapReady]);

  const onSelectCity = async (next: Destination) => {
    setCity(next);
    setCityOpen(false);
    await saveSelectedCity(next);
  };

  const openProvider = (id: string) =>
    navigation.navigate('ProviderProfile', { providerId: id });

  return (
    <View style={styles.root}>
      {/* LTR host + scaleX fix so the map isn't a black void under forceRTL */}
      <View style={[styles.mapHost, { transform: [...RTL_MAP_FIX] }]}>
        <MapView
          ref={mapRef}
          style={[styles.map, { transform: [...RTL_MAP_FIX] }]}
          initialRegion={{
            ...DEFAULT_CENTER,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
          userInterfaceStyle="light"
          loadingEnabled
          loadingIndicatorColor={theme.colors.primary}
          loadingBackgroundColor="#F0F4F8"
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
          onMapReady={() => setMapReady(true)}
          onPress={() => setSelectedId(null)}
        >
          {markers.map(({ provider, coordinate }) => (
            <Marker
              key={provider.id}
              coordinate={coordinate}
              tracksViewChanges={Platform.OS === 'android' && !mapReady}
              onPress={() => setSelectedId(provider.id)}
            >
              <MapProviderMarker selected={provider.id === selectedId} />
            </Marker>
          ))}
        </MapView>
      </View>

      <SafeAreaView style={styles.overlay} edges={['top', 'left', 'right']} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          {/* RTL: first = right (city), last = left (WhatsApp) */}
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

        {loading || !mapReady ? (
          <View style={styles.loadingPill}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>
              {!mapReady ? 'جاري تحميل الخريطة…' : 'جاري التحميل…'}
            </Text>
          </View>
        ) : null}
      </SafeAreaView>

      {selected ? (
        <SafeAreaView style={styles.cardSafe} edges={['bottom']} pointerEvents="box-none">
          <Pressable style={styles.resultCard} onPress={() => openProvider(selected.id)}>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {selected.businessName}
              </Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                {[selected.cityName ?? selected.city?.name, selected.addressDetails]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <View style={styles.cardFooter}>
                {selected.categoryName || selected.category?.name ? (
                  <Text style={styles.cardCat}>
                    {selected.categoryName ?? selected.category?.name}
                  </Text>
                ) : (
                  <View />
                )}
                {(() => {
                  const service = cheapestService(selected);
                  const price = service?.priceFrom ?? service?.basePrice;
                  return price != null ? (
                    <Text style={styles.cardPrice}>من {formatPrice(price)}</Text>
                  ) : null;
                })()}
              </View>
            </View>
            {selected.images?.[0] || selected.logoUrl ? (
              <Image
                source={{ uri: selected.images?.[0] ?? selected.logoUrl }}
                style={styles.cardImage}
              />
            ) : (
              <View style={[styles.cardImage, styles.cardImageFallback]}>
                <Ionicons name="business" size={22} color={theme.colors.primary} />
              </View>
            )}
          </Pressable>
        </SafeAreaView>
      ) : null}

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
  root: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  mapHost: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
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
  loadingPill: {
    alignSelf: 'center',
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  cardSafe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 96,
    paddingHorizontal: 14,
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
