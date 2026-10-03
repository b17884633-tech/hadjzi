import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../core/ui/theme';
import { Category } from '../../../domain/model/Category';
import { visualForCategory } from '../categoryIcons';

const COLUMNS = 4;
const H_GAP = 8;
const V_GAP = 12;

interface CategoryScrollerProps {
  categories: Category[];
  title?: string;
  onCategoryPress?: (category: Category) => void;
}

export function CategoryScroller({
  categories,
  title = 'التصنيفات',
  onCategoryPress,
}: CategoryScrollerProps) {
  const { width: screenWidth } = useWindowDimensions();
  // Match HomeScreen horizontal padding (16)
  const gridWidth = screenWidth - 32;
  const cellWidth = (gridWidth - H_GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.marker} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.count}>{categories.length} تصنيف</Text>
      </View>

      <View style={styles.grid}>
        {categories.map((item) => {
          const remoteIcon =
            item.iconUrl && /^https?:\/\//i.test(item.iconUrl) ? item.iconUrl : null;
          const visual = visualForCategory(item.name);
          return (
            <Pressable
              key={String(item.id)}
              style={({ pressed }) => [
                styles.cell,
                { width: cellWidth },
                pressed && styles.pressed,
              ]}
              onPress={() => onCategoryPress?.(item)}
            >
              <View style={[styles.iconCircle, { backgroundColor: visual.bg }]}>
                {remoteIcon ? (
                  <Image source={{ uri: remoteIcon }} style={styles.iconImage} />
                ) : (
                  <Ionicons name={visual.icon} size={24} color={visual.fg} />
                )}
              </View>
              <Text style={styles.label} numberOfLines={2}>
                {item.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  marker: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
  },
  title: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '700',
  },
  count: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: H_GAP,
    rowGap: V_GAP,
  },
  cell: {
    alignItems: 'center',
    gap: 6,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 14,
    minHeight: 28,
    width: '100%',
  },
});
