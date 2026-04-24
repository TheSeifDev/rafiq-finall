import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/ui/Screen';
import { AppText } from '../components/ui/AppText';
import { spacing } from '../theme';
import { useTheme } from '../theme/useTheme';
import { useAuthStore } from '../store/auth.store';
import { useAppStore } from '../store/app.store';
import { patientService, type PatientProfile } from '../services/patient.service';
import { translations } from '../constants/translations';
import type { ProfileStackScreenProps } from '../navigation/types';

type Props = ProfileStackScreenProps<'ProfileMain'>;

// ── Mock devices (future: fetch from device service) ──
const MOCK_DEVICES = [
  { id: '1', name: 'Raqeeb Gas Sensor', icon: 'flame-outline', type: 'gas', online: true, battery: 87, lastSync: '2 min ago', lastSyncAr: 'منذ ٢ دقيقة' },
  { id: '2', name: 'mmWave Motion Sensor', icon: 'radio-outline', type: 'motion', online: true, battery: 94, lastSync: '5 min ago', lastSyncAr: 'منذ ٥ دقائق' },
  { id: '3', name: 'Smart Watch', icon: 'watch-outline', type: 'wearable', online: false, battery: 23, lastSync: '3 hours ago', lastSyncAr: 'منذ ٣ ساعات' },
];

// ── Section Group ──
function SectionGroup({
  title,
  children,
  darkMode,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  darkMode: boolean;
  colors: any;
}) {
  const surfaceBg = darkMode ? 'rgba(30, 41, 59, 0.80)' : 'rgba(255, 255, 255, 0.92)';
  const borderColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={styles.sectionWrap}>
      <AppText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {title}
      </AppText>
      <View style={[styles.sectionCard, { backgroundColor: surfaceBg, borderColor }]}>
        {children}
      </View>
    </View>
  );
}

// ── Row Item ──
function SettingsRow({
  icon,
  iconColor,
  label,
  onPress,
  rightContent,
  showChevron = true,
  isDestructive = false,
  isLast = false,
  darkMode,
  colors,
}: {
  icon: string;
  iconColor?: string;
  label: string;
  onPress?: () => void;
  rightContent?: React.ReactNode;
  showChevron?: boolean;
  isDestructive?: boolean;
  isLast?: boolean;
  darkMode: boolean;
  colors: any;
}) {
  const dividerColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDestructive ? colors.danger : colors.textPrimary;
  const resolvedIconColor = isDestructive ? colors.danger : (iconColor ?? colors.primary);

  const content = (
    <View style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: dividerColor }]}>
      <View style={[styles.rowIconWrap, { backgroundColor: resolvedIconColor + '12' }]}>
        <Ionicons name={icon as any} size={18} color={resolvedIconColor} />
      </View>
      <AppText style={[styles.rowLabel, { color: textColor }]}>{label}</AppText>
      <View style={styles.rowRight}>
        {rightContent}
        {showChevron && !rightContent && (
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary + '60'} />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.6} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

// ── Device Card ──
function DeviceCard({
  device,
  darkMode,
  colors,
  isAr,
}: {
  device: typeof MOCK_DEVICES[0];
  darkMode: boolean;
  colors: any;
  isAr: boolean;
}) {
  const statusColor = device.online ? colors.success : colors.textSecondary;
  const statusLabel = device.online
    ? (isAr ? 'متصل' : 'Online')
    : (isAr ? 'غير متصل' : 'Offline');
  const surfaceBg = darkMode ? 'rgba(30, 41, 59, 0.60)' : 'rgba(248, 250, 252, 0.90)';

  return (
    <View style={[styles.deviceCard, { backgroundColor: surfaceBg }]}>
      <View style={[styles.deviceIconWrap, { backgroundColor: colors.primary + '10' }]}>
        <Ionicons name={device.icon as any} size={22} color={colors.primary} />
      </View>
      <View style={styles.deviceInfo}>
        <AppText style={[styles.deviceName, { color: colors.textPrimary }]}>
          {device.name}
        </AppText>
        <View style={styles.deviceMeta}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <AppText style={[styles.deviceMetaText, { color: colors.textSecondary }]}>
            {statusLabel}
          </AppText>
          <AppText style={[styles.deviceMetaText, { color: colors.textSecondary }]}>
            ·  {isAr ? device.lastSyncAr : device.lastSync}
          </AppText>
        </View>
      </View>
      {device.battery != null && (
        <View style={styles.batteryWrap}>
          <Ionicons
            name={device.battery > 50 ? 'battery-half-outline' : 'battery-dead-outline'}
            size={16}
            color={device.battery > 20 ? colors.success : colors.danger}
          />
          <AppText style={[styles.batteryText, { color: colors.textSecondary }]}>
            {device.battery}%
          </AppText>
        </View>
      )}
    </View>
  );
}

