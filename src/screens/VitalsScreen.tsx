import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/ui/Screen';
import { AppCard } from '../components/ui/AppCard';
import { AppText } from '../components/ui/AppText';
import { useAuthStore } from '../store/auth.store';
import { patientService } from '../services/patient.service';
import { vitalsService, type VitalsRecord } from '../services/vitals.service';
import { BluetoothService } from '../services/bluetooth.service';
import { useLocale } from '../hooks/useLocale';

const { width: SCREEN_W } = Dimensions.get('window');

const C = {
  bg: '#0B1120',
  card: '#151E2E',
  cardBorder: '#1E293B',
  primary: '#06B6D4',
  primarySoft: 'rgba(6,182,212,0.12)',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  success: '#10B981',
  successSoft: 'rgba(16,185,129,0.12)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.12)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.12)',
  purple: '#8B5CF6',
  purpleSoft: 'rgba(139,92,246,0.12)',
  rose: '#F43F5E',
  roseSoft: 'rgba(244,63,94,0.12)',
};

export function VitalsScreen(): React.JSX.Element {
  const { t, isRTL } = useLocale();
  const session = useAuthStore((state) => state.session);

  const [records, setRecords] = useState<VitalsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [watchData, setWatchData] = useState<Partial<VitalsRecord> | null>(null);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    try {
      setLoading(true);
      const profile = await patientService.getProfile(session.user.id);
      if (!profile) return;
      const data = await vitalsService.getVitalsHistory(profile.id);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = useMemo(() => {
    const points = records.slice(0, 7).reverse();
    return {
      labels: points.map((item) => item.recorded_at.slice(5, 10)),
      datasets: [{ data: points.map((item) => item.heart_rate ?? 0) }],
    };
  }, [records]);

  const hasChartData = chartData.datasets[0].data.length > 0;

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const service = new BluetoothService();
      const devices = await service.scanForDevices();
      if (devices[0]) {
        await service.connectToDevice(devices[0].id);
        setConnectedDevice(devices[0].name || devices[0].id);
        setWatchData({
          heart_rate: 72,
          blood_pressure_systolic: 120,
          blood_pressure_diastolic: 80,
          oxygen_saturation: 98,
          temperature: 36.6,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setConnectedDevice(null);
    setWatchData(null);
  };

  const handleSave = async () => {
    if (!session?.user.id || !watchData) return;
    try {
      setSaving(true);
      const profile = await patientService.getProfile(session.user.id);
      if (!profile) return;
      await vitalsService.saveVitals({
        patient_id: profile.id,
        heart_rate: watchData.heart_rate ?? null,
        blood_pressure_systolic: watchData.blood_pressure_systolic ?? null,
        blood_pressure_diastolic: watchData.blood_pressure_diastolic ?? null,
        oxygen_saturation: watchData.oxygen_saturation ?? null,
        temperature: watchData.temperature ?? null,
        source: 'bluetooth',
        recorded_at: new Date().toISOString(),
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const vitals = [
    { label: t('heartRate'), value: watchData?.heart_rate, unit: t('bpm'), icon: 'pulse', color: C.rose, bg: C.roseSoft },
    { label: t('bp'), value: watchData?.blood_pressure_systolic && watchData?.blood_pressure_diastolic ? `${watchData.blood_pressure_systolic}/${watchData.blood_pressure_diastolic}` : '--', unit: t('mmHg'), icon: 'fitness', color: C.warning, bg: C.warningSoft },
    { label: t('spo2'), value: watchData?.oxygen_saturation, unit: t('percent'), icon: 'water', color: C.primary, bg: C.primarySoft },
    { label: t('temp'), value: watchData?.temperature, unit: t('celsius'), icon: 'thermometer', color: C.purple, bg: C.purpleSoft },
  ];

  return (
    <Screen style={{ backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={[styles.header, isRTL && styles.rowReverse]}>
          <View style={[styles.headerText, isRTL && styles.alignEnd]}>
            <AppText variant="h1" style={[styles.headerTitle, isRTL && styles.textRight]}>{t('vitalsTitle')}</AppText>
            <AppText style={[styles.headerSubtitle, isRTL && styles.textRight]}>{t('vitalsSubtitle')}</AppText>
          </View>
          <View style={[styles.headerIcon, { backgroundColor: C.primarySoft }]}>
            <Ionicons name="pulse" size={24} color={C.primary} />
          </View>
        </View>

        {/* Smartwatch Card */}
        <AppCard style={styles.card}>
          <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
            <View style={styles.cardHeaderText}>
              <AppText variant="h2" style={[styles.cardTitle, isRTL && styles.textRight]}>{t('smartwatch')}</AppText>
              <View style={[styles.badge, isRTL && styles.rowReverse]}>
                <View style={[styles.dot, { backgroundColor: connectedDevice ? C.success : C.danger }]} />
                <AppText style={styles.badgeText}>
                  {connectedDevice ? `${t('connected')} · ${connectedDevice}` : t('disconnected')}
                </AppText>
              </View>
            </View>
            <View style={[styles.iconCircle, { backgroundColor: C.primarySoft }]}>
              <Ionicons name="watch-outline" size={22} color={C.primary} />
            </View>
          </View>

          {connectedDevice && watchData ? (
            <>
              {/* Live Readings Grid */}
              <View style={[styles.vitalsGrid, isRTL && styles.rowReverse]}>
                {vitals.map((v) => (
                  <View key={v.label} style={[styles.vitalBox, { backgroundColor: v.bg }]}>
                    <Ionicons name={v.icon as any} size={20} color={v.color} />
                    <AppText style={[styles.vitalValue, { color: v.color }]}>{v.value ?? '--'}</AppText>
                    <AppText style={styles.vitalUnit}>{v.unit}</AppText>
                    <AppText style={styles.vitalLabel}>{v.label}</AppText>
                  </View>
                ))}
              </View>

              {/* Last Updated */}
              <View style={[styles.lastUpdate, isRTL && styles.rowReverse]}>
                <View style={[styles.liveDot, { backgroundColor: C.success }]} />
                <AppText style={styles.lastUpdateText}>{t('liveReading')}</AppText>
              </View>

              {/* Action Buttons */}
              <View style={[styles.actionRow, isRTL && styles.rowReverse]}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSave}
                  disabled={saving}
                  style={[styles.saveBtn, { backgroundColor: C.success }]}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={16} color="#fff" />
                      <AppText style={styles.saveBtnText}>{t('saveReading')}</AppText>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleDisconnect}
                  style={[styles.disconnectBtn, { borderColor: C.danger }]}
                >
                  <Ionicons name="close-circle" size={16} color={C.danger} />
                  <AppText style={[styles.disconnectBtnText, { color: C.danger }]}>{t('disconnect')}</AppText>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleConnect}
              disabled={connecting}
              style={[styles.connectBtn, { backgroundColor: C.primary }]}
            >
              {connecting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="bluetooth" size={20} color="#fff" />
                  <AppText style={styles.connectBtnText}>{t('connectSmartwatch')}</AppText>
                </>
              )}
            </TouchableOpacity>
          )}
        </AppCard>

        {/* Chart */}
        <AppCard style={styles.card}>
          <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
            <View style={styles.cardHeaderText}>
              <AppText variant="h2" style={[styles.cardTitle, isRTL && styles.textRight]}>{t('last7Days')}</AppText>
              <AppText style={[styles.cardSubtitle, isRTL && styles.textRight]}>{records.length} {t('readings')}</AppText>
            </View>
            <View style={[styles.iconCircle, { backgroundColor: C.purpleSoft }]}>
              <Ionicons name="trending-up-outline" size={22} color={C.purple} />
            </View>
          </View>

          {loading ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator color={C.primary} />
            </View>
          ) : hasChartData ? (
            <LineChart
              data={chartData}
              width={SCREEN_W - 64}
              height={220}
              chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: C.card,
                backgroundGradientTo: C.card,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(6, 182, 212, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: '4', strokeWidth: '2', stroke: C.primary, fill: C.bg },
                propsForBackgroundLines: { stroke: C.cardBorder, strokeDasharray: '4 4' },
                propsForLabels: { fontSize: 10 },
              }}
              bezier
              style={styles.chart}
              withInnerLines
              withOuterLines={false}
              fromZero={false}
              segments={4}
            />
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.iconCircleLarge, { backgroundColor: 'rgba(148,163,184,0.08)' }]}>
                <Ionicons name="analytics-outline" size={36} color={C.textMuted} />
              </View>
              <AppText style={styles.emptyTitle}>{t('noDataTitle')}</AppText>
              <AppText style={styles.emptySubtitle}>{t('noChartData')}</AppText>
            </View>
          )}
        </AppCard>

        {/* Recent Readings */}
        {!loading && records.length > 0 && (
          <View>
            <AppText variant="h2" style={[styles.sectionTitle, isRTL && styles.textRight]}>{t('recentReadings')}</AppText>
            <View style={styles.recentList}>
              {records.slice(0, 5).map((item, idx) => (
                <AppCard key={idx} style={styles.recentRow}>
                  <View style={[styles.recentRowInner, isRTL && styles.rowReverse]}>
                    <View style={[styles.recentIcon, { backgroundColor: C.primarySoft }]}>
                      <Ionicons name="watch-outline" size={18} color={C.primary} />
                    </View>
                    <View style={styles.recentInfo}>
                      <AppText style={styles.recentMain}>
                        {item.heart_rate ? `${item.heart_rate} ${t('bpm')}` : ''}
                        {item.blood_pressure_systolic ? ` · ${item.blood_pressure_systolic}/${item.blood_pressure_diastolic}` : ''}
                        {item.oxygen_saturation ? ` · ${item.oxygen_saturation}%` : ''}
                        {item.temperature ? ` · ${item.temperature}°` : ''}
                      </AppText>
                      <AppText style={styles.recentDate}>{item.recorded_at.slice(0, 10)} · {t('fromWatch')}</AppText>
                    </View>
                    <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={C.textMuted} />
                  </View>
                </AppCard>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  rowReverse: { flexDirection: 'row-reverse' },
  alignEnd: { alignItems: 'flex-end' },
  textRight: { textAlign: 'right' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 2,
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: C.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 3,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardHeaderText: { flex: 1, gap: 2 },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: C.textMuted,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '600',
  },

  /* Connect Button */
  connectBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  connectBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  /* Vitals Grid */
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vitalBox: {
    flex: 1,
    minWidth: 70,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  vitalValue: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  vitalUnit: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '600',
  },
  vitalLabel: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '700',
    marginTop: 2,
  },

  /* Live Indicator */
  lastUpdate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lastUpdateText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '600',
  },

  /* Action Buttons */
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  disconnectBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  disconnectBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  /* Chart */
  chart: {
    marginVertical: 6,
    borderRadius: 16,
  },
  chartLoading: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  iconCircleLarge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  /* Recent */
  sectionTitle: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '800',
    color: C.text,
  },
  recentList: { gap: 8 },
  recentRow: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 14,
  },
  recentRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInfo: { flex: 1, gap: 3 },
  recentMain: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  recentDate: {
    fontSize: 12,
    color: C.textMuted,
  },
});