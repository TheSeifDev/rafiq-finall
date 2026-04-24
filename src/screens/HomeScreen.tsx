import React, { useEffect, useState, useMemo } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { spacing } from '../theme';
import { useTheme } from '../theme/useTheme';
import { useAuthStore } from '../store/auth.store';
import { useAppStore } from '../store/app.store';
import { patientService } from '../services/patient.service';
import { vitalsService, type VitalsRecord } from '../services/vitals.service';
import { medicationService, type Medication } from '../services/medication.service';
import { notificationService, type AppNotification } from '../services/notification.service';
import { translations } from '../constants/translations';
import type { MainTabParamList, MainStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<MainStackParamList>
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Mock chart data (fallback when no real data) ──
const MOCK_HEART_RATES = [72, 78, 74, 80, 76, 73, 77];
const MOCK_BP_SYS = [118, 122, 120, 125, 119, 121, 118];
const DAYS_AR = ['سبت', 'أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع'];
const DAYS_EN = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// ── Mini sparkline chart component ──
function MiniChart({
  data,
  color,
  height = 48,
  width: chartWidth = SCREEN_WIDTH * 0.35,
}: {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = chartWidth / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * step,
    y: height - ((v - min) / range) * (height - 8) - 4,
  }));

  // Build SVG-like path with View-based rendering
  return (
    <View style={{ height, width: chartWidth, position: 'relative' }}>
      {/* Gradient fill area */}
      {points.map((p, i) => {
        if (i === 0) return null;
        const prev = points[i - 1];
        const barHeight = height - Math.min(p.y, prev.y);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: prev.x,
              bottom: 0,
              width: step,
              height: barHeight,
              backgroundColor: color + '08',
              borderTopLeftRadius: i === 1 ? 4 : 0,
              borderTopRightRadius: i === data.length - 1 ? 4 : 0,
            }}
          />
        );
      })}
      {/* Line segments */}
      {points.map((p, i) => {
        if (i === 0) return null;
        const prev = points[i - 1];
        const dx = p.x - prev.x;
        const dy = p.y - prev.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View
            key={`l${i}`}
            style={{
              position: 'absolute',
              left: prev.x,
              top: prev.y,
              width: len,
              height: 2.5,
              backgroundColor: color,
              borderRadius: 1.25,
              transform: [{ rotate: `${angle}deg` }],
              transformOrigin: 'left center',
            }}
          />
        );
      })}
      {/* Data points */}
      {points.map((p, i) => (
        <View
          key={`d${i}`}
          style={{
            position: 'absolute',
            left: p.x - 3,
            top: p.y - 3,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: color,
            borderWidth: 1.5,
            borderColor: '#fff',
          }}
        />
      ))}
    </View>
  );
}

// ── Health metric card ──
function MetricCard({
  icon,
  label,
  value,
  unit,
  color,
  darkMode,
  surfaceColor,
}: {
  icon: string;
  label: string;
  value: string;
  unit: string;
  color: string;
  darkMode: boolean;
  surfaceColor: string;
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor: surfaceColor }]}>
      <View style={[styles.metricIconWrap, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <AppText style={[styles.metricLabel, { color: darkMode ? '#94A3B8' : '#64748B' }]}>
        {label}
      </AppText>
      <View style={styles.metricValueRow}>
        <AppText style={[styles.metricValue, { color: darkMode ? '#F1F5F9' : '#1E293B' }]}>
          {value}
        </AppText>
        <AppText style={[styles.metricUnit, { color: darkMode ? '#64748B' : '#94A3B8' }]}>
          {unit}
        </AppText>
      </View>
    </View>
  );
}

