import { useMemo, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import MapView, { Marker, type Region } from 'react-native-maps';
import { RtlSafeMapView } from '../../core/ui/components/RtlSafeMapView';
import { theme } from '../../core/ui/theme';
import { Provider } from '../../domain/model/Provider';
import { MapProviderMarker } from './MapProviderMarker';
import { centerForCityName, coordsForProvider } from './mapGeo';

type Props = {
  cityName: string;
  providers: Provider[];
  loading: boolean;
  onOpenProvider: (id: string) => void;
  header: ReactNode;
};

type PinPayload = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

const DEFAULT_DELTA = 0.08;

/**
 * Search map — same react-native-maps + street tiles stack as facility details
 * (WebView/Leaflet left a blank surface when layout fill styles broke).
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

  const pins: PinPayload[] = useMemo(
    () =>
      providers.map((p) => {
        const c = coordsForProvider(p, cityCenter);
        return {
          id: p.id,
          name: p.businessName,
          latitude: c.latitude,
          longitude: c.longitude,
        };
      }),
    [providers, cityCenter],
  );

  const initialRegion: Region = useMemo(() => {
    if (pins.length === 0) {
      return {
        latitude: cityCenter.latitude,
        longitude: cityCenter.longitude,
        latitudeDelta: DEFAULT_DELTA,
        longitudeDelta: DEFAULT_DELTA,
      };
    }
    if (pins.length === 1) {
      return {
        latitude: pins[0].latitude,
        longitude: pins[0].longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      };
    }
    let minLat = pins[0].latitude;
    let maxLat = pins[0].latitude;
    let minLng = pins[0].longitude;
    let maxLng = pins[0].longitude;
    for (const p of pins) {
      minLat = Math.min(minLat, p.latitude);
      maxLat = Math.max(maxLat, p.latitude);
      minLng = Math.min(minLng, p.longitude);
      maxLng = Math.max(maxLng, p.longitude);
    }
    const latPad = Math.max((maxLat - minLat) * 0.35, 0.02);
    const lngPad = Math.max((maxLng - minLng) * 0.35, 0.02);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.min(0.35, maxLat - minLat + latPad * 2),
      longitudeDelta: Math.min(0.35, maxLng - minLng + lngPad * 2),
    };
  }, [pins, cityCenter]);

  return (
    <View style={styles.root}>
      <View style={styles.mapHost} collapsable={false}>
        <RtlSafeMapView
          key={`${cityName}-${pins.length}`}
          ref={mapRef}
          streetTiles
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          showsCompass={false}
          showsUserLocation={false}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
        >
          {pins.map((p) => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.latitude, longitude: p.longitude }}
              title={p.name}
              onPress={() => onOpenProvider(p.id)}
              tracksViewChanges={false}
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
    ...StyleSheet.absoluteFill,
    backgroundColor: '#EEF2F6',
    overflow: 'hidden',
  },
  overlay: { ...StyleSheet.absoluteFill },
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
