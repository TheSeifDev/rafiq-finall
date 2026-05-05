// ─── Spacing ────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

// ─── Radius ─────────────────────────────────────────────────
export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  '2xl': 28,
  full: 9999,
  card: 18,
  button: 14,
  input: 14,
} as const;

// ─── Typography scale ────────────────────────────────────────
export const typography = {
  display: { fontSize: 32, fontWeight: '800' as const },
  h1: { fontSize: 24, fontWeight: '700' as const },
  h2: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
};

// ─── Dark Theme (primary/default) ───────────────────────────
export const darkColors = {
  // Backgrounds
  background:     '#0A0F1C',
  surface:        '#12182B',
  surfaceVariant: '#1A2238',

  // Brand
  primary:        '#00C2FF',
  primarySoft:    'rgba(0,194,255,0.10)',
  secondary:      '#1E3A8A',

  // Text
  textPrimary:    '#FFFFFF',
  textSecondary:  '#A0AEC0',

  // Borders
  border:         'rgba(255,255,255,0.08)',

  // Semantic
  success:        '#22C55E',
  warning:        '#F59E0B',
  danger:         '#FF3B3B',

  // Aliases (kept for backward compat)
  get danger_soft() { return 'rgba(255,59,59,0.12)'; },
  get success_soft() { return 'rgba(34,197,94,0.12)'; },
  get warning_soft() { return 'rgba(245,158,11,0.12)'; },
};

// ─── Light Theme (soft neutral alternative) ──────────────────
export const lightColors = {
  // Backgrounds
  background:     '#F0F4F8',
  surface:        '#FFFFFF',
  surfaceVariant: '#F5F8FB',

  // Brand (same — brand color stays consistent across modes)
  primary:        '#00C2FF',
  primarySoft:    'rgba(0,194,255,0.08)',
  secondary:      '#1E3A8A',

  // Text
  textPrimary:    '#1A202C',
  textSecondary:  '#718096',

  // Borders
  border:         'rgba(0,0,0,0.07)',

  // Semantic (same values — consistent semantic meaning)
  success:        '#22C55E',
  warning:        '#F59E0B',
  danger:         '#FF3B3B',

  // Aliases
  get danger_soft() { return 'rgba(255,59,59,0.10)'; },
  get success_soft() { return 'rgba(34,197,94,0.10)'; },
  get warning_soft() { return 'rgba(245,158,11,0.10)'; },
};

export type ThemeColors = typeof darkColors;
