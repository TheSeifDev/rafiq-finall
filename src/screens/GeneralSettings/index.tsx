import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, AppText, AppCard, Spacer, Divider } from '../../components/ui';
import { useTheme } from '../../store/ThemeContext';
import { spacing, radius } from '../../theme';
import { Routes } from '../../navigation/routes';
import type { ProfileStackScreenProps } from '../../types/navigation';

interface SettingRowProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  type?: 'toggle' | 'select';
  value?: boolean;
  onToggle?: () => void;
  subtitle?: string;
}

function SettingRow({ icon, label, type = 'select', value, onToggle, subtitle }: SettingRowProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.settingRow}>
      {type === 'toggle' ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          thumbColor={value ? colors.primary : colors.textDisabled}
          trackColor={{ false: colors.border, true: colors.primary + '60' }}
        />
      ) : subtitle ? (
        <AppText variant="caption" color={colors.textSecondary}>{subtitle}</AppText>
      ) : null}
      <View style={{ flex: 1, marginHorizontal: spacing.md }}>
        <AppText variant="body">{label}</AppText>
      </View>
      <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
        <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
      </View>
    </View>
  );
}

export default function GeneralSettingsScreen({ navigation }: ProfileStackScreenProps<typeof Routes.GeneralSettings>) {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  return (
    <Screen scrollable>
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <AppText variant="h2">التفضيلات العامة</AppText>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-right" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Spacer size="lg" />

        {/* Appearance */}
        <AppText variant="label" color={colors.textSecondary}>المظهر</AppText>
        <Spacer size="sm" />
        <AppCard>
          <SettingRow
            icon="weather-night"
            label="الوضع الداكن"
            type="toggle"
            value={isDarkMode}
            onToggle={toggleTheme}
          />
        </AppCard>

        <Spacer size="lg" />

        {/* Language */}
        <AppText variant="label" color={colors.textSecondary}>اللغة</AppText>
        <Spacer size="sm" />
        <AppCard>
          <SettingRow
            icon="translate"
            label="لغة التطبيق"
            subtitle="العربية"
          />
        </AppCard>

        <Spacer size="lg" />

        {/* About */}
        <AppText variant="label" color={colors.textSecondary}>حول التطبيق</AppText>
        <Spacer size="sm" />
        <AppCard>
          <SettingRow icon="information-outline" label="الإصدار" subtitle="2.0.0" />
          <Divider />
          <SettingRow icon="file-document-outline" label="سياسة الخصوصية" />
        </AppCard>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  settingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
