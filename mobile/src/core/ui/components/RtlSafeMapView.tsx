import { forwardRef, type ComponentProps } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';

type Props = ComponentProps<typeof MapView> & {
  /** Static preview inside ScrollView — required on Android or the surface stays blank. */
  preview?: boolean;
};

/**
 * MapView under I18nManager.forceRTL often paints a blank surface when
 * scaleX hacks are applied. Keep the map in an LTR host with no transforms.
 */
export const RtlSafeMapView = forwardRef<MapView, Props>(function RtlSafeMapView(
  { style, preview = false, children, ...rest },
  ref,
) {
  return (
    <View collapsable={false} style={styles.host}>
      <MapView
        ref={ref}
        style={[styles.map, style]}
        // liteMode: Android MapView nested in ScrollView otherwise stays empty
        liteMode={preview && Platform.OS === 'android'}
        userInterfaceStyle="light"
        toolbarEnabled={false}
        {...rest}
      >
        {children}
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  host: {
    flex: 1,
    width: '100%',
    height: '100%',
    // Force LTR layout box so Google Maps lays out correctly under forceRTL
    direction: 'ltr',
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
