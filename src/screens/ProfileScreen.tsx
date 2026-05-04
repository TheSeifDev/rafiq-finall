import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { useDevicesStore, type Device, type DeviceType } from '../store/devices.store';
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

// ── Device helpers ──
const DEVICE_ICONS: Record<DeviceType, string> = { watch: 'watch-outline', gas: 'flame-outline', motion: 'radio-outline' };
const DEVICE_COLORS: Record<DeviceType, string> = { watch: '#0EA5E9', gas: '#F59E0B', motion: '#8B5CF6' };
const TYPE_OPTIONS: { key: DeviceType; labelAr: string; labelEn: string }[] = [
  { key: 'watch', labelAr: 'ساعة ذكية', labelEn: 'Smart Watch' },
  { key: 'gas', labelAr: 'حساس غاز', labelEn: 'Gas Sensor' },
  { key: 'motion', labelAr: 'حساس حركة', labelEn: 'Motion Sensor' },
];
function timeAgo(iso: string, isAr: boolean): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return isAr ? 'الآن' : 'Just now';
  if (m < 60) return isAr ? `منذ ${m} د` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return isAr ? `منذ ${h} س` : `${h}h ago`;
  return isAr ? `منذ ${Math.floor(h / 24)} ي` : `${Math.floor(h / 24)}d ago`;
}

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
function DeviceCard({
  device,
  darkMode,
  colors,
  isAr,
  onRename,
  onDelete,
  onToggle,
}: {
  device: Device;
  darkMode: boolean;
  colors: any;
  isAr: boolean;
  onRename: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const accent = DEVICE_COLORS[device.type] ?? colors.primary;
  const statusColor = device.isConnected ? colors.success : colors.textSecondary;
  const statusLabel = device.isConnected ? (isAr ? 'متصل' : 'Online') : (isAr ? 'غير متصل' : 'Offline');
  const surfaceBg = darkMode ? 'rgba(30, 41, 59, 0.60)' : 'rgba(248, 250, 252, 0.90)';

  const hasBattery = device.type === 'watch' && typeof device.battery === 'number';
  const batteryValue = hasBattery ? device.battery : null;

  const batIcon =
    batteryValue != null
      ? batteryValue > 75
        ? 'battery-full-outline'
        : batteryValue > 40
          ? 'battery-half-outline'
          : 'battery-dead-outline'
      : null;

  const batColor =
    batteryValue != null
      ? batteryValue > 20
        ? colors.success
        : colors.danger
      : null;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onLongPress={onRename}
      style={[styles.deviceCard, { backgroundColor: surfaceBg }]}
    >
      <View style={[styles.deviceIconWrap, { backgroundColor: accent + '15' }]}>
        <Ionicons name={DEVICE_ICONS[device.type] as any} size={22} color={accent} />
      </View>

      <View style={styles.deviceInfo}>
        <AppText style={[styles.deviceName, { color: colors.textPrimary }]}>{device.name}</AppText>
        <View style={styles.deviceMeta}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <AppText style={[styles.deviceMetaText, { color: colors.textSecondary }]}>{statusLabel}</AppText>
          <AppText style={[styles.deviceMetaText, { color: colors.textSecondary }]}>
            · {timeAgo(device.lastSeen, isAr)}
          </AppText>
        </View>
      </View>

      {hasBattery && batteryValue != null && batIcon && batColor ? (
        <View style={styles.batteryWrap}>
          <Ionicons name={batIcon as any} size={16} color={batColor} />
          <AppText style={[styles.batteryText, { color: colors.textSecondary }]}>{batteryValue}%</AppText>
        </View>
      ) : null}

      <View style={styles.deviceActions}>
        <TouchableOpacity
          hitSlop={8}
          onPress={onToggle}
          style={[
            styles.deviceActBtn,
            { backgroundColor: (device.isConnected ? colors.success : colors.textSecondary) + '12' },
          ]}
        >
          <Ionicons
            name={device.isConnected ? 'link' : 'unlink'}
            size={14}
            color={device.isConnected ? colors.success : colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={8}
          onPress={onDelete}
          style={[styles.deviceActBtn, { backgroundColor: colors.danger + '12' }]}
        >
          <Ionicons name="trash-outline" size={14} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Profile Screen ──
export function ProfileScreen({ navigation }: Props): React.JSX.Element {
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const { colors, darkMode, isRTL } = useTheme();
  const { language, darkMode: isDark, setDarkMode, setLanguage } = useAppStore();
  const t = translations[language] as any;
  const isAr = language === 'ar';

  // Devices store
  const { devices, addDevice, removeDevice, renameDevice, toggleConnection, _hydrate } = useDevicesStore();
  useEffect(() => { _hydrate(); }, []);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState<DeviceType>('watch');
  const [renameTarget, setRenameTarget] = useState<Device | null>(null);
  const [renameTxt, setRenameTxt] = useState('');

  const handleAddDevice = () => {
    if (!addName.trim()) return;
    addDevice(addName.trim(), addType);
    setAddName(''); setAddType('watch'); setShowAddModal(false);
  };
  const handleRenameSubmit = () => {
    if (renameTarget && renameTxt.trim()) renameDevice(renameTarget.id, renameTxt.trim());
    setRenameTarget(null); setRenameTxt('');
  };
  const handleDelete = (d: Device) => {
    Alert.alert(isAr ? 'حذف الجهاز' : 'Remove Device', isAr ? `هل تريد حذف "${d.name}"؟` : `Remove "${d.name}"?`, [
      { text: t.cancel, style: 'cancel' },
      { text: t.confirm, style: 'destructive', onPress: () => removeDevice(d.id) },
    ]);
  };

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
            label={t.notificationsLabel}
            onPress={() => (navigation as any).navigate('NotificationSettings')}
            darkMode={darkMode}
            colors={colors}
            isLast
          />
        </SectionGroup>

        {/* ── Devices ── */}
        <SectionGroup title={t.devicesSection} darkMode={darkMode} colors={colors}>
          <View style={styles.devicesContainer}>
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                darkMode={darkMode}
                colors={colors}
                isAr={isAr}
                onRename={() => { setRenameTarget(device); setRenameTxt(device.name); }}
                onDelete={() => handleDelete(device)}
                onToggle={() => toggleConnection(device.id)}
              />
            ))}
            {devices.length === 0 && (
              <View style={styles.emptyDevices}>
                <Ionicons name="hardware-chip-outline" size={28} color={colors.textSecondary + '50'} />
                <AppText style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {isAr ? 'لا يوجد أجهزة' : 'No devices added'}
                </AppText>
              </View>
            )}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowAddModal(true)}
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
        </SectionGroup>

        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>

      {/* ═══ ADD DEVICE MODAL ═══ */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: darkMode ? '#1E293B' : '#fff' }]} onPress={() => {}}>
            <AppText style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {isAr ? 'إضافة جهاز' : 'Add Device'}
            </AppText>
            <TextInput
              value={addName}
              onChangeText={setAddName}
              placeholder={isAr ? 'اسم الجهاز' : 'Device name'}
              placeholderTextColor={colors.textSecondary}
              style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.textSecondary + '30', backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : '#F8FAFC' }]}
            />
            <AppText style={[styles.modalSubLabel, { color: colors.textSecondary }]}>
              {isAr ? 'نوع الجهاز' : 'Device type'}
            </AppText>
            <View style={styles.typeRow}>
              {TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setAddType(opt.key)}
                  style={[styles.typeBtn, addType === opt.key && { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                >
                  <Ionicons name={DEVICE_ICONS[opt.key] as any} size={18} color={addType === opt.key ? colors.primary : colors.textSecondary} />
                  <AppText style={{ fontSize: 11, fontWeight: '700', color: addType === opt.key ? colors.primary : colors.textSecondary }}>
                    {isAr ? opt.labelAr : opt.labelEn}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={[styles.modalBtn, { backgroundColor: colors.textSecondary + '15' }]}>
                <AppText style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 14 }}>{t.cancel}</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddDevice} style={[styles.modalBtn, { backgroundColor: colors.primary }]}>
                <AppText style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{isAr ? 'إضافة' : 'Add'}</AppText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ═══ RENAME MODAL ═══ */}
      <Modal visible={renameTarget !== null} transparent animationType="fade" onRequestClose={() => setRenameTarget(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setRenameTarget(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: darkMode ? '#1E293B' : '#fff' }]} onPress={() => {}}>
            <AppText style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {isAr ? 'إعادة تسمية' : 'Rename Device'}
            </AppText>
            <TextInput
              value={renameTxt}
              onChangeText={setRenameTxt}
              placeholder={isAr ? 'الاسم الجديد' : 'New name'}
              placeholderTextColor={colors.textSecondary}
              autoFocus
              style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.textSecondary + '30', backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : '#F8FAFC' }]}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity onPress={() => setRenameTarget(null)} style={[styles.modalBtn, { backgroundColor: colors.textSecondary + '15' }]}>
                <AppText style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 14 }}>{t.cancel}</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRenameSubmit} style={[styles.modalBtn, { backgroundColor: colors.primary }]}>
                <AppText style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{isAr ? 'حفظ' : 'Save'}</AppText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  // ── Device actions ──
  deviceActions: {
    flexDirection: 'column',
    gap: 4,
    marginLeft: 4,
  },
  deviceActBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDevices: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: 8,
  },
  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '600',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(128,128,128,0.15)',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
