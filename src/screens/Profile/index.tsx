import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, AppText, AppCard, Spacer, LoadingOverlay } from '../../components/ui';
import { useTheme } from '../../store/ThemeContext';
import { useAuth } from '../../store/AuthContext';
import { patientService } from '../../services/patient.service';
import { spacing, radius } from '../../theme';
import { Routes } from '../../navigation/routes';
import type { ProfileStackScreenProps, UserProfile } from '../../types';

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  colors: { textSecondary: string; text: string; primary: string };
}) {
  return (
    <View style={styles.infoRow}>
      <View style={{ flex: 1 }}>
        <AppText variant="caption" color={colors.textSecondary}>
          {label}
        </AppText>
        <AppText variant="body">{value}</AppText>
      </View>
      <View style={styles.infoIcon}>
        <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
      </View>
    </View>
  );
}

export default function ProfileScreen({ navigation }: ProfileStackScreenProps<typeof Routes.Profile>) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const data = await patientService.getProfile(user.id);
        setProfile(data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  if (loading) {
    return (
      <Screen>
        <LoadingOverlay label="جاري تحميل الملف الشخصي..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '18' }]}>
            <MaterialCommunityIcons name="account" size={48} color={colors.primary} />
          </View>
          <Spacer size="md" />
          <AppText variant="h2" align="center">
            {profile?.full_name || 'غير مسجل'}
          </AppText>
          <AppText variant="bodySmall" color={colors.textSecondary} align="center">
            {user?.email || ''}
          </AppText>
        </View>

        <Spacer size="xl" />

        {/* Info Cards */}
        <AppCard>
          <InfoRow icon="calendar" label="العمر" value={profile?.age || '--'} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow icon="water" label="فصيلة الدم" value={profile?.blood_type || '--'} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow icon="alert-circle-outline" label="الحساسية" value={profile?.allergies || 'لا يوجد'} colors={colors} />
        </AppCard>

        <Spacer size="lg" />

        {/* Settings shortcut */}
        <AppCard style={styles.settingsCard}>
          <View style={styles.settingsRow}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.textSecondary} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <AppText variant="label">الإعدادات</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                إدارة حسابك وتفضيلاتك
              </AppText>
            </View>
            <MaterialCommunityIcons name="cog-outline" size={24} color={colors.primary} />
          </View>
        </AppCard>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  settingsCard: {
    marginBottom: spacing.lg,
  },
  settingsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
});
