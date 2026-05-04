export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48 } as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '800' as const },
  h1: { fontSize: 24, fontWeight: '700' as const },
  h2: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  '2xl': 28,
  full: 9999,
  // Backwards-compatible aliases
  card: 18,
  button: 14,
  input: 14,
} as const;

export const lightColors = {
  primary: '#00C2FF',
  secondary: '#00C2FF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#FF3B3B',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
};

export const darkColors = {
  primary: '#00C2FF',
  secondary: '#00C2FF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#FF3B3B',
  background: '#0A0F1C',
  surface: '#111827',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
};

export type ThemeColors = typeof lightColors;
