import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { theme } from '../../../core/ui/theme';

export function QuickFilterChips({
  labels = [],
  onSelect,
}: {
  labels?: string[];
  onSelect?: (label: string) => void;
}) {
  if (!labels.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
    >
      {labels.map((item) => (
        <Pressable
          key={item}
          style={styles.chip}
          onPress={() => onSelect?.(item)}
        >
          <Text style={styles.chipText}>{item}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  chip: {
    backgroundColor: theme.colors.mint,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.mintDark,
  },
  chipText: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
});
