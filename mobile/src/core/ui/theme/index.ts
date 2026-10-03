import { colors } from './colors';
import { spacing, radius } from './spacing';
import { typography } from './typography';
import { CAIRO } from './fonts';

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  fonts: CAIRO,
} as const;

export type Theme = typeof theme;
export { CAIRO };
