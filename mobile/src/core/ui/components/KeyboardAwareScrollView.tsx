import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import {
  Dimensions,
  findNodeHandle,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  UIManager,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export type KeyboardAwareScrollViewProps = ScrollViewProps & {
  children?: ReactNode;
  /**
   * Extra space kept below the focused field (sticky footers, CTAs).
   * Default 24. Added on top of keyboard height while open.
   */
  bottomOffset?: number;
  /** Wrap content in KeyboardAvoidingView (iOS). Default true. */
  avoidKeyboard?: boolean;
  /** Offset for KeyboardAvoidingView (header / status bar). */
  keyboardVerticalOffset?: number;
  avoidStyle?: StyleProp<ViewStyle>;
};

type Measureable = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === 'function') ref(value);
  else (ref as { current: T | null }).current = value;
}

function basePaddingBottom(style: StyleProp<ViewStyle> | undefined): number {
  const flat = StyleSheet.flatten(style) ?? {};
  return typeof flat.paddingBottom === 'number' ? flat.paddingBottom : 0;
}

function measureInWindow(target: unknown): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
} | null> {
  return new Promise((resolve) => {
    if (
      target &&
      typeof (target as Measureable).measureInWindow === 'function'
    ) {
      (target as Measureable).measureInWindow((x, y, width, height) => {
        resolve({ x, y, width, height });
      });
      return;
    }

    const handle = findNodeHandle(target as never);
    if (handle == null) {
      resolve(null);
      return;
    }

    UIManager.measureInWindow(handle, (x, y, width, height) => {
      resolve({ x, y, width, height });
    });
  });
}

/**
 * ScrollView that keeps the focused TextInput above the soft keyboard.
 * Adds keyboard-height padding so the last field can actually scroll up.
 */
export const KeyboardAwareScrollView = forwardRef<
  ScrollView,
  KeyboardAwareScrollViewProps
>(function KeyboardAwareScrollView(
  {
    children,
    contentContainerStyle,
    bottomOffset = 24,
    avoidKeyboard = true,
    keyboardVerticalOffset = 0,
    avoidStyle,
    keyboardShouldPersistTaps = 'handled',
    keyboardDismissMode = Platform.OS === 'ios' ? 'interactive' : 'on-drag',
    onScroll,
    onContentSizeChange,
    ...rest
  },
  ref,
) {
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollY = useRef(0);
  const keyboardTopRef = useRef<number | null>(null);
  const keyboardHeightRef = useRef(0);
  const focusedRef = useRef<unknown>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const setRefs = useCallback(
    (node: ScrollView | null) => {
      scrollRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  const scrollFocusedIntoView = useCallback(async () => {
    const scroll = scrollRef.current;
    if (!scroll) return;

    const focused = TextInput.State.currentlyFocusedInput?.() ?? null;
    if (!focused) return;
    focusedRef.current = focused;

    const [inputBox, scrollBox] = await Promise.all([
      measureInWindow(focused),
      measureInWindow(scroll),
    ]);
    if (!inputBox || !scrollBox) return;

    const windowH = Dimensions.get('window').height;
    // Prefer live keyboard top from the event. Falls back to window bottom
    // when the keyboard is closed / unknown.
    const keyboardTop = keyboardTopRef.current ?? windowH;
    // Visible area is the scroll viewport clipped by the keyboard overlay.
    // (adjustResize shrinks the viewport; overlay mode leaves it full-height.)
    const visibleBottom =
      Math.min(scrollBox.y + scrollBox.height, keyboardTop) - bottomOffset;
    const visibleTop = scrollBox.y + 12;
    const inputBottom = inputBox.y + inputBox.height;
    const inputTop = inputBox.y;

    if (inputBottom > visibleBottom + 2) {
      const overflow = inputBottom - visibleBottom;
      scroll.scrollTo({
        y: Math.max(0, scrollY.current + overflow + 16),
        animated: true,
      });
      return;
    }

    if (inputTop < visibleTop) {
      scroll.scrollTo({
        y: Math.max(0, scrollY.current - (visibleTop - inputTop)),
        animated: true,
      });
    }
  }, [bottomOffset]);

  const scheduleScrollIntoView = useCallback(() => {
    // Footer hide / padding / resize settle at different times on Android.
    const delays =
      Platform.OS === 'ios' ? [40, 120, 280] : [60, 160, 320, 480];
    for (const delay of delays) {
      setTimeout(() => {
        void scrollFocusedIntoView();
      }, delay);
    }
  }, [scrollFocusedIntoView]);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates?.height ?? 0;
      const screenY = e.endCoordinates?.screenY;
      keyboardHeightRef.current = height;
      keyboardTopRef.current =
        typeof screenY === 'number' ? screenY : Dimensions.get('window').height - height;
      setKeyboardHeight(height);
      scheduleScrollIntoView();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      keyboardTopRef.current = null;
      focusedRef.current = null;
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scheduleScrollIntoView]);

  // Field switches while the keyboard stays open do not re-fire show events.
  useEffect(() => {
    if (keyboardHeight <= 0) return undefined;

    const id = setInterval(() => {
      const focused = TextInput.State.currentlyFocusedInput?.() ?? null;
      if (!focused || focused === focusedRef.current) return;
      focusedRef.current = focused;
      scheduleScrollIntoView();
    }, 200);

    return () => clearInterval(id);
  }, [keyboardHeight, scheduleScrollIntoView]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.current = e.nativeEvent.contentOffset.y;
      onScroll?.(e);
    },
    [onScroll],
  );

  const handleContentSizeChange = useCallback(
    (w: number, h: number) => {
      onContentSizeChange?.(w, h);
      if (keyboardHeightRef.current > 0) {
        void scrollFocusedIntoView();
      }
    },
    [onContentSizeChange, scrollFocusedIntoView],
  );

  const mergedContentStyle = useMemo(() => {
    if (keyboardHeight <= 0) return contentContainerStyle;
    // Extra bottom space so the last field can scroll above the keyboard.
    return [
      contentContainerStyle,
      {
        paddingBottom: Math.max(
          basePaddingBottom(contentContainerStyle),
          keyboardHeight + bottomOffset,
        ),
      },
    ];
  }, [contentContainerStyle, keyboardHeight, bottomOffset]);

  const scroll = (
    <ScrollView
      ref={setRefs}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode}
      contentContainerStyle={mergedContentStyle}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      onContentSizeChange={handleContentSizeChange}
      scrollEventThrottle={16}
      {...rest}
    >
      {children}
    </ScrollView>
  );

  if (!avoidKeyboard) return scroll;

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, avoidStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {scroll}
    </KeyboardAvoidingView>
  );
});
