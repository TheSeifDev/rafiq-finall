import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './ui/AppText';
import { useAppStore } from '../store/app.store';
import { useTheme } from '../theme/useTheme';

/**
 * Premium compact language + theme controls for auth screens.
 * Connects directly to the production Zustand `useAppStore` —
 * same store used by SettingsScreen. Persisted via AsyncStorage.
 */
export function AuthTopControls(): React.JSX.Element {
  const language = useAppStore((s) => s.language);
  const darkMode = useAppStore((s) => s.darkMode);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setDarkMode = useAppStore((s) => s.setDarkMode);
  const { colors } = useTheme();

  const pillBg = darkMode
    ? 'rgba(255, 255, 255, 0.07)'
    : 'rgba(0, 0, 0, 0.05)';
  const pillBorder = darkMode
    ? 'rgba(255, 255, 255, 0.10)'
    : 'rgba(0, 0, 0, 0.08)';
  const inactiveText = darkMode
    ? 'rgba(255, 255, 255, 0.40)'
    : 'rgba(0, 0, 0, 0.35)';
  const activeBg = darkMode
    ? 'rgba(0, 194, 255, 0.14)'
    : 'rgba(0, 119, 200, 0.10)';

  return (
    <View style={styles.container}>
      {/* ── Language pills ── */}
      <View style={[styles.pillGroup, { backgroundColor: pillBg, borderColor: pillBorder }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.pill, language === 'ar' && { backgroundColor: activeBg }]}
          onPress={() => setLanguage('ar')}
        >
          <AppText
            style={[
              styles.pillLabel,
              { color: language === 'ar' ? colors.secondary : inactiveText },
            ]}
          >
            ع
          </AppText>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: pillBorder }]} />

        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.pill, language === 'en' && { backgroundColor: activeBg }]}
          onPress={() => setLanguage('en')}
        >
          <AppText
            style={[
              styles.pillLabel,
              { color: language === 'en' ? colors.secondary : inactiveText },
            ]}
          >
            EN
          </AppText>
        </TouchableOpacity>
      </View>

      {/* ── Theme toggle ── */}
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.themeBtn, { backgroundColor: pillBg, borderColor: pillBorder }]}
        onPress={() => setDarkMode(!darkMode)}
      >
        <Ionicons
          name={darkMode ? 'sunny-outline' : 'moon-outline'}
          size={18}
          color={colors.secondary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },

  // ─── Language pill group ────────────────────────────
  pillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    height: 36,
  },
  pill: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 18,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ─── Theme button ──────────────────────────────────
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