// ── Quick action button ──
function QuickAction({
  icon,
  label,
  color,
  onPress,
  darkMode,
  surfaceColor,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  darkMode: boolean;
  surfaceColor: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.quickAction, { backgroundColor: surfaceColor }]}
    >
      <View style={[styles.quickIconWrap, { backgroundColor: color + '12' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <AppText style={[styles.quickLabel, { color: darkMode ? '#F1F5F9' : '#1E293B' }]}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

// ── Medication row ──
function MedRow({
  med,
  darkMode,
  colors,
}: {
  med: Medication;
  darkMode: boolean;
  colors: any;
}) {
  const timeLabel = med.time_of_day?.join(', ') ?? '';
  return (
    <View style={[styles.medRow, { borderBottomColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
      <View style={[styles.medDot, { backgroundColor: colors.success }]} />
      <View style={styles.medInfo}>
        <AppText style={[styles.medName, { color: colors.textPrimary }]}>{med.name}</AppText>
        <AppText style={[styles.medDose, { color: colors.textSecondary }]}>
          {med.dosage} · {med.frequency}
        </AppText>
      </View>
      {timeLabel ? (
        <View style={[styles.medTimeBadge, { backgroundColor: colors.primary + '12' }]}>
          <AppText style={[styles.medTimeText, { color: colors.primary }]}>{timeLabel}</AppText>
        </View>
      ) : null}
    </View>
  );
}

// ── Main HomeScreen ──
export function HomeScreen({ navigation }: Props): React.JSX.Element {
  const session = useAuthStore((s) => s.session);
  const { colors, darkMode, isRTL } = useTheme();
  const language = useAppStore((s) => s.language);
  const t = translations[language];

  const [refreshing, setRefreshing] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [latestVitals, setLatestVitals] = useState<VitalsRecord | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadData = async () => {
    if (!session?.user.id) return;
    try {
      const profile = await patientService.getProfile(session.user.id);
      if (profile) {
        setPatientName(profile.full_name ?? '');
        const [vitals, meds, notifs] = await Promise.all([
          vitalsService.getLatestVitals(profile.id),
          medicationService.getMedications(profile.id),
          notificationService.getNotifications(session.user.id),
        ]);
        setLatestVitals(vitals);
        setMedications(meds.filter((m) => m.is_active));
        setUnreadCount(notifs.filter((n) => !n.is_read).length);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    loadData();
  }, [session?.user.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Greeting based on time of day
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (language === 'ar') {
      if (hour < 12) return 'صباح الخير';
      if (hour < 18) return 'مساء الخير';
      return 'مساء الخير';
    }
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, [language]);

  const dateStr = useMemo(() => {
    const d = new Date();
    if (language === 'ar') {
      return d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
    }
    return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  }, [language]);

  const surfaceColor = darkMode ? 'rgba(30, 41, 59, 0.80)' : 'rgba(255, 255, 255, 0.90)';
  const cardBorder = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── HEADER ── */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <View style={styles.headerLeft}>
            <AppText style={[styles.greeting, { color: colors.textSecondary }]}>
              {greetingText}{patientName ? ' 👋' : ''}
            </AppText>
            <AppText style={[styles.userName, { color: colors.textPrimary }]}>
              {patientName || t.appName}
            </AppText>
            <AppText style={[styles.dateText, { color: colors.textSecondary }]}>
              {dateStr}
            </AppText>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('NotificationCenter')}
            style={[styles.notifBtn, { backgroundColor: surfaceColor, borderColor: cardBorder }]}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <AppText style={styles.notifBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── HEALTH SUMMARY ── */}
        <View style={styles.section}>
          <AppText style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t.healthSummary}
          </AppText>
          <View style={styles.metricsGrid}>
            <MetricCard
              icon="heart"
              label={t.heartRate}
              value={latestVitals?.heart_rate?.toString() ?? '--'}
              unit={t.bpm}
              color="#EF4444"
              darkMode={darkMode}
              surfaceColor={surfaceColor}
            />
            <MetricCard
              icon="fitness"
              label={t.bloodPressure}
              value={
                latestVitals?.blood_pressure_systolic
                  ? `${latestVitals.blood_pressure_systolic}/${latestVitals.blood_pressure_diastolic}`
                  : '--/--'
              }
              unit="mmHg"
              color="#0077C8"
              darkMode={darkMode}
              surfaceColor={surfaceColor}
            />
            <MetricCard
              icon="water"
              label={t.oxygenSaturation}
              value={latestVitals?.oxygen_saturation?.toString() ?? '--'}
              unit="%"
              color="#10B981"
              darkMode={darkMode}
              surfaceColor={surfaceColor}
            />
            <MetricCard
              icon="thermometer"
              label={t.temperature}
              value={latestVitals?.temperature?.toString() ?? '--'}
              unit="°C"
              color="#F59E0B"
              darkMode={darkMode}
              surfaceColor={surfaceColor}
            />
          </View>
        </View>

        {/* ── CHARTS ── */}
        <View style={styles.section}>
          <AppText style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t.weeklyTrend}
          </AppText>
          <View style={[styles.chartCard, { backgroundColor: surfaceColor, borderColor: cardBorder }]}>
            <View style={styles.chartRow}>
              <View style={styles.chartCol}>
                <View style={styles.chartLabelRow}>
                  <View style={[styles.chartDot, { backgroundColor: '#EF4444' }]} />
                  <AppText style={[styles.chartLabel, { color: colors.textSecondary }]}>
                    {t.heartRate}
                  </AppText>
                </View>
                <MiniChart data={MOCK_HEART_RATES} color="#EF4444" />
              </View>
              <View style={styles.chartDivider} />
              <View style={styles.chartCol}>
                <View style={styles.chartLabelRow}>
                  <View style={[styles.chartDot, { backgroundColor: '#0077C8' }]} />
                  <AppText style={[styles.chartLabel, { color: colors.textSecondary }]}>
                    {t.bloodPressure}
                  </AppText>
                </View>
                <MiniChart data={MOCK_BP_SYS} color="#0077C8" />
              </View>
            </View>
            <View style={styles.chartDays}>
              {(language === 'ar' ? DAYS_AR : DAYS_EN).map((d) => (
                <AppText key={d} style={[styles.chartDayText, { color: colors.textSecondary }]}>
                  {d}
                </AppText>
              ))}
            </View>
          </View>
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={styles.section}>
          <AppText style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t.quickActions}
          </AppText>
          <View style={styles.quickGrid}>
            <QuickAction
              icon="shield-checkmark"
              label={t.emergency}
              color="#EF4444"
              onPress={() => navigation.navigate('Emergency')}
              darkMode={darkMode}
              surfaceColor={surfaceColor}
            />
            <QuickAction
              icon="medical"
              label={t.medications}
              color="#10B981"
              onPress={() => navigation.navigate('Profile', { screen: 'Medications' })}
              darkMode={darkMode}
              surfaceColor={surfaceColor}
            />
            <QuickAction
              icon="chatbubbles"
              label={t.chat}
              color="#0077C8"
              onPress={() => navigation.navigate('Chat')}
              darkMode={darkMode}
              surfaceColor={surfaceColor}
            />
            <QuickAction
              icon="heart"
              label={t.vitals}
              color="#F59E0B"
              onPress={() => navigation.navigate('Vitals')}
              darkMode={darkMode}
              surfaceColor={surfaceColor}
            />
          </View>
        </View>

        {/* ── TODAY'S MEDICATIONS ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t.todayMeds}
            </AppText>
            {medications.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Profile', { screen: 'Medications' })}
              >
                <AppText style={[styles.viewAll, { color: colors.primary }]}>{t.viewAll}</AppText>
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.medsCard, { backgroundColor: surfaceColor, borderColor: cardBorder }]}>
            {medications.length > 0 ? (
              medications.slice(0, 5).map((med) => (
                <MedRow key={med.id} med={med} darkMode={darkMode} colors={colors} />
              ))
            ) : (
              <View style={styles.emptyMeds}>
                <Ionicons name="medical-outline" size={32} color={colors.textSecondary + '60'} />
                <AppText style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t.noMedsToday}
                </AppText>
              </View>
            )}
          </View>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
  },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  notifBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  // ── Sections ──
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  // ── Metrics grid ──
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCard: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm) / 2,
    borderRadius: 18,
    padding: spacing.md,
    gap: 8,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: '600',
  },
  // ── Charts ──
  chartCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  chartCol: {
    alignItems: 'center',
    gap: 8,
  },
  chartLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chartLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(128,128,128,0.15)',
    alignSelf: 'center',
  },
  chartDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.10)',
  },
  chartDayText: {
    fontSize: 10,
    fontWeight: '600',
  },
  // ── Quick actions ──
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickAction: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 3) / 4,
    borderRadius: 16,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 6,
  },
  quickIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  // ── Medications ──
  medsCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  medDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  medInfo: {
    flex: 1,
    gap: 2,
  },
  medName: {
    fontSize: 15,
    fontWeight: '600',
  },
  medDose: {
    fontSize: 12,
    fontWeight: '500',
  },
  medTimeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  medTimeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyMeds: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
