import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/ui/Screen';
import { AppText } from '../components/ui/AppText';
import { useAuthStore } from '../store/auth.store';
import { patientService } from '../services/patient.service';
import { vitalsService, type VitalsRecord } from '../services/vitals.service';
import { BluetoothService } from '../services/bluetooth.service';
import { useLocale } from '../hooks/useLocale';
import {
  generateRealisticWeek,
  buildWeeklyAnalytics,
  recordsToDays,
  type WeeklyAnalytics,
} from '../utils/vitalsAnalytics';

/* ── Design tokens ─────────────────────────────────────────── */
const P = {
  bg: '#0A0F1C',
  card: '#111827',
  cardBorder: '#1F2937',
  glass: 'rgba(255,255,255,0.03)',
  primary: '#06B6D4',
  primaryDim: 'rgba(6,182,212,0.10)',
  text: '#F1F5F9',
  muted: '#94A3B8',
  dim: '#64748B',
  success: '#10B981',
  successDim: 'rgba(16,185,129,0.10)',
  danger: '#EF4444',
  dangerDim: 'rgba(239,68,68,0.10)',
  amber: '#F59E0B',
  amberDim: 'rgba(245,158,11,0.08)',
  rose: '#F43F5E',
  roseDim: 'rgba(244,63,94,0.10)',
  purple: '#8B5CF6',
  purpleDim: 'rgba(139,92,246,0.10)',
  orange: '#F97316',
  orangeDim: 'rgba(249,115,22,0.10)',
};

/* ── Vital card config ─────────────────────────────────────── */
const VITAL_CARDS = [
  { key: 'hr',   icon: 'heart',       color: P.rose,   bg: P.roseDim,    labelKey: 'heartRate', unitKey: 'bpm' },
  { key: 'bp',   icon: 'fitness',     color: P.orange,  bg: P.orangeDim,  labelKey: 'bp',        unitKey: 'mmHg' },
  { key: 'spo2', icon: 'water',       color: P.primary, bg: P.primaryDim, labelKey: 'spo2',      unitKey: 'percent' },
  { key: 'temp', icon: 'thermometer', color: P.purple,  bg: P.purpleDim,  labelKey: 'temp',      unitKey: 'celsius' },
] as const;

function getVitalDisplay(key: string, data: Partial<VitalsRecord> | null): string {
  if (!data) return '--';
  switch (key) {
    case 'hr':   return data.heart_rate != null ? `${data.heart_rate}` : '--';
    case 'bp':   return data.blood_pressure_systolic && data.blood_pressure_diastolic
                        ? `${data.blood_pressure_systolic}/${data.blood_pressure_diastolic}` : '--';
    case 'spo2': return data.oxygen_saturation != null ? `${data.oxygen_saturation}` : '--';
    case 'temp': return data.temperature != null ? `${data.temperature}` : '--';
    default:     return '--';
  }
}

