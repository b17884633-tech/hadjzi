import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import MapView, { Marker, Region } from 'react-native-maps';
import { RtlSafeMapView } from '../../core/ui/components/RtlSafeMapView';
import { theme } from '../../core/ui/theme';
import { Provider } from '../../domain/model/Provider';
import { centerForCityName, coordsForProvider } from './mapGeo';
import { MapProviderMarker } from './MapProviderMarker';

type Props = {
  cityName: string;
  providers: Provider[];
  loading: boolean;
  onOpenProvider: (id: string) => void;
  header: ReactNode;
};

/**
 * Search map — light street basemap with teal facility pins.
 * Tapping a pin opens the facility detail page.
 */
export function SearchMapView({
  cityName,
  providers,
  loading,
  onOpenProvider,
  header,
}: Props) {
  const mapRef = useRef<MapView>(null);

  const cityCenter = useMemo(() => centerForCityName(cityName), [cityName]);

  const pins = useMemo(
    () =>
      providers.map((p) => ({
        provider: p,
        coords: coordsForProvider(p, cityCenter),
      })),
    [providers, cityCenter],
  );

  const region: Region = useMemo(
    () => ({
      latitude: cityCenter.latitude,
      longitude: cityCenter.longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    }),
    [cityCenter],
  );

  useEffect(() => {
    mapRef.current?.animateToRegion(region, 320);
  }, [cityName, region]);

  return (
    <View style={styles.root}>
      <View style={styles.mapHost}>
        <RtlSafeMapView
          key={cityName}
          ref={mapRef}
          streetTiles
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
          showsZoomControls={Platform.OS === 'android'}
          moveOnMarkerPress={false}
        >
          {pins.map(({ provider, coords }) => (
            <Marker
              key={provider.id}
              coordinate={coords}
              onPress={() => onOpenProvider(provider.id)}
              tracksViewChanges={Platform.OS === 'ios'}
              accessibilityLabel={provider.businessName}
            >
              <MapProviderMarker />
            </Marker>
          ))}
        </RtlSafeMapView>
      </View>

      <View style={styles.overlay} pointerEvents="box-none">
        {header}
        {loading ? (
          <View style={styles.loadingPill}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>جاري تحميل المنشآت…</Text>
          </View>
        ) : providers.length === 0 ? (
          <View style={styles.emptyPill}>
            <Text style={styles.emptyText}>لا توجد منشآت في هذه المدينة</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EEF2F6' },
  mapHost: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EEF2F6',
    overflow: 'hidden',
  },
  overlay: { ...StyleSheet.absoluteFillObject },
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
  emptyPill: {
    alignSelf: 'center',
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
