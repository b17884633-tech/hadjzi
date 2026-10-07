import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../core/ui/theme';

type Props = {
  selected?: boolean;
};

/** Navy pin with home glyph — matches the search map design. */
export function MapProviderMarker({ selected = false }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.pin, selected && styles.pinSelected]}>
        <Ionicons name="home" size={selected ? 16 : 14} color="#fff" />
      </View>
      <View style={[styles.tip, selected && styles.tipSelected]} />
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
    backgroundColor: theme.colors.primary,
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
    backgroundColor: theme.colors.accentDark,
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
    borderTopColor: theme.colors.primary,
  },
  tipSelected: {
    borderTopColor: theme.colors.accentDark,
  },
});
