/**
 * Layout Constants — Production-grade spacing system
 * Used across all screens for consistent bottom spacing and safe areas
 */
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const layout = {
  // Screen padding
  screenHorizontal: 20,
  screenTop: 16,
  screenBottom: 40,

  // Card styling
  cardRadius: 20,
  cardPadding: 16,
  cardGap: 12,

  // Section spacing
  sectionGap: 24,
  sectionTitleGap: 12,

  // Button sizing
  buttonHeight: 52,
  buttonRadius: 14,
  buttonIconSize: 20,

  // Input sizing
  inputHeight: 52,
  inputRadius: 12,

  // Icon sizing
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  iconXl: 32,

  // Tab bar (controlled by navigationTheme)
  tabBarHeight: 60,
  tabIconSize: 22,
  tabLabelSize: 11,

  // Touch targets
  minTouchTarget: 44,

  // Device-specific adjustments
  isSmallScreen: SCREEN_WIDTH < 375,
  isLargeScreen: SCREEN_WIDTH > 414,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,

  // Aliases for common patterns
  screenHorizontal: layout.screenHorizontal,
  screenTop: layout.screenTop,
  screenBottom: layout.screenBottom,
  card: layout.cardPadding,
  section: layout.sectionGap,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;