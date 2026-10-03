/** Brand palette from Hadjzi logo: navy + gold */
export const colors = {
  primary: '#0D1B3E',
  primaryLight: '#162C5B',
  accent: '#C5A368',
  accentDark: '#A8844F',
  background: '#F0F4F8',
  surface: '#FFFFFF',
  mint: '#E3F2F7',
  mintDark: '#D4EBF2',
  text: '#0D1B3E',
  textSecondary: '#5C6B7A',
  textOnDark: '#FFFFFF',
  border: '#D8E2EA',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  overlay: 'rgba(13, 27, 62, 0.55)',
  heroNavy: '#0A1628',
  discount: '#E8912D',
  /**
   * Legacy “teal” tokens remapped to brand navy / gold
   * so auth + pickers match the logo instead of green.
   */
  teal: '#0D1B3E',
  tealLight: '#E8EEF8',
  tealBright: '#C5A368',
} as const;
