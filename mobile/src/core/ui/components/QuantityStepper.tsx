import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

type Props = {
  label: string;
  value?: number;
  onChange: (value?: number) => void;
  step?: number;
  min?: number;
};

function toAsciiDigits(raw: string): string {
  return raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[^\d]/g, '');
}

/** Label on top, +/- controls below — avoids long Arabic labels colliding with buttons. */
export function QuantityStepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
}: Props) {
  const current = value ?? min;
  const [text, setText] = useState(String(current));

  useEffect(() => {
    setText(String(value ?? min));
  }, [value, min]);

  const commitText = (raw: string) => {
    const cleaned = toAsciiDigits(raw);
    if (cleaned === '') {
      const fallback = min > 0 ? min : undefined;
      setText(String(fallback ?? 0));
      onChange(fallback);
      return;
    }
    const n = parseInt(cleaned, 10);
    if (!Number.isFinite(n)) {
      setText(String(value ?? min));
      return;
    }
    const clamped = Math.max(min, n);
    setText(String(clamped));
    onChange(min > 0 ? clamped : clamped === 0 ? undefined : clamped);
  };

  const bump = (delta: number) => {
    const next = Math.max(min, current + delta);
    onChange(min > 0 ? next : next === 0 ? undefined : next);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <Pressable style={styles.btn} hitSlop={10} onPress={() => bump(step)}>
          <Ionicons name="add" size={20} color={theme.colors.primary} />
        </Pressable>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={(t) => setText(toAsciiDigits(t))}
          onBlur={() => commitText(text)}
          onSubmitEditing={() => commitText(text)}
          keyboardType="number-pad"
          selectTextOnFocus
          textAlign="center"
          maxLength={4}
        />
        <Pressable style={styles.btn} hitSlop={10} onPress={() => bump(-step)}>
          <Ionicons name="remove" size={20} color={theme.colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    direction: 'ltr',
    alignSelf: 'stretch',
  },
  btn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  input: {
    minWidth: 64,
    width: 72,
    height: 42,
    paddingHorizontal: 8,
    paddingVertical: 0,
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