/* ── Component ─────────────────────────────────────────────── */
export function VitalsScreen(): React.JSX.Element {
  const { t, isRTL } = useLocale();
  const { width: screenW } = useWindowDimensions();
  const session = useAuthStore((s) => s.session);
  const bt = useRef(new BluetoothService()).current;

  const [records, setRecords] = useState<VitalsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [device, setDevice] = useState<string | null>(null);
  const [live, setLive] = useState<Partial<VitalsRecord> | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ── Load history ── */
  const load = useCallback(async () => {
    if (!session?.user.id) return;
    try {
      setLoading(true);
      const profile = await patientService.getProfile(session.user.id);
      if (!profile) return;
      const data = await vitalsService.getVitalsHistory(profile.id);
      setRecords(data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { bt.destroy(); }, [bt]);

  /* ── Weekly analytics pipeline ── */
  const analytics: WeeklyAnalytics = useMemo(() => {
    if (records.length >= 2) {
      const days = recordsToDays(records, isRTL);
      return buildWeeklyAnalytics(days);
    }
    // Fallback: realistic generated week
    return buildWeeklyAnalytics(generateRealisticWeek(74, 120, 78, isRTL));
  }, [records, isRTL]);

  const isRealData = records.length >= 2;
  const hasChart = analytics.days.length > 0 && analytics.hr.max > 0;

  /* ── Connect ── */
  const handleConnect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const devs = await bt.scanForDevices();
      if (!devs.length) {
        setError(isRTL ? 'لم يتم العثور على أجهزة' : 'No devices found');
        return;
      }
      await bt.connectToDevice(devs[0].id);
      setDevice(devs[0].name);
      const v = await bt.readVitals();
      setLive({
        heart_rate: v.heart_rate,
        blood_pressure_systolic: v.blood_pressure_systolic,
        blood_pressure_diastolic: v.blood_pressure_diastolic,
        oxygen_saturation: v.oxygen_saturation,
        temperature: v.temperature,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : (isRTL ? 'فشل الاتصال' : 'Connection failed'));
    } finally {
      setConnecting(false);
    }
  }, [bt, isRTL]);

  const handleDisconnect = useCallback(async () => {
    await bt.disconnect();
    setDevice(null);
    setLive(null);
    setError(null);
  }, [bt]);

  const handleSave = useCallback(async () => {
    if (!session?.user.id || !live) return;
    try {
      setSaving(true);
      const profile = await patientService.getProfile(session.user.id);
      if (!profile) return;
      await vitalsService.saveVitals({
        patient_id: profile.id,
        heart_rate: live.heart_rate ?? null,
        blood_pressure_systolic: live.blood_pressure_systolic ?? null,
        blood_pressure_diastolic: live.blood_pressure_diastolic ?? null,
        oxygen_saturation: live.oxygen_saturation ?? null,
        temperature: live.temperature ?? null,
        source: bt.isSimulated ? 'manual' : 'bluetooth',
        recorded_at: new Date().toISOString(),
      });
      await load();
      Alert.alert('', isRTL ? 'تم حفظ القراءة بنجاح' : 'Reading saved successfully');
    } catch {
      Alert.alert('', isRTL ? 'فشل حفظ القراءة' : 'Failed to save reading');
    } finally {
      setSaving(false);
    }
  }, [session?.user.id, live, bt.isSimulated, load, isRTL]);

  /* ── Responsive sizing ── */
  const chartW = screenW - 64;
  const chartH = Math.min(200, screenW * 0.48);

  /* ── Render ── */
  return (
    <Screen style={{ backgroundColor: P.bg }}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={[s.header, isRTL && s.rowRev]}>
          <View style={{ flex: 1 }}>
            <AppText style={[s.h1, isRTL && s.tR]}>{t('vitalsTitle')}</AppText>
            <AppText style={[s.sub, isRTL && s.tR]}>{t('vitalsSubtitle')}</AppText>
          </View>
          <View style={[s.headerBadge, { backgroundColor: P.primaryDim }]}>
            <Ionicons name="pulse" size={22} color={P.primary} />
          </View>
        </View>

        {/* ── Expo Go notice ── */}
        {bt.isSimulated && device && (
          <View style={s.notice}>
            <Ionicons name="information-circle-outline" size={15} color={P.amber} />
            <AppText style={s.noticeText}>
              {isRTL ? 'وضع العرض التوضيحي — Expo Go' : 'Demo mode — Expo Go'}
            </AppText>
          </View>
        )}

        {/* ── Device Card ── */}
        <View style={s.card}>
          <View style={[s.cardRow, isRTL && s.rowRev]}>
            <View style={{ flex: 1, gap: 3 }}>
              <AppText style={[s.cardTitle, isRTL && s.tR]}>{t('smartwatch')}</AppText>
              <View style={[s.statusRow, isRTL && s.rowRev]}>
                <View style={[s.statusDot, { backgroundColor: device ? P.success : P.dim }]} />
                <AppText style={s.statusLabel}>
                  {device ? `${t('connected')} · ${device}` : t('disconnected')}
                </AppText>
              </View>
            </View>
            <View style={[s.iconCircle, { backgroundColor: P.primaryDim }]}>
              <Ionicons name="watch-outline" size={20} color={P.primary} />
            </View>
          </View>

          {error && (
            <View style={s.errBanner}>
              <Ionicons name="alert-circle" size={14} color={P.danger} />
              <AppText style={s.errText}>{error}</AppText>
            </View>
          )}

          {device && live ? (
            <>
              {/* ── Vitals 2×2 Container ── */}
              <View style={s.gridContainer}>
                {/* Row 1 */}
                <View style={[s.gridRow, isRTL && s.rowRev]}>
                  {VITAL_CARDS.slice(0, 2).map((vc) => (
                    <View key={vc.key} style={[s.vBox, { backgroundColor: vc.bg, borderColor: vc.color + '30' }]}>
                      <View style={[s.vBoxHead, isRTL && s.rowRev]}>
                        <Ionicons name={vc.icon as any} size={16} color={vc.color} />
                        <AppText style={[s.vLabel, { color: P.muted }]}>{t(vc.labelKey)}</AppText>
                      </View>
                      <AppText style={[s.vVal, { color: vc.color }]}>
                        {getVitalDisplay(vc.key, live)}
                      </AppText>
                      <AppText style={s.vUnit}>{t(vc.unitKey)}</AppText>
                    </View>
                  ))}
                </View>
                {/* Row 2 */}
                <View style={[s.gridRow, isRTL && s.rowRev]}>
                  {VITAL_CARDS.slice(2, 4).map((vc) => (
                    <View key={vc.key} style={[s.vBox, { backgroundColor: vc.bg, borderColor: vc.color + '30' }]}>
                      <View style={[s.vBoxHead, isRTL && s.rowRev]}>
                        <Ionicons name={vc.icon as any} size={16} color={vc.color} />
                        <AppText style={[s.vLabel, { color: P.muted }]}>{t(vc.labelKey)}</AppText>
                      </View>
                      <AppText style={[s.vVal, { color: vc.color }]}>
                        {getVitalDisplay(vc.key, live)}
                      </AppText>
                      <AppText style={s.vUnit}>{t(vc.unitKey)}</AppText>
                    </View>
                  ))}
                </View>
              </View>

              {/* ── Live indicator ── */}
              <View style={s.liveRow}>
                <View style={[s.liveDot, { backgroundColor: P.success }]} />
                <AppText style={s.liveText}>
                  {bt.isSimulated
                    ? (isRTL ? 'قراءة محاكاة' : 'Simulated reading')
                    : t('liveReading')}
                </AppText>
              </View>

              {/* ── Actions ── */}
              <View style={[s.actionRow, isRTL && s.rowRev]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleSave}
                  disabled={saving}
                  style={[s.btnPrimary, { backgroundColor: P.success }]}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <>
                        <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                        <AppText style={s.btnText}>{t('saveReading')}</AppText>
                      </>}
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleDisconnect}
                  style={[s.btnOutline, { borderColor: P.danger + '60' }]}
                >
                  <Ionicons name="power-outline" size={15} color={P.danger} />
                  <AppText style={[s.btnOutlineText, { color: P.danger }]}>{t('disconnect')}</AppText>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleConnect}
              disabled={connecting}
              style={[s.connectBtn, { backgroundColor: P.primary }]}
            >
              {connecting
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="bluetooth-outline" size={18} color="#fff" />
                    <AppText style={s.connectBtnText}>{t('connectSmartwatch')}</AppText>
                  </>}
            </TouchableOpacity>
          )}
        </View>

        {/* ── Weekly Insights Card ── */}
        <View style={s.card}>
          {/* Header */}
          <View style={[s.cardRow, isRTL && s.rowRev]}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText style={[s.cardTitle, isRTL && s.tR]}>
                {isRTL ? 'تحليلات الأسبوع' : 'Weekly Insights'}
              </AppText>
              <AppText style={[s.cardSub, isRTL && s.tR]}>
                {isRealData
                  ? `${records.length} ${t('readings')}`
                  : (isRTL ? 'بيانات توضيحية' : 'Sample data')}
              </AppText>
            </View>
            <View style={[s.iconCircle, { backgroundColor: P.roseDim }]}>
              <Ionicons name="analytics" size={20} color={P.rose} />
            </View>
          </View>

          {/* Stats Row */}
          <View style={[s.statsRow, isRTL && s.rowRev]}>
            <View style={s.statBox}>
              <AppText style={s.statLabel}>{isRTL ? 'المتوسط' : 'Avg'}</AppText>
              <AppText style={[s.statVal, { color: P.primary }]}>{analytics.hr.avg || '--'}</AppText>
              <AppText style={s.statUnit}>{t('bpm')}</AppText>
            </View>
            <View style={[s.statDivider, { backgroundColor: P.cardBorder }]} />
            <View style={s.statBox}>
              <AppText style={s.statLabel}>{isRTL ? 'الأعلى' : 'High'}</AppText>
              <AppText style={[s.statVal, { color: P.rose }]}>{analytics.hr.max || '--'}</AppText>
              <AppText style={s.statUnit}>{t('bpm')}</AppText>
            </View>
            <View style={[s.statDivider, { backgroundColor: P.cardBorder }]} />
            <View style={s.statBox}>
              <AppText style={s.statLabel}>{isRTL ? 'الأدنى' : 'Low'}</AppText>
              <AppText style={[s.statVal, { color: P.success }]}>{analytics.hr.min || '--'}</AppText>
              <AppText style={s.statUnit}>{t('bpm')}</AppText>
            </View>
          </View>

          {/* Chart */}
          {loading ? (
            <View style={[s.chartEmpty, { height: chartH }]}>
              <ActivityIndicator color={P.primary} />
            </View>
          ) : hasChart ? (
            <View style={{ marginHorizontal: -8 }}>
              <LineChart
                data={{
                  labels: analytics.days.map((d) => d.day),
                  datasets: [{ data: analytics.days.map((d) => d.hr), color: () => P.rose, strokeWidth: 2.5 }],
                }}
                width={chartW}
                height={chartH}
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: P.card,
                  backgroundGradientTo: P.card,
                  decimalPlaces: 0,
                  color: () => P.rose,
                  labelColor: () => P.dim,
                  fillShadowGradientFrom: P.rose,
                  fillShadowGradientTo: P.card,
                  fillShadowGradientFromOpacity: 0.25,
                  fillShadowGradientToOpacity: 0.0,
                  style: { borderRadius: 16 },
                  propsForDots: { r: '4', strokeWidth: '2', stroke: P.rose, fill: P.bg },
                  propsForBackgroundLines: { stroke: P.cardBorder, strokeDasharray: '4 4' },
                  propsForLabels: { fontSize: 10 },
                }}
                bezier
                style={{ borderRadius: 16 }}
                withInnerLines
                withOuterLines={false}
                fromZero={false}
                segments={3}
              />
            </View>
          ) : (
            <View style={[s.chartEmpty, { height: chartH }]}>
              <Ionicons name="analytics-outline" size={32} color={P.dim} />
              <AppText style={s.emptyText}>{t('noDataTitle')}</AppText>
              <AppText style={s.emptySub}>{t('noChartData')}</AppText>
            </View>
          )}

          {/* Legend */}
          <View style={[s.legendRow, isRTL && s.rowRev]}>
            <View style={[s.legendItem, isRTL && s.rowRev]}>
              <View style={[s.legendDot, { backgroundColor: P.rose }]} />
              <AppText style={s.legendText}>{t('heartRate')}</AppText>
            </View>
            <View style={[s.legendItem, isRTL && s.rowRev]}>
              <View style={[s.legendDot, { backgroundColor: P.orange }]} />
              <AppText style={s.legendText}>{t('bp')}</AppText>
            </View>
            <View style={[s.legendItem, isRTL && s.rowRev]}>
              <View style={[s.legendDot, { backgroundColor: P.primary }]} />
              <AppText style={s.legendText}>{t('spo2')}</AppText>
            </View>
          </View>
        </View>

        {/* ── Recent Readings ── */}
        {!loading && records.length > 0 && (
          <View style={{ gap: 10 }}>
            <AppText style={[s.sectionTitle, isRTL && s.tR]}>{t('recentReadings')}</AppText>
            {records.slice(0, 5).map((r, i) => (
              <View key={r.id ?? i} style={s.recentCard}>
                <View style={[s.recentInner, isRTL && s.rowRev]}>
                  <View style={[s.recentIcon, { backgroundColor: P.primaryDim }]}>
                    <Ionicons name="heart-circle-outline" size={18} color={P.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText style={[s.recentMain, isRTL && s.tR]} numberOfLines={1}>
                      {[
                        r.heart_rate && `${r.heart_rate} ${t('bpm')}`,
                        r.blood_pressure_systolic && `${r.blood_pressure_systolic}/${r.blood_pressure_diastolic}`,
                        r.oxygen_saturation && `${r.oxygen_saturation}%`,
                        r.temperature && `${r.temperature}°`,
                      ].filter(Boolean).join('  ·  ')}
                    </AppText>
                    <AppText style={[s.recentDate, isRTL && s.tR]}>
                      {r.recorded_at.slice(0, 10)} · {r.source === 'bluetooth' ? t('fromWatch') : (isRTL ? 'يدوي' : 'Manual')}
                    </AppText>
                  </View>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color={P.dim} />
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}

/* ── Styles ────────────────────────────────────────────────── */
const s = StyleSheet.create({
  scroll: { padding: 16, gap: 14 },
  rowRev: { flexDirection: 'row-reverse' },
  tR: { textAlign: 'right' },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  h1: { fontSize: 22, fontWeight: '800', color: P.text, letterSpacing: -0.4 },
  sub: { fontSize: 13, color: P.muted, marginTop: 2 },
  headerBadge: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  /* Notice */
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: P.amberDim, paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.12)',
  },
  noticeText: { flex: 1, fontSize: 12, fontWeight: '600', color: P.amber },

  /* Cards */
  card: {
    backgroundColor: P.card, borderRadius: 18, borderWidth: 1,
    borderColor: P.cardBorder, padding: 16, gap: 14,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: P.text },
  cardSub: { fontSize: 12, color: P.muted },
  iconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  /* Status */
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 12, color: P.muted, fontWeight: '600' },

  /* Error */
  errBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: P.dangerDim, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  errText: { flex: 1, fontSize: 12, fontWeight: '600', color: P.danger },

  /* Vitals 2×2 grid */
  gridContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.cardBorder,
    padding: 10,
    gap: 10,
  },
  gridRow: { flexDirection: 'row', gap: 10 },
  vBox: { flex: 1, borderRadius: 14, padding: 14, gap: 6, borderWidth: 1 },
  vBoxHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vLabel: { fontSize: 11, fontWeight: '600' },
  vVal: { fontSize: 26, fontWeight: '900', letterSpacing: -0.8 },
  vUnit: { fontSize: 11, color: P.muted, fontWeight: '500', marginTop: -2 },

  /* Live indicator */
  liveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 2 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontSize: 11, color: P.muted, fontWeight: '600' },

  /* Action buttons */
  actionRow: { flexDirection: 'row', gap: 10 },
  btnPrimary: {
    flex: 1, height: 46, borderRadius: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnOutline: {
    height: 46, borderRadius: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: 18, borderWidth: 1.5, backgroundColor: 'transparent',
  },
  btnOutlineText: { fontSize: 13, fontWeight: '700' },

  /* Connect */
  connectBtn: {
    height: 50, borderRadius: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  connectBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  /* Stats row */
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, borderWidth: 1, borderColor: P.cardBorder, padding: 12 },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statLabel: { fontSize: 10, fontWeight: '700', color: P.dim, textTransform: 'uppercase', letterSpacing: 0.5 },
  statVal: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statUnit: { fontSize: 10, color: P.muted, fontWeight: '600' },
  statDivider: { width: 1, height: 32, borderRadius: 1 },

  /* Chart */
  chartEmpty: { justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14, fontWeight: '700', color: P.text },
  emptySub: { fontSize: 12, color: P.muted, textAlign: 'center', paddingHorizontal: 16 },

  /* Legend */
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 11, color: P.muted, fontWeight: '600' },

  /* Recent */
  sectionTitle: { fontSize: 15, fontWeight: '800', color: P.text },
  recentCard: {
    backgroundColor: P.card, borderRadius: 14, borderWidth: 1,
    borderColor: P.cardBorder, padding: 13,
  },
  recentInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recentIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recentMain: { fontSize: 13, fontWeight: '700', color: P.text },
  recentDate: { fontSize: 11, color: P.muted },
});