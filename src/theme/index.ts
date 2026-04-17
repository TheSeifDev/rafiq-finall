import { colors } from './colors';
import { typography } from './typography';
import { spacing, radius } from './spacing';
import { shadows } from './shadows';

export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  /** Alias for textSecondary — used by legacy screens */
  subText: string;
  textDisabled: string;
  textInverse: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  border: string;
  statusSuccess: string;
  statusError: string;
  statusWarning: string;
  statusInfo: string;
  accentPurple: string;
  accentRed: string;
  accentCyan: string;
  accentGreen: string;
}

export const lightTheme: ThemeColors = {
  background: colors.background,
  surface: colors.surface,
  card: colors.card,
  text: colors.text.primary,
  textSecondary: colors.text.secondary,
  subText: colors.text.secondary,
  textDisabled: colors.text.disabled,
  textInverse: colors.text.inverse,
  primary: colors.primary,
  primaryDark: colors.primaryDark,
  primaryLight: colors.primaryLight,
  border: colors.border,
  statusSuccess: colors.status.success,
  statusError: colors.status.error,
  statusWarning: colors.status.warning,
  statusInfo: colors.status.info,
  accentPurple: colors.accent.purple,
  accentRed: colors.accent.red,
  accentCyan: colors.accent.cyan,
  accentGreen: colors.accent.green,
};

export const darkTheme: ThemeColors = {
  background: colors.backgroundDark,
  surface: colors.surfaceDark,
  card: colors.cardDark,
  text: colors.text.primaryDark,
  textSecondary: colors.text.secondaryDark,
  subText: colors.text.secondaryDark,
  textDisabled: colors.text.disabledDark,
  textInverse: colors.text.inverseDark,
  primary: colors.primary,
  primaryDark: colors.primaryDark,
  primaryLight: colors.primaryLight,
  border: colors.borderDark,
  statusSuccess: colors.status.success,
  statusError: colors.status.error,
  statusWarning: colors.status.warning,
  statusInfo: colors.status.info,
  accentPurple: colors.accent.purple,
  accentRed: colors.accent.red,
  accentCyan: colors.accent.cyan,
  accentGreen: colors.accent.green,
};

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  light: lightTheme,
  dark: darkTheme,
} as const;

export { colors, typography, spacing, radius, shadows };
export type { TypographyVariant } from './typography';
