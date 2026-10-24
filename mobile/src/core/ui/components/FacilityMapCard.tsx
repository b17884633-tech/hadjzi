import { Linking, Pressable, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { openStreetMapUrl } from '../../maps/yemen';
import { theme } from '../theme';
import { RtlSafeMapView } from './RtlSafeMapView';

/** Classic Google-red pin for facility detail maps. */
const PIN_RED = '#EA4335';

type Props = {
  latitude: number;
  longitude: number;
  height?: number;
  /** Accessibility label for the tappable map. */
  label?: string;
};

/**
 * Facility address map — light street basemap + red pin.
 * Tap opens Google Maps (no overlay button).
 */
export function FacilityMapCard({
  latitude,
  longitude,
  height = 180,
  label = 'فتح الموقع على الخريطة',
}: Props) {
  const openExternal = () => {
    void Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    ).catch(() => {
      void Linking.openURL(openStreetMapUrl({ latitude, longitude }));
    });
  };

  return (
    <Pressable
      style={[styles.card, { height }]}
      onPress={openExternal}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <RtlSafeMapView
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
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }}
      >
        <Marker coordinate={{ latitude, longitude }} pinColor={PIN_RED} />
      </RtlSafeMapView>
    </Pressable>
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
});
