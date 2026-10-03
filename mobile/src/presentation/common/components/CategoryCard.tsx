import { Image, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Category } from '../../../domain/model/Category';
import { theme } from '../../../core/ui/theme';

interface CategoryCardProps {
  category: Category;
  onPress?: (category: Category) => void;
}

export function CategoryCard({ category, onPress }: CategoryCardProps) {
  return (
    <Pressable style={styles.card} onPress={() => onPress?.(category)}>
      {category.iconUrl ? (
        <Image source={{ uri: category.iconUrl }} style={styles.icon} />
      ) : (
        <View style={styles.iconPlaceholder} />
      )}
      <Text style={styles.name} numberOfLines={2}>
        {category.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 100,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.md,
  },
  iconPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.border,
  },
  name: {
    ...theme.typography.caption,
    color: theme.colors.text,
    textAlign: 'center',
  },
});
