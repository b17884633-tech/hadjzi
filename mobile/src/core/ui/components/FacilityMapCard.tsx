import { useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import MapView, { Marker } from 'react-native-maps';
import { openStreetMapUrl } from '../../maps/yemen';
import { theme } from '../theme';
import { RtlSafeMapView } from './RtlSafeMapView';

/** Classic Google-red pin for facility detail maps. */
const PIN_RED = '#EA4335';
const DEFAULT_DELTA = 0.012;
const MIN_DELTA = 0.002;
const MAX_DELTA = 0.08;
const ZOOM_FACTOR = 0.55;

type Props = {
  latitude: number;
  longitude: number;
  height?: number;
  /** Accessibility label for the tappable map. */
  label?: string;
};

/**
 * Facility address map — larger preview with +/- zoom (like Google Maps).
 * Tap outside the zoom controls opens Google Maps.
 */
export function FacilityMapCard({
  latitude,
  longitude,
  height = 240,
  label = 'فتح الموقع على الخريطة',
}: Props) {
  const mapRef = useRef<MapView>(null);
  const [delta, setDelta] = useState(DEFAULT_DELTA);

  const openExternal = () => {
    void Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    ).catch(() => {
      void Linking.openURL(openStreetMapUrl({ latitude, longitude }));
    });
  };

  const applyDelta = (next: number) => {
    const clamped = Math.min(MAX_DELTA, Math.max(MIN_DELTA, next));
    setDelta(clamped);
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: clamped,
        longitudeDelta: clamped,
      },
      220,
    );
  };

  const zoomIn = () => applyDelta(delta * ZOOM_FACTOR);
  const zoomOut = () => applyDelta(delta / ZOOM_FACTOR);

  return (
    <View style={[styles.card, { height }]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={openExternal}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <RtlSafeMapView
          ref={mapRef}
          preview
          streetTiles
          style={StyleSheet.absoluteFill}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          pointerEvents="none"
          showsZoomControls={false}
          showsCompass={false}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: DEFAULT_DELTA,
            longitudeDelta: DEFAULT_DELTA,
          }}
        >
          <Marker coordinate={{ latitude, longitude }} pinColor={PIN_RED} />
        </RtlSafeMapView>
      </Pressable>

      {/* Google-style +/- controls — bottom end (physical left under forceRTL = LTR host) */}
      <View style={styles.zoomWrap} pointerEvents="box-none">
        <View style={styles.zoomPill}>
          <Pressable
            style={styles.zoomBtn}
            onPress={zoomIn}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="تكبير"
          >
            <Text style={styles.zoomGlyph}>+</Text>
          </Pressable>
          <View style={styles.zoomDivider} />
          <Pressable
            style={styles.zoomBtn}
            onPress={zoomOut}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="تصغير"
          >
            <Text style={styles.zoomGlyph}>−</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: '#EEF2F6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    width: '100%',
  },
  zoomWrap: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    // Keep controls in LTR corner matching Google Maps (+/- bottom-right)
    direction: 'ltr',
  },
  zoomPill: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E6ED',
    overflow: 'hidden',
    shadowColor: '#0D1B3E',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  zoomBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E0E6ED',
  },
  zoomGlyph: {
    fontSize: 22,
    fontWeight: '400',
    color: '#3C4043',
    lineHeight: 26,
    includeFontPadding: false,
  },
});
