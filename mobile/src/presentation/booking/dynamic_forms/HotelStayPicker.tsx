import { StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { theme } from '../../../core/ui/theme';

interface HotelStayPickerProps {
  checkIn?: string;
  checkOut?: string;
  nights?: number;
}

/** Read-only stay summary — date range is chosen on the calendar screen. */
export function HotelStayPicker({ checkIn, checkOut, nights }: HotelStayPickerProps) {
  if (!checkIn) return null;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>مدة الإقامة</Text>
      <Text style={styles.line}>الوصول: {checkIn}</Text>
      {checkOut ? <Text style={styles.line}>المغادرة: {checkOut}</Text> : null}
      {nights != null && nights > 0 ? (
        <Text style={styles.nights}>{nights} ليلة</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  line: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  nights: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.accentDark,
    textAlign: 'right',
  },
});
