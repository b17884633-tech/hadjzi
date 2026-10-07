import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';

const SCREEN_H = Dimensions.get('window').height;
const OPEN_MS = 480;
const CLOSE_MS = 360;

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
  showHandle?: boolean;
};

/**
 * Bottom sheet with slow slide-up.
 * Full-screen dark scrim — tap outside closes.
 * Lifts above the keyboard so inputs stay visible.
 */
export function SmoothBottomSheet({
  visible,
  onClose,
  children,
  sheetStyle,
  showHandle = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8);
  const sheetFlat = StyleSheet.flatten(sheetStyle) ?? {};
  const contentBottomPad =
    typeof sheetFlat.paddingBottom === 'number' ? sheetFlat.paddingBottom : 16;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.setValue(0);
      keyboardOffset.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!mounted) return;

    keyboardOffset.setValue(0);
    Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates?.height ?? 0;
      Animated.timing(keyboardOffset, {
        toValue: height,
        duration: Platform.OS === 'ios' ? e.duration ?? 250 : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });

    const onHide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e.duration ?? 200 : 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [mounted, keyboardOffset]);

  const slideY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.min(SCREEN_H * 0.4, 320), 0],
  });

  // Open slide + lift above keyboard
  const translateY = Animated.subtract(slideY, keyboardOffset);

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.88],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root} collapsable={false}>
        <Animated.View
          pointerEvents="none"
          collapsable={false}
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        />

        <Pressable
          style={styles.dismissHit}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
          accessibilityRole="button"
          accessibilityLabel="إغلاق"
        />

        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            {
              // Content padding + system nav / home-indicator clearance
              paddingBottom: contentBottomPad + bottomPad,
              transform: [{ translateY }],
            },
          ]}
        >
          {showHandle ? <View style={styles.handle} /> : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#000000',
  },
  dismissHit: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    elevation: 24,
    zIndex: 2,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D5DEE8',
    marginBottom: 12,
  },
});
