import { forwardRef, type ComponentProps } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { UrlTile } from 'react-native-maps';
import { STREET_TILE_URL } from '../../../presentation/search/osmTiles';

type Props = ComponentProps<typeof MapView> & {
  /** Static preview inside ScrollView — required on Android or the surface stays blank. */
  preview?: boolean;
  /**
   * Overlay free light street tiles (Esri World Street Map).
   * Avoids Carto "API KEY REQUIRED" watermarks and blank Google SDK maps
   * when the project key is not baked into the binary.
   * Default true so maps always show a Google-like light basemap.
   */
  streetTiles?: boolean;
  /** @deprecated Use streetTiles — kept for call sites that still pass osmTiles. */
  osmTiles?: boolean;
};

/**
 * MapView under I18nManager.forceRTL often paints a blank surface when
 * scaleX hacks are applied. Keep the map in an LTR host with no transforms.
 */
export const RtlSafeMapView = forwardRef<MapView, Props>(function RtlSafeMapView(
  {
    style,
    preview = false,
    streetTiles,
    osmTiles,
    children,
    ...rest
  },
  ref,
) {
  const useStreetTiles = streetTiles ?? osmTiles ?? true;
  // liteMode skips UrlTile overlays on Android — never combine the two.
  const lite = preview && Platform.OS === 'android' && !useStreetTiles;

  return (
    <View collapsable={false} style={styles.host}>
      <MapView
        ref={ref}
        style={[styles.map, style]}
        liteMode={lite}
        userInterfaceStyle="light"
        toolbarEnabled={false}
        {...rest}
      >
        {useStreetTiles ? (
          <UrlTile
            urlTemplate={STREET_TILE_URL}
            maximumZ={19}
            flipY={false}
            // iOS: hide Apple base map under our tiles. Android ignores this.
            shouldReplaceMapContent={Platform.OS === 'ios'}
            tileSize={256}
            zIndex={-1}
          />
        ) : null}
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
    // Force LTR layout box so maps lay out correctly under forceRTL
    direction: 'ltr',
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
