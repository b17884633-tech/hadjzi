import { StyleSheet } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { TextField } from '../../core/ui/components/TextField';
import { Button } from '../../core/ui/components/Button';
import { SmoothBottomSheet } from '../../core/ui/components/SmoothBottomSheet';
import { theme } from '../../core/ui/theme';
import { SearchFilters } from '../../domain/model/Search';
import { useState } from 'react';

interface FiltersBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  initialFilters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
}

export function FiltersBottomSheet({
  visible,
  onClose,
  initialFilters,
  onApply,
}: FiltersBottomSheetProps) {
  const [cityId, setCityId] = useState(String(initialFilters.cityId ?? ''));
  const [categoryId, setCategoryId] = useState(String(initialFilters.categoryId ?? ''));
  const [date, setDate] = useState(initialFilters.date ?? '');
  const [time, setTime] = useState(initialFilters.time ?? '');

  return (
    <SmoothBottomSheet visible={visible} onClose={onClose} sheetStyle={styles.sheet}>
      <Text style={styles.title}>Filters</Text>

      <TextField
        label="City ID"
        value={cityId}
        onChangeText={setCityId}
        keyboardType="number-pad"
      />
      <TextField
        label="Category ID"
        value={categoryId}
        onChangeText={setCategoryId}
        keyboardType="number-pad"
      />
      <TextField label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <TextField label="Time (HH:mm)" value={time} onChangeText={setTime} />

      <Button
        label="Apply Filters"
        onPress={() =>
          onApply({
            cityId: cityId ? Number(cityId) : undefined,
            categoryId: categoryId ? Number(categoryId) : undefined,
            date: date || undefined,
            time: time || undefined,
          })
        }
      />
    </SmoothBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
});
