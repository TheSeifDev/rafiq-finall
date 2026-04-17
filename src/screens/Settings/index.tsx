import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, AppText, AppCard, Spacer, Divider } from '../../components/ui';
import { useTheme } from '../../store/ThemeContext';
import { useAuth } from '../../store/AuthContext';
import { spacing, radius } from '../../theme';
import { Routes } from '../../navigation/routes';
import type { ProfileStackScreenProps } from '../../types/navigation';

interface SettingItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  color?: string;
  destructive?: boolean;
}

function SettingItem({ icon, label, sublabel, onPress, color, destructive }: SettingItemProps) {
  const { colors } = useTheme();
  const iconColor = destructive ? colors.statusError : (color || colors.primary);

  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
      <MaterialCommunityIcons name="chevron-left" size={22} color={colors.textSecondary} />
      <View style={{ flex: 1, marginHorizontal: spacing.md }}>
        <AppText variant="body" color={destructive ? colors.statusError : colors.text}>
          {label}
        </AppText>
        {sublabel && (
          <AppText variant="caption" color={colors.textSecondary}>
            {sublabel}
          </AppText>
        )}
      </View>
      <View style={[styles.settingIcon, { backgroundColor: iconColor + '18' }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }: ProfileStackScreenProps<typeof Routes.Settings>) {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تسجيل الخروج',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  return (
    <Screen scrollable>
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <AppText variant="h2">الإعدادات</AppText>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-right" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Spacer size="lg" />

        {/* General Settings */}
        <AppText variant="label" color={colors.textSecondary}>
          عام
        </AppText>
        <Spacer size="sm" />
        <AppCard>
          <SettingItem
            icon="cog-outline"
            label="التفضيلات"
            sublabel="اللغة والمظهر"
            onPress={() => navigation.navigate(Routes.GeneralSettings)}
          />
          <Divider />
          <SettingItem
            icon="bell-outline"
            label="الإشعارات"
            sublabel="إدارة التنبيهات"
            onPress={() => {}}
          />
        </AppCard>

        <Spacer size="lg" />

        {/* Account */}
        <AppText variant="label" color={colors.textSecondary}>
          الحساب
        </AppText>
        <Spacer size="sm" />
        <AppCard>
          <SettingItem
            icon="shield-check-outline"
            label="الخصوصية والأمان"
            onPress={() => {}}
          />
          <Divider />
          <SettingItem
            icon="help-circle-outline"
            label="المساعدة والدعم"
            onPress={() => {}}
          />
        </AppCard>

        <Spacer size="lg" />

        {/* Logout */}
        <AppCard>
          <SettingItem
            icon="logout"
            label="تسجيل الخروج"
            onPress={handleLogout}
            destructive
          />
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
  settingItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
