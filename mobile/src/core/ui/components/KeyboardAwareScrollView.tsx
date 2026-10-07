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

type ScrollResponder = {
  scrollResponderScrollNativeHandleToKeyboard?: (
    nodeHandle: number,
    additionalOffset: number,
    preventNegativeScrollOffset: boolean,
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
    ...rest
  },
  ref,
) {
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollY = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const setRefs = useCallback(
    (node: ScrollView | null) => {
      scrollRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  const scrollFocusedIntoView = useCallback(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;

    const focused = TextInput.State.currentlyFocusedInput?.();
    if (!focused) return;

    const inputHandle = findNodeHandle(focused as never);
    if (inputHandle == null) return;

    const responder = (
      scroll as ScrollView & { getScrollResponder?: () => ScrollResponder }
    ).getScrollResponder?.();

    if (responder?.scrollResponderScrollNativeHandleToKeyboard) {
      responder.scrollResponderScrollNativeHandleToKeyboard(
        inputHandle,
        bottomOffset,
        true,
      );
      return;
    }

    const scrollHandle = findNodeHandle(scroll);
    if (scrollHandle == null) return;

    UIManager.measureInWindow(inputHandle, (_ix, iy, _iw, ih) => {
      UIManager.measureInWindow(scrollHandle, (_sx, sy, _sw, sh) => {
        const visibleBottom = sy + sh - bottomOffset;
        const inputBottom = iy + ih;
        const overflow = inputBottom - visibleBottom;
        if (overflow > 8) {
          scroll.scrollTo({
            y: Math.max(0, scrollY.current + overflow + 20),
            animated: true,
          });
        }
      });
    });
  }, [bottomOffset]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates?.height ?? 0;
      setKeyboardHeight(height);
      // Wait for padding layout, then scroll the focused field into view.
      const delay = Platform.OS === 'ios' ? 80 : 160;
      setTimeout(scrollFocusedIntoView, delay);
      setTimeout(scrollFocusedIntoView, delay + 120);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollFocusedIntoView]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.current = e.nativeEvent.contentOffset.y;
      onScroll?.(e);
    },
    [onScroll],
  );

  const mergedContentStyle = useMemo(() => {
    if (keyboardHeight <= 0) return contentContainerStyle;
    // Keyboard open: add enough bottom space so the last field can scroll up.
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
