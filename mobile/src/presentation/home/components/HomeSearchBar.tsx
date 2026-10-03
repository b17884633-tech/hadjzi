import { Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../core/ui/theme';

interface HomeSearchBarProps {
  onSearchPress?: () => void;
}

export function HomeSearchBar({ onSearchPress }: HomeSearchBarProps) {
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.search} onPress={onSearchPress}>
        <Ionicons name="search" size={18} color={theme.colors.primary} />
        <Text style={styles.placeholder} numberOfLines={1}>
          ابحث عن خدمة، مكان، أو مدينة...
        </Text>
        <Ionicons name="mic-outline" size={18} color={theme.colors.textSecondary} />
      </Pressable>

      <View style={styles.filters}>
        <Pressable style={styles.filterChip}>
          <Ionicons name="business-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.filterText}>صنعاء</Text>
          <Ionicons name="chevron-down" size={13} color={theme.colors.textSecondary} />
        </Pressable>
        <Pressable style={styles.filterChip}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.filterText}>أي وقت</Text>
          <Ionicons name="chevron-down" size={13} color={theme.colors.textSecondary} />
        </Pressable>
        <Pressable style={styles.searchButton} onPress={onSearchPress}>
          <Ionicons name="search" size={15} color="#FFFFFF" />
          <Text style={styles.searchButtonText}>بحث</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    padding: 10,
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F3FC',
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 12,
    gap: 8,
  },
  placeholder: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  filters: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8EEFC',
    borderRadius: 8,
    height: 36,
    paddingHorizontal: 8,
    gap: 4,
  },
  filterText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 64,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  searchButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'right',
  },
});
