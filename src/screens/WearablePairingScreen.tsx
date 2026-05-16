/**
 * WearablePairingScreen — Health Connect Setup
 *
 * REPLACED fake BLE/QR pairing with real Android Health Connect onboarding.
 *
 * Oraimo Watch → Oraimo Health App → Health Connect → RAFIQ
 *
 * This screen:
 *  1. Checks Health Connect availability
 *  2. Guides user through Oraimo → Health Connect sync setup
 *  3. Requests read permissions
 *  4. Shows real permission status (no fake "connected" state)
 *  5. On permission grant, reads and saves real vitals to SQLite
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { AppText } from '../components/ui/AppText';
import { useTheme } from '../theme/useTheme';
import { useAppStore } from '../store/app.store';
import { useAuthStore } from '../store/auth.store';
import { spacing } from '../theme';
import {
  healthConnectService,
  type HealthConnectStatus,
  type PermissionStatus,
  type HealthPermission,
} from '../services/wearable/HealthConnectService';
import { vitalsService } from '../services/vitals.service';
import { patientService } from '../services/patient.service';

// ─── Onboarding step data ─────────────────────────────────────

interface OnboardingStep {
  icon: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  color: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: 'watch',
    titleAr: 'إقران ساعة Oraimo',
    titleEn: 'Pair your Oraimo Watch',
    descAr: 'افتح تطبيق Oraimo Health وأضف ساعتك من خلاله',
    descEn: 'Open the Oraimo Health app and add your Oraimo Watch Lite 5',
    color: '#6366F1',
  },
  {
    icon: 'sync',
    titleAr: 'مزامنة مع Health Connect',
    titleEn: 'Enable Health Connect Sync',
    descAr: 'في تطبيق Oraimo Health → الإعدادات → اسمح بمشاركة البيانات مع Health Connect',
    descEn: 'In Oraimo Health → Settings → allow data sharing to Health Connect',
    color: '#10B981',
  },
  {
    icon: 'shield-checkmark',
    titleAr: 'منح الصلاحيات لـ RAFIQ',
    titleEn: 'Grant RAFIQ Permissions',
    descAr: 'اضغط "منح الإذن" أدناه ليتمكن رافق من قراءة بياناتك الصحية',
    descEn: 'Tap "Grant Permission" below so RAFIQ can read your health data',
    color: '#3B82F6',
  },
];

const PERMISSION_LABELS: Record<HealthPermission, { ar: string; en: string }> = {
  HeartRate: { ar: 'معدل ضربات القلب', en: 'Heart Rate' },
  Steps: { ar: 'الخطوات', en: 'Steps' },
  OxygenSaturation: { ar: 'تشبع الأكسجين', en: 'Oxygen Saturation (SpO2)' },
  SleepSession: { ar: 'النوم', en: 'Sleep' },
  BloodPressure: { ar: 'ضغط الدم', en: 'Blood Pressure' },
  BodyTemperature: { ar: 'درجة الحرارة', en: 'Body Temperature' },
};

// ─── Permission Row ───────────────────────────────────────────

function PermissionRow({
  permission,
  status,
  isAr,
  colors,
}: {
  permission: HealthPermission;
  status: PermissionStatus;
  isAr: boolean;
  colors: any;
}) {
  const label = PERMISSION_LABELS[permission];
  const granted = status === 'granted';
  const icon = granted ? 'checkmark-circle' : 'ellipse-outline';
  const color = granted ? colors.success : colors.textSecondary;

  return (
    <View style={[pStyles.permRow, { borderColor: colors.border }]}>
      <Ionicons name={icon as any} size={18} color={color} />
      <AppText style={[pStyles.permLabel, { color: colors.textPrimary }]}>
        {isAr ? label.ar : label.en}
      </AppText>
      {granted && (
        <View style={[pStyles.grantedBadge, { backgroundColor: colors.success + '15' }]}>
          <AppText style={[pStyles.grantedText, { color: colors.success }]}>
            {isAr ? 'مُمنوح' : 'Granted'}
          </AppText>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export function WearablePairingScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { colors, isRTL } = useTheme();
  const language = useAppStore((s) => s.language);
  const session = useAuthStore((s) => s.session);
  const isAr = language === 'ar';

  const [hcStatus, setHcStatus] = useState<HealthConnectStatus>('unknown');
  const [permissions, setPermissions] = useState<Record<HealthPermission, PermissionStatus> | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAndroid = Platform.OS === 'android';

  // ── Check Health Connect status on mount ──────────────────

  const checkStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await healthConnectService.initialize();
      setHcStatus(status);
      if (status === 'available') {
        const perms = await healthConnectService.checkPermissions();
        setPermissions(perms);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // ── Request permissions ───────────────────────────────────

  const handleRequestPermissions = useCallback(async () => {
    setRequesting(true);
    setError(null);
    try {
      const perms = await healthConnectService.requestPermissions();
      setPermissions(perms);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRequesting(false);
    }
  }, []);

  // ── Sync real vitals → SQLite ─────────────────────────────

  const handleSync = useCallback(async () => {
    if (!session?.user.id) return;
    setSyncing(true);
    setError(null);
    setSyncedCount(null);
    try {
      const profile = await patientService.getProfile(session.user.id);
      if (!profile) throw new Error('Profile not found');

      const records = await healthConnectService.readAllVitals(profile.id, 7);
      let saved = 0;
      for (const record of records) {
        await vitalsService.saveVitals(record);
        saved++;
      }
      setSyncedCount(saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSyncing(false);
    }
  }, [session?.user.id]);

  // ── Open Health Connect app ───────────────────────────────

  const openHealthConnect = useCallback(() => {
    Linking.openURL('market://details?id=com.google.android.apps.healthdata').catch(() =>
      Linking.openURL(
        'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata',
      ),
    );
  }, []);

  // ── Permissions summary ───────────────────────────────────

  const allGranted =
    permissions != null &&
    Object.values(permissions).every((s) => s === 'granted');

  const someGranted =
    permissions != null &&
    Object.values(permissions).some((s) => s === 'granted');

  // ── Render ────────────────────────────────────────────────

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      <ScreenHeader
        title={isAr ? 'إعداد Health Connect' : 'Health Connect Setup'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[pStyles.content, { paddingBottom: 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Non-Android notice */}
        {!isAndroid && (
          <View style={[pStyles.banner, { backgroundColor: colors.warning + '14', borderColor: colors.warning + '40' }]}>
            <Ionicons name="warning-outline" size={20} color={colors.warning} />
            <AppText style={[pStyles.bannerText, { color: colors.warning }]}>
              {isAr
                ? 'Health Connect متاح على Android فقط.'
                : 'Health Connect is available on Android only.'}
            </AppText>
          </View>
        )}

        {/* Dev Build notice */}
        <View style={[pStyles.banner, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '25' }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <AppText style={[pStyles.bannerText, { color: colors.primary }]}>
            {isAr
              ? 'يتطلب هذا الاتصال Expo Dev Build — لا يعمل مع Expo Go.'
              : 'This integration requires an Expo Dev Build — Expo Go is not supported.'}
          </AppText>
        </View>

        {/* Health Connect status */}
        <View style={[pStyles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={pStyles.statusRow}>
            <View style={[pStyles.statusIcon, {
              backgroundColor: hcStatus === 'available' ? colors.success + '14' : colors.textSecondary + '14',
            }]}>
              <Ionicons
                name={hcStatus === 'available' ? 'heart-circle' : 'heart-circle-outline'}
                size={28}
                color={hcStatus === 'available' ? colors.success : colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={[pStyles.statusTitle, { color: colors.textPrimary }]}>
                {isAr ? 'Health Connect' : 'Health Connect'}
              </AppText>
              <AppText style={[pStyles.statusSub, { color: hcStatus === 'available' ? colors.success : colors.danger }]}>
                {loading ? (isAr ? 'جارٍ الفحص...' : 'Checking...') :
                  hcStatus === 'available' ? (isAr ? 'متاح ✓' : 'Available ✓') :
                  hcStatus === 'not_installed' ? (isAr ? 'غير مثبت' : 'Not installed') :
                  hcStatus === 'not_supported' ? (isAr ? 'غير مدعوم' : 'Not supported on this device') :
                  (isAr ? 'غير محدد' : 'Unknown')}
              </AppText>
            </View>
            {hcStatus === 'not_installed' && (
              <TouchableOpacity
                onPress={openHealthConnect}
                style={[pStyles.installBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <AppText style={pStyles.installBtnText}>
                  {isAr ? 'تثبيت' : 'Install'}
                </AppText>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Onboarding steps */}
        <AppText style={[pStyles.sectionTitle, { color: colors.textPrimary }]}>
          {isAr ? 'خطوات الإعداد' : 'Setup Steps'}
        </AppText>
        {STEPS.map((step, i) => (
          <View
            key={i}
            style={[pStyles.stepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[pStyles.stepNum, { backgroundColor: step.color + '15' }]}>
              <AppText style={[pStyles.stepNumText, { color: step.color }]}>{i + 1}</AppText>
            </View>
            <View style={[pStyles.stepIcon, { backgroundColor: step.color + '15' }]}>
              <Ionicons name={step.icon as any} size={22} color={step.color} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={[pStyles.stepTitle, { color: colors.textPrimary }]}>
                {isAr ? step.titleAr : step.titleEn}
              </AppText>
              <AppText style={[pStyles.stepDesc, { color: colors.textSecondary }]}>
                {isAr ? step.descAr : step.descEn}
              </AppText>
            </View>
          </View>
        ))}

        {/* Permissions section */}
        {hcStatus === 'available' && (
          <>
            <AppText style={[pStyles.sectionTitle, { color: colors.textPrimary }]}>
              {isAr ? 'صلاحيات البيانات الصحية' : 'Health Data Permissions'}
            </AppText>

            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : (
              <View style={[pStyles.permCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {permissions &&
                  (Object.entries(permissions) as [HealthPermission, PermissionStatus][]).map(([perm, status]) => (
                    <PermissionRow
                      key={perm}
                      permission={perm}
                      status={status}
                      isAr={isAr}
                      colors={colors}
                    />
                  ))}
              </View>
            )}

            {!allGranted && (
              <TouchableOpacity
                onPress={handleRequestPermissions}
                disabled={requesting}
                style={[pStyles.actionBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                {requesting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                    <AppText style={pStyles.actionBtnText}>
                      {isAr ? 'منح الإذن' : 'Grant Permission'}
                    </AppText>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Sync button — only if at least some permissions granted */}
            {someGranted && (
              <TouchableOpacity
                onPress={handleSync}
                disabled={syncing}
                style={[pStyles.actionBtn, { backgroundColor: colors.success }]}
                activeOpacity={0.8}
              >
                {syncing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="sync-outline" size={18} color="#fff" />
                    <AppText style={pStyles.actionBtnText}>
                      {isAr ? 'مزامنة البيانات الحقيقية' : 'Sync Real Health Data'}
                    </AppText>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Sync result */}
            {syncedCount !== null && (
              <View style={[pStyles.syncResult, {
                backgroundColor: syncedCount > 0 ? colors.success + '12' : colors.warning + '12',
                borderColor: syncedCount > 0 ? colors.success + '30' : colors.warning + '30',
              }]}>
                <Ionicons
                  name={syncedCount > 0 ? 'checkmark-circle' : 'information-circle'}
                  size={18}
                  color={syncedCount > 0 ? colors.success : colors.warning}
                />
                <AppText style={[pStyles.syncResultText, { color: colors.textPrimary }]}>
                  {syncedCount > 0
                    ? (isAr ? `تم حفظ ${syncedCount} سجل حقيقي` : `Saved ${syncedCount} real records`)
                    : (isAr
                        ? 'لا توجد بيانات حقيقية في Health Connect بعد.\nقم بمزامنة ساعة Oraimo مع تطبيق Oraimo Health أولاً.'
                        : 'No real data found in Health Connect yet.\nSync your Oraimo Watch with the Oraimo Health app first.')}
                </AppText>
              </View>
            )}
          </>
        )}

        {/* Error */}
        {error && (
          <View style={[pStyles.errorBox, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '30' }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <AppText style={[pStyles.errorText, { color: colors.danger }]}>{error}</AppText>
          </View>
        )}

        {/* Real data note */}
        <View style={[pStyles.noteCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <AppText style={[pStyles.noteText, { color: colors.textSecondary }]}>
            {isAr
              ? 'لا توجد بيانات صحية حقيقية\nقم بمزامنة Oraimo Health مع Health Connect\nثم اضغط "مزامنة البيانات الحقيقية"'
              : 'No real health data will be shown until:\n1. Oraimo Health syncs to Health Connect\n2. You tap "Sync Real Health Data"'}
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const pStyles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
  },
  statusCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusSub: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  installBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  installBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '800',
  },
  stepIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  stepDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  permCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  permLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  grantedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  grantedText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  syncResult: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  syncResultText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
  },
});

export default WearablePairingScreen;