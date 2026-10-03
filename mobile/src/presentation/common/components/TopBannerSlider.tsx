import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Banner } from '../../../domain/model/Banner';
import { theme } from '../../../core/ui/theme';

interface TopBannerSliderProps {
  banners: Banner[];
  onPress?: (banner: Banner) => void;
}

export function TopBannerSlider({ banners, onPress }: TopBannerSliderProps) {
  if (!banners.length) return null;

  return (
    <FlatList
      horizontal
      data={banners}
      keyExtractor={(item) => String(item.id)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Pressable onPress={() => onPress?.(item)} style={styles.card}>
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
          <View style={styles.overlay}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  card: {
    width: 280,
    height: 140,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.primaryLight,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
    padding: theme.spacing.md,
  },
  title: {
    ...theme.typography.h3,
    color: '#FFFFFF',
  },
});
