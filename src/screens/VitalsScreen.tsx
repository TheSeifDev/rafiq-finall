/**
 * VitalsScreen — Real Health Connect Dashboard
 *
 * FAKE BLE REMOVED. Data source: Android Health Connect only.
 * Connected state shown ONLY when Health Connect is available
 * AND real records exist in SQLite.
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ScrollView, View, StyleSheet, TouchableOpacity,
  Dimensions, ActivityIndicator, Alert, Animated, Easing,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/ui/Screen';
import { AppText } from '../components/ui/AppText';
import { useAuthStore } from '../store/auth.store';
import { useNavigation } from '@react-navigation/native';
import { patientService } from '../services/patient.service';
import { vitalsService, type VitalsRecord } from '../services/vitals.service';
import { healthConnectService } from '../services/wearable/HealthConnectService';
import { useLocale } from '../hooks/useLocale';
import { useTheme } from '../theme/useTheme';
import { spacing, radius } from '../theme';
import { logger } from '../lib/logger';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - spacing.lg * 2 - 24;

// ─── Heartbeat Pulse Animation ───────────────────────────────

function HeartbeatPulse({ bpm, color }: { bpm: number; color: string }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = 60000 / bpm;
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: interval * 0.15, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: interval * 0.85, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
    return () => scale.stopAnimation();
  }, [bpm, scale]);

  return (
    <Animated.View style={[s.pulseWrap, { transform: [{ scale }] }]}>
      <View style={[s.pulseRing, { borderColor: color + '30' }]} />
      <View style={[s.pulseCore, { backgroundColor: color + '18' }]}>
        <Ionicons name="heart" size={20} color={color} />
      </View>
    </Animated.View>
  );
}

// ─── Live Reading Card ─────────────────────────────────────────

function LiveVitalCard({ label, value, unit, icon, color, isAlert }: {
  label: string;
  value: string;
  unit: string;
  icon: string;
  color: string;
  isAlert?: boolean;
}) {
  return (
    <View style={[s.liveCard, { borderColor: isAlert ? color + '50' : color + '20' }]}>
      <View style={[s.liveCardIcon, { backgroundColor: color + '14' }]}>
        <Ionicons name={icon as any} size={14} color={color} />
      </View>
      <AppText style={s.liveCardLabel}>{label}</AppText>
      <View style={s.liveCardRow}>
        <AppText style={[s.liveCardValue, { color }]}>{value}</AppText>
        <AppText style={s.liveCardUnit}>{unit}</AppText>
      </View>
      {isAlert && (
        <View style={[s.liveCardAlert, { backgroundColor: color + '15' }]}>
          <Ionicons name="warning" size={10} color={color} />
          <AppText style={[s.liveCardAlertText, { color }]}>
            {value === '--' ? 'No data' : 'Alert'}
          </AppText>
        </View>
      )}
    </View>
  );
}

// ─── Device Status Card ────────────────────────────────────────

function DeviceCard({ name, connected, isSimulated, battery, signal, onConnect, onDisconnect, connecting, error, isAr }: {
  name: string | null;
  connected: boolean;
  isSimulated: boolean;
  battery: number | null;
  signal: string;
  onConnect: () => void;
  onDisconnect: () => void;
  connecting: boolean;
  error: string | null;
  isAr: boolean;
}) {
  const { colors } = useTheme();

  const signalColor = signal === 'excellent' || signal === 'good' ? colors.success
    : signal === 'fair' ? colors.warning : colors.textSecondary;
  const signalIcon = signal === 'excellent' || signal === 'good' ? 'wifi'
    : signal === 'fair' ? 'wifi' : 'wifi-outline';

  if (!connected) {
    return (
      <View style={[s.deviceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.deviceCardTop}>
          <View style={[s.deviceIconWrap, { backgroundColor: colors.primary + '14' }]}>
            <Ionicons name="watch-outline" size={22} color={colors.primary} />
          </View>
          <View style={s.deviceInfo}>
            <AppText style={[s.deviceName, { color: colors.textPrimary }]}>
              {isAr ? 'الساعة الذكية' : 'Smartwatch'}
            </AppText>
            <View style={s.deviceStatusRow}>
              <View style={[s.deviceDot, { backgroundColor: colors.textSecondary }]} />
              <AppText style={s.deviceStatusText}>
                {isAr ? 'غير متصلة' : 'Not connected'}
              </AppText>
            </View>
          </View>
        </View>

        {isSimulated && (
          <View style={[s.simBadge, { backgroundColor: colors.warning + '12' }]}>
            <Ionicons name="information-circle" size={12} color={colors.warning} />
            <AppText style={[s.simBadgeText, { color: colors.warning }]}>
              {isAr ? 'Demo mode (Expo Go)' : 'Demo mode — Expo Go'}
            </AppText>
          </View>
        )}

        {error && (
          <View style={[s.errorRow, { backgroundColor: colors.danger + '10' }]}>
            <Ionicons name="alert-circle" size={13} color={colors.danger} />
            <AppText style={[s.errorText, { color: colors.danger }]}>{error}</AppText>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onConnect}
          disabled={connecting}
          style={[s.connectBtn, { backgroundColor: colors.primary }]}>
          {connecting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="bluetooth-outline" size={17} color="#fff" />
              <AppText style={s.connectBtnText}>
                {isAr ? 'اتصال الساعة' : 'Connect Watch'}
              </AppText>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.deviceCard, { backgroundColor: colors.surface, borderColor: colors.success + '30' }]}>
      <View style={s.deviceCardTop}>
        <View style={[s.deviceIconWrap, { backgroundColor: colors.success + '14' }]}>
          <Ionicons name="watch" size={22} color={colors.success} />
        </View>
        <View style={s.deviceInfo}>
          <AppText style={[s.deviceName, { color: colors.textPrimary }]}>
            {name ?? (isAr ? 'الساعة الذكية' : 'Smartwatch')}
          </AppText>
          <View style={s.deviceStatusRow}>
            <View style={[s.deviceDot, { backgroundColor: colors.success }]} />
            <AppText style={[s.deviceStatusText, { color: colors.success }]}>
              {isAr ? 'متصلة' : 'Connected'}
            </AppText>
            {battery !== null && (
              <>
                <Ionicons name="battery-full" size={12} color={battery > 20 ? colors.success : colors.danger} />
                <AppText style={s.deviceBatteryText}>{battery}%</AppText>
              </>
            )}
          </View>
        </View>
        <View style={s.deviceSignal}>
          <Ionicons name={signalIcon as any} size={16} color={signalColor} />
        </View>
      </View>

      {isSimulated && (
        <View style={[s.simBadge, { backgroundColor: colors.warning + '12' }]}>
          <Ionicons name="information-circle" size={12} color={colors.warning} />
          <AppText style={[s.simBadgeText, { color: colors.warning }]}>
            {isAr ? 'بيانات محاكاة' : 'Simulated data'}
          </AppText>
        </View>
      )}

      <View style={s.deviceActions}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onDisconnect}
          style={[s.disconnectBtn, { borderColor: colors.danger + '40' }]}>
          <Ionicons name="power-outline" size={14} color={colors.danger} />
          <AppText style={[s.disconnectBtnText, { color: colors.danger }]}>
            {isAr ? 'قطع الاتصال' : 'Disconnect'}
          </AppText>
        </TouchableOpacity>
        <View style={[s.syncBadge, { backgroundColor: colors.success + '12' }]}>
          <View style={[s.syncDot, { backgroundColor: colors.success }]} />
          <AppText style={[s.syncBadgeText, { color: colors.success }]}>
            {isAr ? 'متزامن' : 'Synced'}
          </AppText>
        </View>
      </View>
    </View>
  );
}

// ─── Vitals Summary Row ─────────────────────────────────────────

function VitalsSummary({ label, avg, min, max, unit, color }: {
  label: string;
  avg: string | number;
  min: string | number;
  max: string | number;
  unit: string;
  color: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[s.summaryCard, { backgroundColor: colors.surfaceVariant }]}>
      <AppText style={[s.summaryLabel, { color: colors.textSecondary }]}>{label}</AppText>
      <View style={s.summaryRow}>
        <View style={s.summaryItem}>
          <AppText style={[s.summaryVal, { color: colors.success }]}>{min}{unit}</AppText>
          <AppText style={s.summarySub}>{'Min'}</AppText>
        </View>
        <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={s.summaryItem}>
          <AppText style={[s.summaryVal, { color }]}>{avg}{unit}</AppText>
          <AppText style={s.summarySub}>{'Avg'}</AppText>
        </View>
        <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={s.summaryItem}>
          <AppText style={[s.summaryVal, { color: colors.danger }]}>{max}{unit}</AppText>
          <AppText style={s.summarySub}>{'Max'}</AppText>
        </View>
      </View>
    </View>
  );
}

// ─── Recent Reading Item ───────────────────────────────────────

function RecentReading({ reading, isAr }: {
  reading: VitalsRecord;
  isAr: boolean;
}) {
  const { colors } = useTheme();
  const isAbnormal = (reading.heart_rate ?? 75) > 100 || (reading.oxygen_saturation ?? 98) < 95;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return isAr ? `منذ ${m} دقيقة` : `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return isAr ? `منذ ${h} ساعة` : `${h}h ago`;
    return isAr ? `منذ ${Math.floor(h / 24)} يوم` : `${Math.floor(h / 24)}d ago`;
  };

  return (
    <View style={[s.recentCard, {
      backgroundColor: colors.surface,
      borderColor: isAbnormal ? colors.warning + '40' : colors.border,
    }]}>
      <View style={[s.recentIcon, { backgroundColor: isAbnormal ? colors.warning + '14' : colors.primary + '14' }]}>
        <Ionicons name="heart-circle" size={18} color={isAbnormal ? colors.warning : colors.primary} />
      </View>
      <View style={s.recentInfo}>
        <AppText style={[s.recentMain, { color: colors.textPrimary }]} numberOfLines={1}>
          {[
            reading.heart_rate && `${reading.heart_rate} bpm`,
            reading.blood_pressure_systolic && `${reading.blood_pressure_systolic}/${reading.blood_pressure_diastolic} mmHg`,
            reading.oxygen_saturation && `${reading.oxygen_saturation}%`,
            reading.temperature && `${reading.temperature}°C`,
          ].filter(Boolean).join('  ·  ')}
        </AppText>
        <View style={s.recentMeta}>
          <AppText style={[s.recentDate, { color: colors.textSecondary }]}>
            {timeAgo(reading.recorded_at)}
          </AppText>
          {reading.source === 'bluetooth' && (
            <View style={[s.sourceBadge, { backgroundColor: colors.primary + '14' }]}>
              <Ionicons name="watch-outline" size={10} color={colors.primary} />
              <AppText style={[s.sourceText, { color: colors.primary }]}>
                {isAr ? 'ساعة' : 'Watch'}
              </AppText>
            </View>
          )}
        </View>
      </View>
      {isAbnormal && (
        <View style={[s.abnormalBadge, { backgroundColor: colors.warning + '14' }]}>
          <AppText style={[s.abnormalText, { color: colors.warning }]}>
            {isAr ? 'غير طبيعي' : 'Alert'}
          </AppText>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────

export function VitalsScreen(): React.JSX.Element {
  const { t, isRTL } = useLocale();
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session);
  const navigation = useNavigation<any>();

  const [records, setRecords] = useState<VitalsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [hcAvailable, setHcAvailable] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    try {
      setLoading(true);
      const profile = await patientService.getProfile(session.user.id);
      if (!profile) return;
      const data = await vitalsService.getVitalsHistory(profile.id);
      setRecords(data);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [session?.user.id]);

  useEffect(() => { load(); }, [load]);

  // Check Health Connect availability
  useEffect(() => {
    healthConnectService.initialize().then((status) => {
      setHcAvailable(status === 'available');
    }).catch(() => setHcAvailable(false));
  }, []);

  // Sync from Health Connect → SQLite
  const handleSync = useCallback(async () => {
    if (!session?.user.id) return;
    setSyncing(true);
    setError(null);
    try {
      const profile = await patientService.getProfile(session.user.id);
      if (!profile) throw new Error('Profile not found');
      const newRecords = await healthConnectService.readAllVitals(profile.id, 7);
      if (newRecords.length === 0) {
        setError(isRTL
          ? 'لا توجد بيانات صحية حقيقية\nقم بمزامنة Oraimo Health مع Health Connect'
          : 'No real health data found.\nSync Oraimo Health with Health Connect first.');
        return;
      }
      for (const r of newRecords) await vitalsService.saveVitals(r);
      setLastSync(Date.now());
      await load();
      logger.info('HealthConnect sync', { count: newRecords.length });
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }, [session?.user.id, isRTL, load]);

  // ═══════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════
  // PERIOD FILTERING LOGIC - TIMEZONE SAFE
  // Filter records based on selected period (Day/Week/Month)
  // Uses UTC timestamps for consistent filtering across timezones
  // ═══════════════════════════════════════════════════════════════
  const filteredRecords = useMemo(() => {
    const nowUTC = Date.now();

    // Calculate period start in UTC milliseconds
    let periodStartMs: number;
    switch (period) {
      case "day":
        periodStartMs = nowUTC - 24 * 60 * 60 * 1000;
        break;
      case "week":
        periodStartMs = nowUTC - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        periodStartMs = nowUTC - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        periodStartMs = nowUTC - 7 * 24 * 60 * 60 * 1000;
    }

    // Filter using UTC timestamps for timezone safety
    return records.filter((r) => {
      const recordTime = new Date(r.recorded_at).getTime();
      return recordTime >= periodStartMs && !isNaN(recordTime);
    });
  }, [records, period]);

  // Chart data - now uses filtered records
  const chartData = useMemo(() => {
    const sorted = [...filteredRecords].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );

    if (sorted.length < 2) {
      // Generate placeholder data based on period
      const placeholderCount = period === 'day' ? 6 : period === 'week' ? 7 : 10;
      return {
        labels: Array(placeholderCount).fill('--'),
        datasets: [{ data: Array(placeholderCount).fill(0), color: () => colors.danger, strokeWidth: 2 }],
      };
    }

    // Format labels based on period
    const formatDate = (date: string) => {
      const d = new Date(date);
      if (period === 'day') {
        return d.toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
      } else if (period === 'week') {
        return d.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { weekday: 'short' });
      } else {
        return d.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
      }
    };

    return {
      labels: sorted.map(r => formatDate(r.recorded_at)),
      datasets: [{
        data: sorted.map(r => r.heart_rate ?? 0),
        color: () => colors.danger,
        strokeWidth: 2
      }],
    };
  }, [filteredRecords, period, isRTL, colors]);

  // Calculate stats from filtered records
  const stats = useMemo(() => {
    const hrs = filteredRecords.map(r => r.heart_rate).filter((v): v is number => v != null);
    if (hrs.length === 0) return { avg: '--', min: '--', max: '--' };
    const avg = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length);
    return {
      avg: String(avg),
      min: String(Math.min(...hrs)),
      max: String(Math.max(...hrs))
    };
  }, [filteredRecords]);

  const periodLabel = isRTL
    ? { day: 'يوم', week: 'أسبوع', month: 'شهر' }
    : { day: 'Day', week: 'Week', month: 'Month' };

  // latest real reading from records
  const latestRecord = records[0] ?? null;
  const isConnected = hcAvailable && records.length > 0;

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <AppText style={[s.h1, { color: colors.textPrimary }]}>{t('vitalsTitle')}</AppText>
            <AppText style={[s.sub, { color: colors.textSecondary }]}>
              {isRTL ? 'مراقبة صحية حقيقية عبر Health Connect' : 'Real vitals via Health Connect'}
            </AppText>
          </View>
          <View style={[s.headerBadge, { backgroundColor: colors.danger + '14' }]}>
            <Ionicons name="pulse" size={20} color={colors.danger} />
          </View>
        </View>

        {/* ── Health Connect Status Card ── */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('WearablePairing')}
          style={[s.deviceCard, { backgroundColor: colors.surface, borderColor: isConnected ? colors.success + '30' : colors.border }]}
        >
          <View style={s.deviceCardTop}>
            <View style={[s.deviceIconWrap, { backgroundColor: (isConnected ? colors.success : colors.primary) + '14' }]}>
              <Ionicons name="heart-circle-outline" size={22} color={isConnected ? colors.success : colors.primary} />
            </View>
            <View style={s.deviceInfo}>
              <AppText style={[s.deviceName, { color: colors.textPrimary }]}>Health Connect</AppText>
              <View style={s.deviceStatusRow}>
                <View style={[s.deviceDot, { backgroundColor: isConnected ? colors.success : colors.textSecondary }]} />
                <AppText style={[s.deviceStatusText, { color: isConnected ? colors.success : colors.textSecondary }]}>
                  {isConnected
                    ? (isRTL ? 'متصل · بيانات حقيقية' : 'Connected · Real data')
                    : (isRTL ? 'اضغط لإعداد Health Connect' : 'Tap to setup Health Connect')}
                </AppText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </View>
          {lastSync && (
            <AppText style={[s.deviceStatusText, { color: colors.textSecondary, marginTop: 4 }]}>
              {isRTL ? `آخر مزامنة: ${new Date(lastSync).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}` : `Last sync: ${new Date(lastSync).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
            </AppText>
          )}
        </TouchableOpacity>

        {/* Sync button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSync}
          disabled={syncing}
          style={[s.connectBtn, { backgroundColor: colors.primary }]}
        >
          {syncing ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Ionicons name="sync-outline" size={16} color="#fff" />
              <AppText style={s.connectBtnText}>{isRTL ? 'مزامنة Health Connect' : 'Sync from Health Connect'}</AppText>
            </>
          )}
        </TouchableOpacity>

        {/* Error */}
        {error && (
          <View style={[s.errorRow, { backgroundColor: colors.warning + '10' }]}>
            <Ionicons name="information-circle" size={13} color={colors.warning} />
            <AppText style={[s.errorText, { color: colors.warning }]}>{error}</AppText>
          </View>
        )}

        {/* No data empty state */}
        {!loading && records.length === 0 && (
          <View style={[s.emptyChart, { height: 120 }]}>
            <Ionicons name="heart-dislike-outline" size={32} color={colors.textSecondary} />
            <AppText style={[s.emptyChartText, { color: colors.textPrimary }]}>
              {isRTL ? 'لا توجد بيانات صحية حقيقية' : 'No real health data'}
            </AppText>
            <AppText style={[s.deviceStatusText, { color: colors.textSecondary, textAlign: 'center' }]}>
              {isRTL ? 'قم بمزامنة Oraimo Health مع Health Connect' : 'Sync Oraimo Health with Health Connect'}
            </AppText>
          </View>
        )}

        {/* ── Latest Real Reading (from SQLite) ── */}
        {latestRecord && (
          <View style={s.liveSection}>
            <View style={s.liveSectionHeader}>
              <View style={s.liveSectionDot} />
              <AppText style={[s.liveSectionTitle, { color: colors.textPrimary }]}>
                {isRTL ? 'آخر قراءة حقيقية' : 'Latest Real Reading'}
              </AppText>
              <AppText style={s.liveSectionTime}>
                {latestRecord.recorded_at ? new Date(latestRecord.recorded_at).toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
              </AppText>
            </View>
            <View style={s.vitalsGrid}>
              <LiveVitalCard
                label={isRTL ? 'النبض' : 'Heart Rate'}
                value={latestRecord.heart_rate != null ? String(latestRecord.heart_rate) : '--'}
                unit="bpm" icon="heart" color={colors.danger}
                isAlert={(latestRecord.heart_rate ?? 0) > 100 || (latestRecord.heart_rate ?? 999) < 50}
              />
              <LiveVitalCard
                label={isRTL ? 'ضغط الدم' : 'Blood Pressure'}
                value={latestRecord.blood_pressure_systolic != null ? `${latestRecord.blood_pressure_systolic}/${latestRecord.blood_pressure_diastolic}` : '--'}
                unit="mmHg" icon="fitness" color={colors.warning}
                isAlert={(latestRecord.blood_pressure_systolic ?? 0) > 140}
              />
              <LiveVitalCard
                label={isRTL ? 'الأكسجين' : 'SpO2'}
                value={latestRecord.oxygen_saturation != null ? String(latestRecord.oxygen_saturation) : '--'}
                unit="%" icon="water" color={colors.primary}
                isAlert={(latestRecord.oxygen_saturation ?? 100) < 95}
              />
              <LiveVitalCard
                label={isRTL ? 'الحرارة' : 'Temp'}
                value={latestRecord.temperature != null ? String(latestRecord.temperature) : '--'}
                unit="°C" icon="thermometer" color={colors.success}
                isAlert={(latestRecord.temperature ?? 36) > 37.5}
              />
            </View>
          </View>
        )}

        {/* ═══ Period Filter ═══ */}
        <View style={s.periodRow}>
          {(['day', 'week', 'month'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              activeOpacity={0.7}
              onPress={() => setPeriod(p)}
              style={[
                s.periodChip,
                {
                  backgroundColor: period === p ? colors.primary : colors.surfaceVariant,
                  borderColor: period === p ? colors.primary : colors.border,
                },
                period === p && s.periodChipActive,
              ]}>
              {/* Active indicator dot */}
              {period === p && <View style={s.periodChipDot} />}

              <AppText style={[
                s.periodChipText,
                {
                  color: period === p ? '#FFFFFF' : colors.textSecondary,
                },
              ]}>
                {periodLabel[p]}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── History Chart ── */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.cardHeader}>
            <View style={[s.cardIcon, { backgroundColor: colors.danger + '14' }]}>
              <Ionicons name="analytics" size={16} color={colors.danger} />
            </View>
            <AppText style={[s.cardTitle, { color: colors.textPrimary }]}>
              {isRTL ? 'سجل النبض' : 'Heart Rate History'}
            </AppText>
          </View>

          {loading ? (
            <View style={s.chartLoading}><ActivityIndicator color={colors.primary} /></View>
          ) : filteredRecords.length >= 2 ? (
            <View style={{ marginHorizontal: -8 }}>
              <LineChart
                data={chartData}
                width={CHART_W}
                height={180}
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: colors.surface,
                  backgroundGradientTo: colors.surface,
                  decimalPlaces: 0,
                  color: () => colors.danger,
                  labelColor: () => colors.textSecondary,
                  fillShadowGradientFrom: colors.danger,
                  fillShadowGradientTo: colors.surface,
                  fillShadowGradientFromOpacity: 0.2,
                  fillShadowGradientToOpacity: 0,
                  style: { borderRadius: 16 },
                  propsForDots: { r: '4', strokeWidth: '2', stroke: colors.danger, fill: colors.background },
                  propsForBackgroundLines: { stroke: colors.border, strokeDasharray: '4 4' },
                }}
                bezier style={s.chart}
                withInnerLines withOuterLines={false} fromZero={false} segments={3}
              />
            </View>
          ) : (
            <View style={[s.emptyChart, { height: 160 }]}>
              <Ionicons name="analytics-outline" size={32} color={colors.textSecondary} />
              <AppText style={[s.emptyChartText, { color: colors.textPrimary }]}>
                {isRTL ? 'لا توجد بيانات كافية' : 'Not enough data yet'}
              </AppText>
            </View>
          )}
        </View>

        {/* ── Stats Summary ── */}
        {filteredRecords.length >= 2 && (
          <VitalsSummary
            label={isRTL ? 'إحصائيات النبض' : 'Heart Rate Stats'}
            avg={stats.avg} min={stats.min} max={stats.max}
            unit=" bpm" color={colors.danger}
          />
        )}

        {/* ── Recent Readings ── */}
        {filteredRecords.length > 0 && (
          <View style={s.recentSection}>
            <AppText style={[s.sectionTitle, { color: colors.textPrimary }]}>
              {isRTL ? 'القراءات الأخيرة' : 'Recent Readings'}
            </AppText>
            {filteredRecords.slice(0, 5).map((r, i) => (
              <RecentReading key={r.id ?? i} reading={r} isAr={isRTL} />
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}

// ─── Local styles ─────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  h1: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  sub: { fontSize: 12, marginTop: 2 },
  headerBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  deviceCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    gap: 12,
  },
  deviceCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: { flex: 1, gap: 4 },
  deviceName: { fontSize: 15, fontWeight: '700' },
  deviceStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deviceDot: { width: 7, height: 7, borderRadius: 4 },
  deviceStatusText: { fontSize: 12, fontWeight: '600' },
  deviceBatteryText: { fontSize: 11, fontWeight: '600', color: '#888' },
  deviceSignal: { padding: 4 },
  simBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  simBadgeText: { fontSize: 11, fontWeight: '600' },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  errorText: { flex: 1, fontSize: 12, fontWeight: '600' },
  connectBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  connectBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  deviceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  disconnectBtn: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  disconnectBtnText: { fontSize: 13, fontWeight: '700' },
  syncBadge: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  syncDot: { width: 6, height: 6, borderRadius: 3 },
  syncBadgeText: { fontSize: 13, fontWeight: '700' },
  liveSection: {
    borderRadius: 18,
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: 'transparent',
  },
  liveSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveSectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveSectionTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  liveSectionTime: { fontSize: 11, color: '#888' },
  heartbeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pulseWrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
  },
  pulseCore: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hrDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  hrValue: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -2,
  },
  hrUnit: { fontSize: 16, fontWeight: '600' },
  hrLabel: { flex: 1, gap: 2 },
  hrLabelText: { fontSize: 13, fontWeight: '600' },
  hrAlertText: { fontSize: 11, fontWeight: '700' },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  liveCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  liveCardIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  liveCardLabel: { fontSize: 10, fontWeight: '600', color: '#888' },
  liveCardRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  liveCardValue: { fontSize: 22, fontWeight: '900' },
  liveCardUnit: { fontSize: 11, color: '#888' },
  liveCardAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  liveCardAlertText: { fontSize: 9, fontWeight: '700' },
  saveBtn: {
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  periodChipActive: {
    shadowColor: '#00C2FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  periodChipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  periodChipText: { fontSize: 13, fontWeight: '700' },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  chart: { borderRadius: 14, marginLeft: -8 },
  chartLoading: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChart: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyChartText: { fontSize: 13, fontWeight: '600' },
  summaryCard: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryVal: { fontSize: 20, fontWeight: '900' },
  summarySub: { fontSize: 9, fontWeight: '600', color: '#888' },
  summaryDivider: { width: 1, height: 28, borderRadius: 1 },
  recentSection: {
    gap: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInfo: { flex: 1, gap: 3 },
  recentMain: { fontSize: 13, fontWeight: '700' },
  recentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recentDate: { fontSize: 11 },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourceText: { fontSize: 10, fontWeight: '600' },
  abnormalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  abnormalText: { fontSize: 10, fontWeight: '700' },
});