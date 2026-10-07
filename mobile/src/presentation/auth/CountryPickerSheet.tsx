import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { SmoothBottomSheet } from '../../core/ui/components/SmoothBottomSheet';
import { theme } from '../../core/ui/theme';
import { Country, COUNTRIES } from './countries';

interface CountryPickerSheetProps {
  visible: boolean;
  selectedCode: string;
  onClose: () => void;
  onSelect: (country: Country) => void;
}

export function CountryPickerSheet({
  visible,
  selectedCode,
  onClose,
  onSelect,
}: CountryPickerSheetProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.nameAr.includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q.toLowerCase()),
    );
  }, [query]);

  return (
    <SmoothBottomSheet
      visible={visible}
      onClose={onClose}
      sheetStyle={styles.sheet}
    >
      <Text style={styles.title}>اختر الدولة</Text>

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="البحث عن دولة"
          placeholderTextColor={theme.colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          textAlign="right"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.code}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={16}
        windowSize={10}
        maxToRenderPerBatch={16}
        removeClippedSubviews
        getItemLayout={(_, index) => ({
          length: 53,
          offset: 53 * index,
          index,
        })}
        renderItem={({ item, index }) => {
          const selected = item.code === selectedCode;
          return (
            <Pressable
              style={[
                styles.row,
                index === 0 && item.code === 'YE' && !query ? styles.rowPinned : null,
                selected && styles.rowSelected,
              ]}
              onPress={() => {
                onSelect(item);
                onClose();
                setQuery('');
              }}
            >
              <Text style={styles.flag}>{item.flag}</Text>
              <Text style={styles.dial}>{item.dialCode}</Text>
              <Text style={styles.name}>{item.nameAr}</Text>
            </Pressable>
          );
        }}
      />
    </SmoothBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#F7F9FC',
    maxHeight: '72%',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    writingDirection: 'rtl',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4EAF2',
  },
  rowPinned: {
    borderBottomWidth: 2,
    borderBottomColor: '#D5DEE8',
  },
  rowSelected: {
    backgroundColor: theme.colors.tealLight,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  flag: { fontSize: 22 },
  dial: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    minWidth: 48,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
