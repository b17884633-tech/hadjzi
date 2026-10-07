import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../core/ui/theme';

export type HomeWhenFilter = 'any' | 'today' | 'tomorrow' | 'custom';

export function whenFilterLabel(when: HomeWhenFilter, customDate?: string): string {
  if (when === 'today') return 'اليوم';
  if (when === 'tomorrow') return 'غداً';
  if (when === 'custom' && customDate) return customDate;
  if (when === 'custom') return 'تاريخ مخصص';
  return 'أي وقت';
}

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  cityName: string;
  when: HomeWhenFilter;
  customDate?: string;
  onCityPress: () => void;
  onWhenPress: () => void;
  onSearch: () => void;
};

export function HomeSearchBar({
  query,
  onQueryChange,
  cityName,
  when,
  customDate,
  onCityPress,
  onWhenPress,
  onSearch,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={theme.colors.primary} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={onQueryChange}
          placeholder="ابحث عن خدمة، مكان، أو مدينة..."
          placeholderTextColor={theme.colors.textSecondary}
          returnKeyType="search"
          onSubmitEditing={onSearch}
          clearButtonMode="while-editing"
          textAlign="right"
        />
        <Ionicons name="mic-outline" size={18} color={theme.colors.textSecondary} />
      </View>

      <View style={styles.filters}>
        <Pressable style={styles.filterChip} onPress={onCityPress}>
          <Ionicons name="business-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.filterText} numberOfLines={1}>
            {cityName}
          </Text>
          <Ionicons name="chevron-down" size={13} color={theme.colors.textSecondary} />
        </Pressable>
        <Pressable style={styles.filterChip} onPress={onWhenPress}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.filterText} numberOfLines={1}>
            {whenFilterLabel(when, customDate)}
          </Text>
          <Ionicons name="chevron-down" size={13} color={theme.colors.textSecondary} />
        </Pressable>
        <Pressable style={styles.searchButton} onPress={onSearch}>
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
  input: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    paddingVertical: 0,
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
