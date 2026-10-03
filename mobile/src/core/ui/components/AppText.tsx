import { StyleSheet, Text as NativeText, TextProps, TextStyle } from 'react-native';
import { CAIRO } from '../theme/fonts';

export { CAIRO };

export function fontForWeight(weight: TextStyle['fontWeight'] | undefined): string {
  if (weight === '500') return CAIRO.medium;
  if (weight === '600') return CAIRO.semiBold;
  if (
    weight === 'bold' ||
    weight === '700' ||
    weight === '800' ||
    weight === '900'
  ) {
    return CAIRO.bold;
  }
  return CAIRO.regular;
}

/**
 * App-wide Arabic text pinned to the physical RIGHT edge.
 *
 * `direction: 'ltr'` on the Text freezes left/right as physical coordinates so
 * I18nManager / New Arch cannot re-flip textAlign. Glyphs still flow RTL via
 * writingDirection. Flex layout of parents stays forceRTL separately.
 */
export function AppText({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const fontFamily = flat?.fontFamily ?? fontForWeight(flat?.fontWeight);

  const {
    fontWeight: _fw,
    textAlign: requestedAlign,
    writingDirection: _wd,
    direction: _dir,
    ...restFlat
  } = flat ?? {};

  let textAlign: TextStyle['textAlign'] = 'right';
  if (requestedAlign === 'center' || requestedAlign === 'justify') {
    textAlign = requestedAlign;
  } else if (requestedAlign === 'left') {
    textAlign = 'left';
  }

  return (
    <NativeText
      {...props}
      style={[
        restFlat,
        {
          fontFamily,
          direction: 'ltr',
          writingDirection: 'rtl',
          textAlign,
        },
      ]}
    />
  );
}
