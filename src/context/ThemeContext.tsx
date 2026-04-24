/**
 * @deprecated — Legacy re-export. Use `useTheme` from `../../theme/useTheme` directly.
 * Kept as a compatibility shim for any remaining imports.
 */
export { useTheme } from '../theme/useTheme';

/** No-op ThemeProvider — the app uses Zustand for theme state */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return children as React.ReactElement;
}

import React from 'react';