import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../core/ui/theme';

type Props = {
  label: string;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
};

/** Editable list of lines with a + button to append a new input row. */
export function DynamicLineList({
  label,
  hint,
  items,
  onChange,
  placeholder = 'أضف عنصراً…',
  addLabel = 'إضافة',
}: Props) {
  const updateAt = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };

  const removeAt = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addLine = () => {
    onChange([...items, '']);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable style={styles.addBtn} onPress={addLine} hitSlop={6}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addText}>{addLabel}</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.label}>{label}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
      </View>

      {items.length === 0 ? (
        <Pressable style={styles.empty} onPress={addLine}>
          <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.emptyText}>اضغط لإضافة سطر</Text>
        </Pressable>
      ) : (
        <View style={styles.list}>
          {items.map((item, index) => (
            <View key={`line-${index}`} style={styles.row}>
              <Pressable
                style={styles.removeBtn}
                onPress={() => removeAt(index)}
                hitSlop={8}
                accessibilityLabel="حذف"
              >
                <Ionicons name="close" size={16} color={theme.colors.error} />
              </Pressable>
              <TextInput
                style={styles.input}
                value={item}
                onChangeText={(t) => updateAt(index, t)}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.textSecondary}
                textAlign="right"
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: { flex: 1, gap: 2 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  hint: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
