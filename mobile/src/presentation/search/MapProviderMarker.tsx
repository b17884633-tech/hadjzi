import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Brand navy pins for facilities on the search / detail maps. */
export const MAP_PIN_NAVY = '#0D1B3E';
export const MAP_PIN_NAVY_DARK = '#061028';
export const MAP_PIN_COPPER = '#A8844F';

/** @deprecated Use MAP_PIN_NAVY */
export const MAP_PIN_TEAL = MAP_PIN_NAVY;
/** @deprecated Use MAP_PIN_NAVY_DARK */
export const MAP_PIN_TEAL_DARK = MAP_PIN_NAVY_DARK;

type Props = {
  selected?: boolean;
  /** Accent variant (e.g. selected / featured). */
  variant?: 'navy' | 'copper' | 'teal';
};

/** Teardrop pin with home glyph — navy by default. */
export function MapProviderMarker({
  selected = false,
  variant = 'navy',
}: Props) {
  const fill =
    variant === 'copper'
      ? MAP_PIN_COPPER
      : selected
        ? MAP_PIN_NAVY_DARK
        : MAP_PIN_NAVY;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.pin,
          { backgroundColor: fill },
          selected && styles.pinSelected,
        ]}
      >
        <Ionicons name="home" size={selected ? 16 : 14} color="#fff" />
      </View>
      <View style={[styles.tip, { borderTopColor: fill }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#0D1B3E',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pinSelected: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  tip: {
    marginTop: -3,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
