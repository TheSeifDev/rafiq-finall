import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { AppText } from './AppText';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/app.store';
import { translations } from '../../constants/translations';
import { spacing } from '../../theme';

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Vitals: { active: 'heart', inactive: 'heart-outline' },
  Emergency: { active: 'shield-checkmark', inactive: 'shield-checkmark-outline' },
  Chat: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  Profile: { active: 'person-circle', inactive: 'person-circle-outline' },
};

const TAB_KEYS: Record<string, keyof typeof translations['en']> = {
  Home: 'home',
  Vitals: 'vitals',
  Emergency: 'emergency',
  Chat: 'chat',
  Profile: 'profile',
};

export function BottomTabBar({ state, navigation }: BottomTabBarProps): React.JSX.Element {
  const { colors, darkMode } = useTheme();
  const language = useAppStore((s) => s.language);
  const t = translations[language];

  const tabBg = darkMode
    ? 'rgba(10, 15, 28, 0.97)'
    : 'rgba(255, 255, 255, 0.98)';
  const borderColor = darkMode
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(0, 0, 0, 0.06)';

  return (
    <View style={[styles.container, { backgroundColor: tabBg, borderTopColor: borderColor }]}>
      <View style={styles.inner}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icons = TAB_ICONS[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
          const iconName = isFocused ? icons.active : icons.inactive;
          const labelKey = TAB_KEYS[route.name];
          const label = labelKey ? (t as any)[labelKey] : route.name;

          const isEmergency = route.name === 'Emergency';
          const activeColor = isEmergency ? '#FF3B3B' : '#00C2FF';

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                if (!isFocused) {
                  navigation.navigate(route.name);
                }
              }}
              style={({ pressed }) => [
                styles.tab,
                pressed && styles.tabPressed,
              ]}
              android_ripple={{ color: activeColor + '20', borderless: true }}
            >
              {isEmergency ? (
                <View style={[styles.emergencyCircle, { backgroundColor: '#FF3B3B15' }]}>
                  <Ionicons
                    name={iconName}
                    size={22}
                    color={isFocused ? '#FF3B3B' : colors.textSecondary}
                  />
                </View>
              ) : (
                <Ionicons
                  name={iconName}
                  size={22}
                  color={isFocused ? '#00C2FF' : colors.textSecondary}
                />
              )}
              <AppText
                style={[
                  styles.label,
                  {
                    color: isEmergency
                      ? (isFocused ? '#FF3B3B' : colors.textSecondary)
                      : (isFocused ? '#00C2FF' : colors.textSecondary),
                    fontWeight: isFocused ? '700' : '500',
                  },
                ]}
              >
                {label}
              </AppText>
              {/* Active indicator bar */}
              {isFocused && !isEmergency && (
                <View style={[styles.activeBar, { backgroundColor: '#00C2FF' }]} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
    paddingTop: 8,
  },
  inner: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 3,
  },
  tabPressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  emergencyCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -2,
  },
  activeBar: {
    width: 16,
    height: 3,
    borderRadius: 2,
    marginTop: 3,
  },
});
