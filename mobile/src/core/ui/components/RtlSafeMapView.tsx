import { forwardRef, type ComponentProps } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { UrlTile } from 'react-native-maps';
import { STREET_TILE_URL } from '../../../presentation/search/osmTiles';

/** Quiet Google Maps look — hide dense POI / transit clutter. */
export const CLEAN_GOOGLE_MAP_STYLE = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.station', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels',
    stylers: [{ visibility: 'simplified' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
];

type Props = ComponentProps<typeof MapView> & {
  /** Static preview inside ScrollView — required on Android or the surface stays blank. */
  preview?: boolean;
  /**
   * Overlay OSM tiles instead of the native Google basemap.
   * Default false — Google Maps stays clean; OSM overlays are dense/cluttered.
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
    customMapStyle,
    children,
    ...rest
  },
  ref,
) {
  const useStreetTiles = streetTiles ?? osmTiles ?? false;
  // liteMode skips UrlTile overlays on Android — never combine the two.
  const lite = preview && Platform.OS === 'android' && !useStreetTiles;

  return (
    <View collapsable={false} style={styles.host}>
      <MapView
        ref={ref}
        style={[styles.map, style]}
        liteMode={lite}
        mapType="standard"
        userInterfaceStyle="light"
        toolbarEnabled={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsTraffic={false}
        showsIndoors={false}
        customMapStyle={
          useStreetTiles ? customMapStyle : (customMapStyle ?? CLEAN_GOOGLE_MAP_STYLE)
        }
        {...rest}
      >
        {useStreetTiles ? (
          <UrlTile
            urlTemplate={STREET_TILE_URL}
            maximumZ={19}
            flipY={false}
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
    direction: 'ltr',
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
});
