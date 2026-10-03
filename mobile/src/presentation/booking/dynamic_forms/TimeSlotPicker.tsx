import { StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { TextField } from '../../../core/ui/components/TextField';
import { theme } from '../../../core/ui/theme';

interface TimeSlotPickerProps {
  date: string;
  startTime: string;
  endTime: string;
  onDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
}

export function TimeSlotPicker({
  date,
  startTime,
  endTime,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
}: TimeSlotPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Time Slot</Text>
      <TextField label="Date (YYYY-MM-DD)" value={date} onChangeText={onDateChange} />
      <TextField label="Start (HH:mm)" value={startTime} onChangeText={onStartTimeChange} />
      <TextField label="End (HH:mm)" value={endTime} onChangeText={onEndTimeChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
});
