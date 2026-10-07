import { useCallback, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import { theme } from '../theme';

type Props = {
  min: number;
  max: number;
  step?: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
  /** RTL: min thumb on the right, max thumb on the left */
  rtl?: boolean;
  minimumTrackColor?: string;
  maximumTrackColor?: string;
  lowThumbColor?: string;
  highThumbColor?: string;
};

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function snap(n: number, step: number) {
  if (step <= 0) return n;
  return Math.round(n / step) * step;
}

/**
 * Single-track dual-thumb range slider.
 * With `rtl`, the right side is the minimum and the left side is the maximum.
 */
export function DualRangeSlider({
  min,
  max,
  step = 1,
  low,
  high,
  onChange,
  rtl = true,
  minimumTrackColor = theme.colors.primary,
  maximumTrackColor = '#D8E2EA',
  lowThumbColor = theme.colors.primary,
  highThumbColor = theme.colors.accent,
}: Props) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const valuesRef = useRef({ low, high, min, max, step, rtl });
  valuesRef.current = { low, high, min, max, step, rtl };

  const activeThumb = useRef<'low' | 'high' | null>(null);

  const valueToX = useCallback((value: number, w: number) => {
    const { min: lo, max: hi, rtl: isRtl } = valuesRef.current;
    const span = hi - lo || 1;
    const ratio = (value - lo) / span;
    return isRtl ? (1 - ratio) * w : ratio * w;
  }, []);

  const xToValue = useCallback((x: number, w: number) => {
    const { min: lo, max: hi, step: s, rtl: isRtl } = valuesRef.current;
    const span = hi - lo || 1;
    const ratio = clamp(x / (w || 1), 0, 1);
    const raw = isRtl ? lo + (1 - ratio) * span : lo + ratio * span;
    return clamp(snap(raw, s), lo, hi);
  }, []);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const w = widthRef.current;
          const x = evt.nativeEvent.locationX;
          const lowX = valueToX(valuesRef.current.low, w);
          const highX = valueToX(valuesRef.current.high, w);
          activeThumb.current =
            Math.abs(x - lowX) <= Math.abs(x - highX) ? 'low' : 'high';
        },
        onPanResponderMove: (evt) => {
          const w = widthRef.current;
          if (!w || !activeThumb.current) return;
          const next = xToValue(evt.nativeEvent.locationX, w);
          const { low: curLow, high: curHigh } = valuesRef.current;
          if (activeThumb.current === 'low') {
            onChange(Math.min(next, curHigh), curHigh);
          } else {
            onChange(curLow, Math.max(next, curLow));
          }
        },
        onPanResponderRelease: () => {
          activeThumb.current = null;
        },
        onPanResponderTerminate: () => {
          activeThumb.current = null;
        },
      }),
    [onChange, valueToX, xToValue],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  };

  const lowX = width ? valueToX(low, width) : 0;
  const highX = width ? valueToX(high, width) : 0;
  const fillLeft = Math.min(lowX, highX);
  const fillWidth = Math.abs(highX - lowX);

  return (
    <View style={styles.wrap} onLayout={onLayout} {...pan.panHandlers}>
      <View style={[styles.track, { backgroundColor: maximumTrackColor }]} />
      {width > 0 ? (
        <View
          style={[
            styles.fill,
            {
              left: fillLeft,
              width: Math.max(fillWidth, 2),
              backgroundColor: minimumTrackColor,
            },
          ]}
        />
      ) : null}
      {width > 0 ? (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.thumb,
              {
                left: lowX - THUMB / 2,
                backgroundColor: lowThumbColor,
                borderColor: '#fff',
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.thumb,
              {
                left: highX - THUMB / 2,
                backgroundColor: highThumbColor,
                borderColor: '#fff',
              },
            ]}
          />
        </>
      ) : null}
    </View>
  );
}

const THUMB = 24;

const styles = StyleSheet.create({
  wrap: {
    height: 36,
    justifyContent: 'center',
    width: '100%',
  },
  track: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  fill: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    top: (36 - THUMB) / 2,
    borderWidth: 3,
    elevation: 3,
    shadowColor: '#0D1B3E',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
