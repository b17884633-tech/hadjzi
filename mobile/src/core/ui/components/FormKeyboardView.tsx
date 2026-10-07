import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Header / status bar offset for iOS KeyboardAvoidingView. */
  keyboardVerticalOffset?: number;
};

/**
 * Wrap a full form screen (scroll + sticky footer) so the keyboard
 * lifts the whole layout — especially sticky save buttons — on iOS.
 * Android relies on `softwareKeyboardLayoutMode: "resize"`.
 */
export function FormKeyboardView({
  children,
  style,
  keyboardVerticalOffset = 0,
}: Props) {
  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
