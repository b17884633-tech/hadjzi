import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { SmoothBottomSheet } from '../../../core/ui/components/SmoothBottomSheet';
import { theme } from '../../../core/ui/theme';
import { Destination } from '../../../domain/model/Search';

interface CityPickerSheetProps {
  visible: boolean;
  cities: Destination[];
  selectedCityId?: number;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onSelect: (city: Destination) => void;
}

export function CityPickerSheet({
  visible,
  cities,
  selectedCityId,
  title = 'المدينة',
  subtitle = 'اختر المدينة التي تود استعراض المنشآت فيها',
  onClose,
  onSelect,
}: CityPickerSheetProps) {
  return (
    <SmoothBottomSheet
      visible={visible}
      onClose={onClose}
      sheetStyle={styles.sheet}
    >
      <View style={styles.heading}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} bounces={false}>
        {cities.map((city) => {
          const selected = city.id === selectedCityId;
          return (
            <Pressable
              key={city.id}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => {
                onSelect(city);
                onClose();
              }}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <Text style={[styles.cityName, selected && styles.cityNameSelected]}>
                {city.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SmoothBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxHeight: '52%',
  },
  heading: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
    width: '100%',
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    width: '100%',
    lineHeight: 20,
  },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8EDF5',
  },
  rowPressed: { opacity: 0.7 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: theme.colors.accent },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.accent,
  },
  cityName: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  cityNameSelected: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
