import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  /** Extra space below focused field when keyboard is open. */
  keyboardBottomOffset?: number;
}

export function Screen({
  children,
  scroll = false,
  style,
  keyboardBottomOffset = 24,
}: ScreenProps) {
  const content = scroll ? (
    <KeyboardAwareScrollView
      contentContainerStyle={[styles.content, style]}
      bottomOffset={keyboardBottomOffset}
    >
      {children}
    </KeyboardAwareScrollView>
  ) : (
    <View style={[styles.content, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing.md,
  },
});
