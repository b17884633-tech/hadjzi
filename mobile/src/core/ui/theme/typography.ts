import { TextStyle } from 'react-native';
import { CAIRO } from './fonts';

export const typography = {
  h1: {
    fontFamily: CAIRO.bold,
    fontSize: 28,
    fontWeight: '700' as TextStyle['fontWeight'],
  },
  h2: {
    fontFamily: CAIRO.semiBold,
    fontSize: 22,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  h3: {
    fontFamily: CAIRO.semiBold,
    fontSize: 18,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  body: {
    fontFamily: CAIRO.regular,
    fontSize: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  bodySmall: {
    fontFamily: CAIRO.regular,
    fontSize: 14,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  caption: {
    fontFamily: CAIRO.regular,
    fontSize: 12,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  button: {
    fontFamily: CAIRO.semiBold,
    fontSize: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
} as const;
