import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

type Props = {
  latitude?: number | null;
  longitude?: number | null;
  label?: string;
  height?: number;
};

/** Static stand-in when native MapView cannot mount (missing Google Maps key). */
export function MapFallback({
  latitude,
  longitude,
  label = 'عرض الموقع على الخريطة',
  height = 160,
}: Props) {
  const openMaps = () => {
    if (latitude != null && longitude != null) {
      void Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      );
      return;
    }
    void Linking.openURL('https://www.google.com/maps');
  };

  return (
    <Pressable
      style={[styles.card, { height }]}
      onPress={openMaps}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="map-outline" size={28} color={theme.colors.primary} />
      </View>
      <Text style={styles.title}>{label}</Text>
      <Text style={styles.hint}>اضغط لفتح خرائط Google</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    backgroundColor: theme.colors.mint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6ECF3',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
