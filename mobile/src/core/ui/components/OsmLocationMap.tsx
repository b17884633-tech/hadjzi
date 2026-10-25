import { useMemo, useState } from 'react';
import {
  Image,
  Linking,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { openStreetMapUrl } from '../../maps/yemen';
import { latLngToTile, osmTileUrl } from '../../../presentation/search/osmTiles';
import { theme } from '../theme';

type Props = {
  latitude: number;
  longitude: number;
  height?: number;
  /** When true, tap opens OpenStreetMap in the browser. */
  openOnPress?: boolean;
  label?: string;
};

const TILE = 256;
const ZOOM = 15;
const RADIUS = 1; // 3×3 tiles

/**
 * Light OSM preview (no Google key). White Carto tiles + brand navy pin.
 * Pin is always centered — tiles are framed on the facility coordinates.
 */
export function OsmLocationMap({
  latitude,
  longitude,
  height = 160,
  openOnPress = true,
  label = 'فتح الموقع على الخريطة',
}: Props) {
  const [width, setWidth] = useState(0);

  const tiles = useMemo(() => {
    const { x: cx, y: cy } = latLngToTile(latitude, longitude, ZOOM);
    const list: { key: string; uri: string; col: number; row: number }[] = [];
    for (let row = -RADIUS; row <= RADIUS; row++) {
      for (let col = -RADIUS; col <= RADIUS; col++) {
        list.push({
          key: `${ZOOM}-${cx + col}-${cy + row}`,
          uri: osmTileUrl(ZOOM, cx + col, cy + row),
          col: col + RADIUS,
          row: row + RADIUS,
        });
      }
    }
    return list;
  }, [latitude, longitude]);

  const gridSize = (RADIUS * 2 + 1) * TILE;
  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const onPress = () => {
    if (!openOnPress) return;
    void Linking.openURL(openStreetMapUrl({ latitude, longitude }));
  };

  const body = (
    <View style={[styles.card, { height }]} onLayout={onLayout}>
      {width > 0 ? (
        <View
          style={[
            styles.tileGrid,
            {
              width: gridSize,
              height: gridSize,
              left: (width - gridSize) / 2,
              top: (height - gridSize) / 2,
            },
          ]}
        >
          {tiles.map((t) => (
            <Image
              key={t.key}
              source={{ uri: t.uri }}
              style={{
                position: 'absolute',
                width: TILE,
                height: TILE,
                left: t.col * TILE,
                top: t.row * TILE,
              }}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.pinCenter} pointerEvents="none">
        <View style={styles.pin}>
          <Ionicons name="home" size={14} color="#fff" />
        </View>
      </View>
    </View>
  );

  if (!openOnPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    backgroundColor: '#F4F7FA',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    width: '100%',
  },
  tileGrid: {
    position: 'absolute',
  },
  pinCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    // Nudge up so the pin tip sits on the center point
    paddingBottom: 18,
  },
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EA4335',
    borderWidth: 2.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D1B3E',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
});

