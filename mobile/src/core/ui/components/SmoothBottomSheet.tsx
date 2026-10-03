import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
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
 * Dimmed backdrop above the sheet — tap closes.
 * (Native blur is skipped: Modal content can't use expo-blur's blurTarget API.)
 */
export function SmoothBottomSheet({
  visible,
  onClose,
  children,
  sheetStyle,
  showHandle = true,
}: Props) {
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!mounted) return;

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

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.min(SCREEN_H * 0.4, 320), 0],
  });

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.dismissArea} onPress={onClose}>
          <Animated.View
            pointerEvents="none"
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </Pressable>

        <Animated.View
          style={[styles.sheet, sheetStyle, { transform: [{ translateY }] }]}
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
  },
  dismissArea: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 27, 62, 0.55)',
  },
  sheet: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    elevation: 16,
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
