/**
 * RAFIQ Healthcare Design System
 *
 * Unified tokens for spacing, typography, elevation, motion, and medical colors.
 * Provides consistency across all UI components and screens.
 */

// ─── Spacing ──────────────────────────────────────────────────────────────

export const spacing = {
  /** 0px */
  none: 0,
  /** 2px */
  xs: 2,
  /** 4px */
  sm: 4,
  /** 8px */
  md: 8,
  /** 12px */
  lg: 12,
  /** 16px */
  xl: 16,
  /** 20px */
  xxl: 20,
  /** 24px */
  '2xl': 24,
  /** 32px */
  '3xl': 32,
  /** 48px */
  '4xl': 48,
  /** 64px */
  '5xl': 64,
  /** 96px */
  '6xl': 96,
} as const;

export type SpacingKey = keyof typeof spacing;

// ─── Border Radius ────────────────────────────────────────────────────────

export const radius = {
  /** 4px — buttons, chips */
  sm: 4,
  /** 8px — inputs */
  md: 8,
  /** 12px — cards */
  lg: 12,
  /** 16px — modals */
  xl: 16,
  /** 24px — large cards */
  xxl: 24,
  /** 9999px — pills */
  full: 9999,
  /** 50% — avatars */
  circle: '50%',
} as const;

export type RadiusKey = keyof typeof radius;

// ─── Typography ────────────────────────────────────────────────────────────

export const typography = {
  // Display — hero numbers, main stats
  display: {
    fontSize: 48,
    fontWeight: '800' as const,
    lineHeight: 56,
    letterSpacing: -1,
  },
  // Hero — screen titles
  hero: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  // Title — section headers, card titles
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  // Heading — subsection headers
  heading: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  // Body — main content
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    letterSpacing: 0,
  },
  // Body bold — emphasized content
  bodyBold: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: 0,
  },
  // Caption — secondary info, timestamps
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  // Label — form labels, badges
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  // Mono — code, diagnostic info
  mono: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 16,
    fontFamily: 'monospace',
  },
} as const;

// ─── Elevation / Shadow ──────────────────────────────────────────────────

export const elevation = {
  /** No shadow */
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  /** Subtle — flat cards */
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  /** Card — elevated cards */
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  /** Floating — FABs, modals */
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  /** Overlay — notifications, toasts */
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
} as const;

// ─── Motion / Animation ───────────────────────────────────────────────────

export const motion = {
  // Duration
  instant: 0,
  fast: 150,     // micro-interactions (toggle, hover)
  normal: 250,    // standard transitions
  slow: 400,      // complex animations
  slower: 600,    // page transitions

  // Spring configs
  spring: {
    gentle: {
      damping: 20,
      stiffness: 100,
      mass: 1,
    },
    normal: {
      damping: 15,
      stiffness: 200,
      mass: 1,
    },
    bouncy: {
      damping: 10,
      stiffness: 300,
      mass: 0.8,
    },
    stiff: {
      damping: 30,
      stiffness: 400,
      mass: 1.2,
    },
  },

  // Easing
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
} as const;

// ─── Medical Colors ────────────────────────────────────────────────────────

export const medicalColors = {
  // Vital status
  vital: {
    normal: '#10B981',      // Emerald — healthy, in-range
    elevated: '#F59E0B',   // Amber — slightly outside range
    warning: '#F97316',     // Orange — needs attention
    critical: '#EF4444',    // Red — emergency threshold
    degraded: '#6366F1',   // Indigo — degraded signal
    unknown: '#94A3B8',     // Slate — no data
  },

  // Medical category colors (used for health zones, chart fills)
  category: {
    heart: '#EF4444',       // Heart rate — red
    oxygen: '#00C2FF',     // SpO2 — cyan
    bloodPressure: '#8B5CF6', // BP — purple
    temperature: '#F97316', // Temperature — orange
    sleep: '#8B5CF6',       // Sleep — purple
    activity: '#F59E0B',    // Activity/steps — amber
    stress: '#EC4899',      // Stress — pink
    nutrition: '#22C55E',   // Nutrition — green
  },

  // Health zone backgrounds (for chart fills)
  zones: {
    critical: 'rgba(239, 68, 68, 0.08)',
    warning: 'rgba(249, 115, 22, 0.08)',
    normal: 'rgba(16, 185, 129, 0.08)',
    elevated: 'rgba(245, 158, 11, 0.08)',
  },

  // Confidence indicator colors
  confidence: {
    high: '#10B981',       // Green — high confidence
    medium: '#F59E0B',     // Amber — medium confidence
    low: '#EF4444',        // Red — low confidence
    unknown: '#94A3B8',    // Slate — unknown
  },

  // Chart gradients (for premium look)
  gradients: {
    heart: ['#EF4444', '#F87171'],
    spo2: ['#00C2FF', '#67E8F9'],
    sleep: ['#8B5CF6', '#A78BFA'],
    activity: ['#F59E0B', '#FBBF24'],
    wellness: ['#10B981', '#34D399'],
    critical: ['#EF4444', '#DC2626'],
  },

  // BLE signal quality
  signal: {
    excellent: '#10B981',
    good: '#22C55E',
    fair: '#F59E0B',
    poor: '#EF4444',
    unknown: '#94A3B8',
  },

  // Medical status badges
  badge: {
    normal: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981' },
    elevated: { bg: 'rgba(245, 158, 11, 0.12)', text: '#F59E0B' },
    critical: { bg: 'rgba(239, 68, 68, 0.12)', text: '#EF4444' },
    degraded: { bg: 'rgba(99, 102, 241, 0.12)', text: '#6366F1' },
    unknown: { bg: 'rgba(148, 163, 184, 0.12)', text: '#94A3B8' },
  },
} as const;

// ─── Common component tokens ─────────────────────────────────────────────────

export const components = {
  // Card
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },

  // Button primary
  buttonPrimary: {
    height: 50,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    fontWeight: '700' as const,
    fontSize: 16,
  },

  // Button secondary
  buttonSecondary: {
    height: 44,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontWeight: '600' as const,
    fontSize: 14,
  },

  // Input
  input: {
    height: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    borderWidth: 1.5,
  },

  // Icon button
  iconButton: {
    size: 40,
    borderRadius: radius.md,
    iconSize: 20,
  },

  // FAB
  fab: {
    size: 56,
    borderRadius: radius.full,
    iconSize: 24,
  },

  // Status pill
  pill: {
    height: 28,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    fontSize: 12,
    fontWeight: '600' as const,
  },
} as const;

// ─── Re-exports with convenience naming ────────────────────────────────────

export const designSystem = {
  spacing,
  radius,
  typography,
  elevation,
  motion,
  medicalColors,
  components,
};

export default designSystem;