// ── Main Profile Screen ──
export function ProfileScreen({ navigation }: Props): React.JSX.Element {
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const { colors, darkMode, isRTL } = useTheme();
  const { language, darkMode: isDark, notificationPrefs, setDarkMode, setLanguage, setNotificationPrefs } = useAppStore();
  const t = translations[language] as any;
  const isAr = language === 'ar';

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!session?.user.id) return;
    const data = await patientService.getProfile(session.user.id);
    setProfile(data);
  }, [session?.user.id]);

  useEffect(() => {
    loadProfile().catch(() => undefined);
  }, [loadProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleSignOut = useCallback(() => {
    Alert.alert(
      t.logout,
      isAr ? 'هل تريد تسجيل الخروج؟' : 'Do you want to sign out?',
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.confirm, style: 'destructive', onPress: () => signOut() },
      ],
    );
  }, [signOut, t, isAr]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      t.deleteAccount,
      t.deleteAccountConfirm,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.confirm,
          style: 'destructive',
          onPress: () => {
            // Future: call delete account API
            signOut();
          },
        },
      ],
    );
  }, [signOut, t]);

  const avatarInitial = (profile?.full_name ?? session?.user.email ?? '?')[0]?.toUpperCase();

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ── User Header ── */}
        <View style={styles.userHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            <AppText style={[styles.avatarText, { color: colors.primary }]}>
              {avatarInitial}
            </AppText>
          </View>
          <View style={styles.userInfo}>
            <AppText style={[styles.userName, { color: colors.textPrimary }]}>
              {profile?.full_name ?? '—'}
            </AppText>
            <AppText style={[styles.userEmail, { color: colors.textSecondary }]}>
              {session?.user.email ?? '—'}
            </AppText>
            {profile?.phone && (
              <AppText style={[styles.userPhone, { color: colors.textSecondary }]}>
                {profile.phone}
              </AppText>
            )}
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('EmergencyProfile')}
            style={[styles.editBtn, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '25' }]}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
            <AppText style={[styles.editBtnText, { color: colors.primary }]}>
              {t.editProfile}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* ── Preferences ── */}
        <SectionGroup title={t.preferences} darkMode={darkMode} colors={colors}>
          <SettingsRow
            icon="moon-outline"
            iconColor="#7C3AED"
            label={t.darkMode}
            darkMode={darkMode}
            colors={colors}
            showChevron={false}
            rightContent={
              <Switch
                value={isDark}
                onValueChange={setDarkMode}
                trackColor={{ false: '#D1D5DB', true: colors.primary + '50' }}
                thumbColor={isDark ? colors.primary : '#F3F4F6'}
              />
            }
          />
          <SettingsRow
            icon="language-outline"
            iconColor="#0EA5E9"
            label={t.language}
            darkMode={darkMode}
            colors={colors}
            showChevron={false}
            rightContent={
              <View style={styles.langToggle}>
                <TouchableOpacity
                  onPress={() => setLanguage('ar')}
                  style={[styles.langBtn, language === 'ar' && { backgroundColor: colors.primary + '15' }]}
                >
                  <AppText style={[styles.langBtnText, { color: language === 'ar' ? colors.primary : colors.textSecondary }]}>
                    عربي
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setLanguage('en')}
                  style={[styles.langBtn, language === 'en' && { backgroundColor: colors.primary + '15' }]}
                >
                  <AppText style={[styles.langBtnText, { color: language === 'en' ? colors.primary : colors.textSecondary }]}>
                    EN
                  </AppText>
                </TouchableOpacity>
              </View>
            }
          />
          <SettingsRow
            icon="notifications-outline"
            iconColor="#F59E0B"
            label={t.medReminders}
            darkMode={darkMode}
            colors={colors}
            showChevron={false}
            rightContent={
              <Switch
                value={notificationPrefs.medicationReminders}
                onValueChange={(v) => setNotificationPrefs({ medicationReminders: v })}
                trackColor={{ false: '#D1D5DB', true: colors.primary + '50' }}
                thumbColor={notificationPrefs.medicationReminders ? colors.primary : '#F3F4F6'}
              />
            }
          />
          <SettingsRow
            icon="pulse-outline"
            iconColor="#10B981"
            label={t.vitalsAlerts}
            darkMode={darkMode}
            colors={colors}
            isLast
            showChevron={false}
            rightContent={
              <Switch
                value={notificationPrefs.vitalsAlerts}
                onValueChange={(v) => setNotificationPrefs({ vitalsAlerts: v })}
                trackColor={{ false: '#D1D5DB', true: colors.primary + '50' }}
                thumbColor={notificationPrefs.vitalsAlerts ? colors.primary : '#F3F4F6'}
              />
            }
          />
        </SectionGroup>

        {/* ── Devices ── */}
        <SectionGroup title={t.devicesSection} darkMode={darkMode} colors={colors}>
          <View style={styles.devicesContainer}>
            {MOCK_DEVICES.map((device) => (
              <DeviceCard key={device.id} device={device} darkMode={darkMode} colors={colors} isAr={isAr} />
            ))}
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.addDeviceBtn, { borderColor: colors.primary + '30' }]}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <AppText style={[styles.addDeviceText, { color: colors.primary }]}>{t.addDevice}</AppText>
            </TouchableOpacity>
          </View>
        </SectionGroup>

        {/* ── Health Data ── */}
        <SectionGroup title={t.healthData} darkMode={darkMode} colors={colors}>
          <SettingsRow
            icon="medical-outline"
            iconColor="#10B981"
            label={t.medications}
            onPress={() => navigation.navigate('Medications')}
            darkMode={darkMode}
            colors={colors}
          />
          <SettingsRow
            icon="heart-outline"
            iconColor="#EF4444"
            label={t.vitals}
            onPress={() => {/* Navigate to vitals history */}}
            darkMode={darkMode}
            colors={colors}
            isLast
          />
        </SectionGroup>

        {/* ── Security ── */}
        <SectionGroup title={t.securitySection} darkMode={darkMode} colors={colors}>
          <SettingsRow
            icon="lock-closed-outline"
            iconColor="#7C3AED"
            label={t.changePassword}
            onPress={() => navigation.navigate('ChangePassword')}
            darkMode={darkMode}
            colors={colors}
          />
          <SettingsRow
            icon="shield-outline"
            iconColor="#0EA5E9"
            label={t.privacyLabel}
            onPress={() => navigation.navigate('Privacy')}
            darkMode={darkMode}
            colors={colors}
            isLast
          />
        </SectionGroup>

        {/* ── Account ── */}
        <SectionGroup title={t.accountSection} darkMode={darkMode} colors={colors}>
          <SettingsRow
            icon="log-out-outline"
            label={t.logout}
            onPress={handleSignOut}
            darkMode={darkMode}
            colors={colors}
            showChevron={false}
          />
          <SettingsRow
            icon="trash-outline"
            label={t.deleteAccount}
            onPress={handleDeleteAccount}
            isDestructive
            darkMode={darkMode}
            colors={colors}
            isLast
            showChevron={false}
          />
        </SectionGroup>

        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  // ── User Header ──
  userHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
  },
  userInfo: {
    alignItems: 'center',
    gap: 2,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '500',
  },
  userPhone: {
    fontSize: 13,
    fontWeight: '500',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // ── Sections ──
  sectionWrap: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // ── Rows ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: spacing.sm,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // ── Language toggle ──
  langToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // ── Devices ──
  devicesContainer: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 14,
    gap: spacing.sm,
  },
  deviceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: {
    flex: 1,
    gap: 2,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
  },
  deviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  deviceMetaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  batteryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  batteryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addDeviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addDeviceText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
