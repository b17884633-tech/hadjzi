import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';

type Props = {
  onPress?: () => void;
  color?: string;
  style?: ViewStyle;
  /** Soft shadow for overlays on photos */
  elevated?: boolean;
};

/** Rounded circular back control — use on every screen header. */
export function BackButton({
  onPress,
  color = theme.colors.primary,
  style,
  elevated = false,
}: Props) {
  const navigation = useNavigation();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        elevated && styles.elevated,
        pressed && styles.pressed,
        style,
      ]}
      onPress={onPress ?? (() => navigation.goBack())}
      accessibilityRole="button"
      accessibilityLabel="رجوع"
      hitSlop={6}
    >
      <Ionicons name="chevron-forward" size={22} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  elevated: {
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pressed: { opacity: 0.85 },
});
