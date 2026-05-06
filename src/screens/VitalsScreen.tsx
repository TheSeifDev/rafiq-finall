import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  ScrollView, View, StyleSheet, ActivityIndicator,
  TouchableOpacity, useWindowDimensions, Alert,
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
import { useTheme } from '../theme/useTheme';
import { spacing, radius } from '../theme';
import {
  generateRealisticWeek, buildWeeklyAnalytics, recordsToDays, type WeeklyAnalytics,
} from '../utils/vitalsAnalytics';

/* ── Vital display helper (logic untouched) ── */
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

type FilterPeriod = 'day' | 'week' | 'month';

export function VitalsScreen(): React.JSX.Element {
  const { t, isRTL } = useLocale();
  const { colors } = useTheme();
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
  const [period, setPeriod] = useState<FilterPeriod>('week');

  /* ── ALL LOGIC UNTOUCHED ── */
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
  useEffect(() => () => { bt.destroy(); }, [bt]);

  const analytics: WeeklyAnalytics = useMemo(() => {
    if (records.length >= 2) {
      const days = recordsToDays(records, isRTL);
      return buildWeeklyAnalytics(days);
    }
    return buildWeeklyAnalytics(generateRealisticWeek(74, 120, 78, isRTL));
  }, [records, isRTL]);

  const isRealData = records.length >= 2;
  const hasChart = analytics.days.length > 0 && analytics.hr.max > 0;

  const handleConnect = useCallback(async () => {
    setConnecting(true); setError(null);
    try {
      const devs = await bt.scanForDevices();
      if (!devs.length) { setError(isRTL ? 'لم يتم العثور على أجهزة' : 'No devices found'); return; }
      await bt.connectToDevice(devs[0].id);
      setDevice(devs[0].name);
      const v = await bt.readVitals();
      setLive({ heart_rate: v.heart_rate, blood_pressure_systolic: v.blood_pressure_systolic, blood_pressure_diastolic: v.blood_pressure_diastolic, oxygen_saturation: v.oxygen_saturation, temperature: v.temperature });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : (isRTL ? 'فشل الاتصال' : 'Connection failed'));
    } finally { setConnecting(false); }
  }, [bt, isRTL]);

  const handleDisconnect = useCallback(async () => {
    await bt.disconnect(); setDevice(null); setLive(null); setError(null);
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
        source: bt.isSimulated ? 'smartwatch' : 'bluetooth',
        recorded_at: new Date().toISOString(),
      });
      await load();
      Alert.alert('', isRTL ? 'تم حفظ القراءة بنجاح' : 'Reading saved successfully');
    } catch { Alert.alert('', isRTL ? 'فشل حفظ القراءة' : 'Failed to save reading'); }
    finally { setSaving(false); }
  }, [session?.user.id, live, bt.isSimulated, load, isRTL]);

  /* ── Vital card config (theme-aware) ── */
  const VITAL_CARDS = [
    { key: 'hr',   icon: 'heart',       color: colors.danger,   labelKey: 'heartRate', unitKey: 'bpm' },
    { key: 'bp',   icon: 'fitness',     color: colors.warning,  labelKey: 'bp',        unitKey: 'mmHg' },
    { key: 'spo2', icon: 'water',       color: colors.primary,  labelKey: 'spo2',      unitKey: 'percent' },
    { key: 'temp', icon: 'thermometer', color: colors.success,  labelKey: 'temp',      unitKey: 'celsius' },
  ] as const;

  const chartW = screenW - 64;
  const chartH = Math.min(200, screenW * 0.48);
  const filters: { key: FilterPeriod; label: string }[] = [
    { key: 'day', label: isRTL ? 'يوم' : 'Day' },
    { key: 'week', label: isRTL ? 'أسبوع' : 'Week' },
    { key: 'month', label: isRTL ? 'شهر' : 'Month' },
  ];

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={[s.header, isRTL && s.rowRev]}>
          <View style={{ flex: 1 }}>
            <AppText style={[s.h1, { color: colors.textPrimary }, isRTL && s.tR]}>{t('vitalsTitle')}</AppText>
            <AppText style={[s.sub, { color: colors.textSecondary }, isRTL && s.tR]}>{t('vitalsSubtitle')}</AppText>
          </View>
          <View style={[s.headerBadge, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="pulse" size={22} color={colors.primary} />
          </View>
        </View>

        {/* ── Filter Chips ── */}
        <View style={[s.filterRow, isRTL && s.rowRev]}>
          {filters.map((f) => (
            <TouchableOpacity key={f.key} activeOpacity={0.7} onPress={() => setPeriod(f.key)}
              style={[s.filterChip, { backgroundColor: period === f.key ? colors.primary : colors.surfaceVariant, borderColor: period === f.key ? colors.primary : colors.border }]}>
              <AppText style={[s.filterChipText, { color: period === f.key ? colors.background : colors.textSecondary }]}>
                {f.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Expo Go notice ── */}
        {bt.isSimulated && device && (
          <View style={[s.notice, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '25' }]}>
            <Ionicons name="information-circle-outline" size={15} color={colors.warning} />
            <AppText style={[s.noticeText, { color: colors.warning }]}>
              {isRTL ? 'وضع العرض التوضيحي — Expo Go' : 'Demo mode — Expo Go'}
            </AppText>
          </View>
        )}

        {/* ── Device Card ── */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.cardRow, isRTL && s.rowRev]}>
            <View style={{ flex: 1, gap: 3 }}>
              <AppText style={[s.cardTitle, { color: colors.textPrimary }, isRTL && s.tR]}>{t('smartwatch')}</AppText>
              <View style={[s.statusRow, isRTL && s.rowRev]}>
                <View style={[s.statusDot, { backgroundColor: device ? colors.success : colors.textSecondary }]} />
                <AppText style={[s.statusLabel, { color: colors.textSecondary }]}>
                  {device ? `${t('connected')} · ${device}` : t('disconnected')}
                </AppText>
              </View>
            </View>
            <View style={[s.iconCircle, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="watch-outline" size={20} color={colors.primary} />
            </View>
          </View>

          {error && (
            <View style={[s.errBanner, { backgroundColor: colors.danger + '12' }]}>
              <Ionicons name="alert-circle" size={14} color={colors.danger} />
              <AppText style={[s.errText, { color: colors.danger }]}>{error}</AppText>
            </View>
          )}

          {device && live ? (
            <>
              <View style={[s.gridContainer, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                {[VITAL_CARDS.slice(0, 2), VITAL_CARDS.slice(2, 4)].map((row, ri) => (
                  <View key={ri} style={[s.gridRow, isRTL && s.rowRev]}>
                    {row.map((vc) => (
                      <View key={vc.key} style={[s.vBox, { backgroundColor: vc.color + '0D', borderColor: vc.color + '30' }]}>
                        <View style={[s.vBoxHead, isRTL && s.rowRev]}>
                          <Ionicons name={vc.icon as any} size={16} color={vc.color} />
                          <AppText style={[s.vLabel, { color: colors.textSecondary }]}>{t(vc.labelKey)}</AppText>
                        </View>
                        <AppText style={[s.vVal, { color: vc.color }]}>{getVitalDisplay(vc.key, live)}</AppText>
                        <AppText style={[s.vUnit, { color: colors.textSecondary }]}>{t(vc.unitKey)}</AppText>
                      </View>
                    ))}
                  </View>
                ))}
              </View>

              <View style={s.liveRow}>
                <View style={[s.liveDot, { backgroundColor: colors.success }]} />
                <AppText style={[s.liveText, { color: colors.textSecondary }]}>
                  {bt.isSimulated ? (isRTL ? 'قراءة محاكاة' : 'Simulated reading') : t('liveReading')}
                </AppText>
              </View>

              <View style={[s.actionRow, isRTL && s.rowRev]}>
                <TouchableOpacity activeOpacity={0.8} onPress={handleSave} disabled={saving}
                  style={[s.btnPrimary, { backgroundColor: colors.success }]}>
                  {saving ? <ActivityIndicator color="#fff" size="small" />
                    : <><Ionicons name="cloud-upload-outline" size={16} color="#fff" /><AppText style={s.btnText}>{t('saveReading')}</AppText></>}
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} onPress={handleDisconnect}
                  style={[s.btnOutline, { borderColor: colors.danger + '60' }]}>
                  <Ionicons name="power-outline" size={15} color={colors.danger} />
                  <AppText style={[s.btnOutlineText, { color: colors.danger }]}>{t('disconnect')}</AppText>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity activeOpacity={0.8} onPress={handleConnect} disabled={connecting}
              style={[s.connectBtn, { backgroundColor: colors.primary }]}>
              {connecting ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="bluetooth-outline" size={18} color="#fff" /><AppText style={s.connectBtnText}>{t('connectSmartwatch')}</AppText></>}
            </TouchableOpacity>
          )}
        </View>

        {/* ── Weekly Insights ── */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.cardRow, isRTL && s.rowRev]}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText style={[s.cardTitle, { color: colors.textPrimary }, isRTL && s.tR]}>
                {isRTL ? 'تحليلات الأسبوع' : 'Weekly Insights'}
              </AppText>
              <AppText style={[s.cardSub, { color: colors.textSecondary }, isRTL && s.tR]}>
                {isRealData ? `${records.length} ${t('readings')}` : (isRTL ? 'بيانات توضيحية' : 'Sample data')}
              </AppText>
            </View>
            <View style={[s.iconCircle, { backgroundColor: colors.danger + '12' }]}>
              <Ionicons name="analytics" size={20} color={colors.danger} />
            </View>
          </View>

          {/* Stats */}
          <View style={[s.statsRow, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }, isRTL && s.rowRev]}>
            {[
              { label: isRTL ? 'المتوسط' : 'Avg', val: analytics.hr.avg || '--', color: colors.primary },
              { label: isRTL ? 'الأعلى' : 'High', val: analytics.hr.max || '--', color: colors.danger },
              { label: isRTL ? 'الأدنى' : 'Low', val: analytics.hr.min || '--', color: colors.success },
            ].map((stat, i, arr) => (
              <React.Fragment key={stat.label}>
                <View style={s.statBox}>
                  <AppText style={[s.statLabel, { color: colors.textSecondary }]}>{stat.label}</AppText>
                  <AppText style={[s.statVal, { color: stat.color }]}>{stat.val}</AppText>
                  <AppText style={[s.statUnit, { color: colors.textSecondary }]}>{t('bpm')}</AppText>
                </View>
                {i < arr.length - 1 && <View style={[s.statDivider, { backgroundColor: colors.border }]} />}
              </React.Fragment>
            ))}
          </View>

          {/* Chart */}
          {loading ? (
            <View style={[s.chartEmpty, { height: chartH }]}><ActivityIndicator color={colors.primary} /></View>
          ) : hasChart ? (
            <View style={{ marginHorizontal: -8 }}>
              <LineChart
                data={{ labels: analytics.days.map((d) => d.day), datasets: [{ data: analytics.days.map((d) => d.hr), color: () => colors.danger, strokeWidth: 2.5 }] }}
                width={chartW} height={chartH}
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
                  propsForLabels: { fontSize: 10 },
                }}
                bezier style={{ borderRadius: 16 }}
                withInnerLines withOuterLines={false} fromZero={false} segments={3}
              />
            </View>
          ) : (
            <View style={[s.chartEmpty, { height: chartH }]}>
              <Ionicons name="analytics-outline" size={32} color={colors.textSecondary} />
              <AppText style={[s.emptyText, { color: colors.textPrimary }]}>{t('noDataTitle')}</AppText>
              <AppText style={[s.emptySub, { color: colors.textSecondary }]}>{t('noChartData')}</AppText>
            </View>
          )}

          {/* Legend */}
          <View style={[s.legendRow, isRTL && s.rowRev]}>
            {[
              { color: colors.danger, label: t('heartRate') },
              { color: colors.warning, label: t('bp') },
              { color: colors.primary, label: t('spo2') },
            ].map((item) => (
              <View key={item.label} style={[s.legendItem, isRTL && s.rowRev]}>
                <View style={[s.legendDot, { backgroundColor: item.color }]} />
                <AppText style={[s.legendText, { color: colors.textSecondary }]}>{item.label}</AppText>
              </View>
            ))}
          </View>
        </View>

        {/* ── Recent Readings ── */}
        {!loading && records.length > 0 && (
          <View style={{ gap: 10 }}>
            <AppText style={[s.sectionTitle, { color: colors.textPrimary }, isRTL && s.tR]}>{t('recentReadings')}</AppText>
            {records.slice(0, 5).map((r, i) => {
              const isAbnormal = (r.heart_rate ?? 75) > 100 || (r.oxygen_saturation ?? 98) < 95;
              return (
                <View key={r.id ?? i} style={[s.recentCard, { backgroundColor: colors.surface, borderColor: isAbnormal ? colors.warning + '40' : colors.border }]}>
                  <View style={[s.recentInner, isRTL && s.rowRev]}>
                    <View style={[s.recentIcon, { backgroundColor: isAbnormal ? colors.warning + '14' : colors.primarySoft }]}>
                      <Ionicons name="heart-circle-outline" size={18} color={isAbnormal ? colors.warning : colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText style={[s.recentMain, { color: colors.textPrimary }, isRTL && s.tR]} numberOfLines={1}>
                        {[r.heart_rate && `${r.heart_rate} ${t('bpm')}`, r.blood_pressure_systolic && `${r.blood_pressure_systolic}/${r.blood_pressure_diastolic}`, r.oxygen_saturation && `${r.oxygen_saturation}%`, r.temperature && `${r.temperature}°`].filter(Boolean).join('  ·  ')}
                      </AppText>
                      <AppText style={[s.recentDate, { color: colors.textSecondary }, isRTL && s.tR]}>
                        {r.recorded_at.slice(0, 10)} · {r.source === 'bluetooth' ? t('fromWatch') : (isRTL ? 'يدوي' : 'Manual')}
                      </AppText>
                    </View>
                    {isAbnormal && (
                      <View style={[s.abnormalBadge, { backgroundColor: colors.warning + '14' }]}>
                        <AppText style={[s.abnormalText, { color: colors.warning }]}>{isRTL ? 'غير طبيعي' : 'Abnormal'}</AppText>
                      </View>
                    )}
                    <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color={colors.textSecondary} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md },
  rowRev: { flexDirection: 'row-reverse' },
  tR: { textAlign: 'right' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  h1: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  sub: { fontSize: 13, marginTop: 2 },
  headerBadge: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  filterChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: '700' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  noticeText: { flex: 1, fontSize: 12, fontWeight: '600' },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSub: { fontSize: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: '600' },
  errBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  errText: { flex: 1, fontSize: 12, fontWeight: '600' },
  gridContainer: { borderRadius: 16, borderWidth: 1, padding: 10, gap: 10 },
  gridRow: { flexDirection: 'row', gap: 10 },
  vBox: { flex: 1, borderRadius: 14, padding: 14, gap: 6, borderWidth: 1 },
  vBoxHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vLabel: { fontSize: 11, fontWeight: '600' },
  vVal: { fontSize: 26, fontWeight: '900', letterSpacing: -0.8 },
  vUnit: { fontSize: 11, fontWeight: '500', marginTop: -2 },
  liveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 2 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontSize: 11, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10 },
  btnPrimary: { flex: 1, height: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnOutline: { height: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 18, borderWidth: 1.5, backgroundColor: 'transparent' },
  btnOutlineText: { fontSize: 13, fontWeight: '700' },
  connectBtn: { height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  connectBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  statsRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 12 },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statVal: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statUnit: { fontSize: 10, fontWeight: '600' },
  statDivider: { width: 1, height: 32, borderRadius: 1 },
  chartEmpty: { justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14, fontWeight: '700' },
  emptySub: { fontSize: 12, textAlign: 'center', paddingHorizontal: 16 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 11, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  recentCard: { borderRadius: 14, borderWidth: 1, padding: 13 },
  recentInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recentIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recentMain: { fontSize: 13, fontWeight: '700' },
  recentDate: { fontSize: 11 },
  abnormalBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  abnormalText: { fontSize: 10, fontWeight: '700' },
});
