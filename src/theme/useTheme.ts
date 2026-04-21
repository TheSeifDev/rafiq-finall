import { useMemo } from 'react';
import { darkColors, lightColors } from './index';
import { useAppStore } from '../store/app.store';

export function useTheme() {
  const darkMode = useAppStore((state) => state.darkMode);
  const language = useAppStore((state) => state.language);
  return useMemo(
    () => ({
      colors: darkMode ? darkColors : lightColors,
      isRTL: language === 'ar',
      language,
      darkMode,
    }),
    [darkMode, language],
  );
}
