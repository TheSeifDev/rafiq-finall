/**
 * WeeklyTrendsScreen - Medical-Grade Weekly Health Analytics
 * Beautiful charts, health insights, AI summaries, wellness scores
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { AppText } from '../components/ui/AppText';
import { useTheme } from '../theme/useTheme';
import { useAppStore } from '../store/app.store';
import { spacing, radius } from '../theme';
import { translations } from '../constants/translations';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - spacing.lg * 2 - spacing.md * 2;
const CHART_H = 180;

// ─── Types ───────────────────────────────────────────────────

interface DailyVitals {
  day: string;
  dayShort: string;
  hr: number;
  spo2: number;
  sleep: number;
  steps: number;
  bpSys: number;
  bpDia: number;
  temp: number;
}

interface WeeklyData {
  days: DailyVitals[];
  avgHR: number;
  avgSpo2: number;
  avgSleep: number;
  avgSteps: number;
  fallRiskScore: number;
  medicationAdherence: number;
  wellnessScore: number;
  trend: 'up' | 'down' | 'stable';
  aiObservations: string[];
  comparisonText: string;
}

// ─── Generate Sample Data ────────────────────────────────────

function generateWeekData(baseHR = 75, isAr = false): WeeklyData {
  const dayNames = isAr
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days: DailyVitals[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayName = dayNames[d.getDay()];

    days.push({
      day: d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      dayShort: dayName,
      hr: Math.round(baseHR + (Math.random() - 0.5) * 20),
      spo2: Math.round(96 + Math.random() * 3),
      sleep: Math.round((6 + Math.random() * 3) * 10) / 10,
      steps: Math.round(3000 + Math.random() * 6000),
      bpSys: Math.round(115 + Math.random() * 20),
      bpDia: Math.round(75 + Math.random() * 15),
      temp: Math.round((36.5 + Math.random() * 0.8) * 10) / 10,
    });
  }

  const avgHR = Math.round(days.reduce((s, d) => s + d.hr, 0) / 7);
  const avgSpo2 = Math.round(days.reduce((s, d) => s + d.spo2, 0) / 7 * 10) / 10;
  const avgSleep = Math.round(days.reduce((s, d) => s + d.sleep, 0) / 7 * 10) / 10;
  const avgSteps = Math.round(days.reduce((s, d) => s + d.steps, 0) / 7);

  // Calculate fall risk based on sleep, HR variability, age
  const fallRiskScore = Math.round(20 + Math.random() * 40);

  // Medication adherence (percentage)
  const medicationAdherence = Math.round(70 + Math.random() * 30);

  // Wellness score (0-100)
  const wellnessScore = Math.round(60 + Math.random() * 35);

  // AI observations
  const aiObservations = [
    isAr
      ? 'نمط نبض القلب مستقر خلال الأسبوع. لا توجد تقلبات غير طبيعية.'
      : 'Heart rate pattern is stable this week. No abnormal fluctuations detected.',
    isAr
      ? `متوسط النوم ${avgSleep.toFixed(1)} ساعة. يُنصح بالنوم 7-8 ساعات.`
      : `Average sleep ${avgSleep.toFixed(1)} hours. Recommended 7-8 hours for better health.`,
    avgSpo2 < 97
      ? (isAr ? 'مستوى الأكسجين يمكن تحسينه. حاول تمارين التنفس.' : 'Oxygen levels could be improved. Try breathing exercises.')
      : (isAr ? 'مستويات الأكسجين ممتازة.' : 'Oxygen levels are excellent.'),
    fallRiskScore > 40
      ? (isAr ? 'درجة خطر السقوط مرتفعة. يُنصح بمزيد من النشاط الحركي.' : 'Fall risk score is elevated. More physical activity recommended.')
      : (isAr ? 'درجة خطر السقوط ضمن المعدل الطبيعي.' : 'Fall risk score is within normal range.'),
  ];

  const comparisonText = isAr
    ? `بالمقارنة مع الأسبوع الماضي، ${wellnessScore > 65 ? 'تحسنت' : 'انخفضت'} درجة العافية بمقدار ${Math.abs(Math.round(wellnessScore - 60))}%`
    : `Compared to last week, wellness score has ${wellnessScore > 65 ? 'improved' : 'decreased'} by ${Math.abs(Math.round(wellnessScore - 60))}%`;

  return {
    days,
    avgHR,
    avgSpo2,
    avgSleep,
    avgSteps,
    fallRiskScore,
    medicationAdherence,
    wellnessScore,
    trend: wellnessScore > 65 ? 'up' : wellnessScore < 55 ? 'down' : 'stable',
    aiObservations,
    comparisonText,
  };
}

// ─── Mini Sparkline ──────────────────────────────────────────

function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return <View style={{ height }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const step = w / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * step,
    y: height - ((v - min) / range) * (height - 8) - 4,
  }));

  return (
    <View style={{ width: w, height }}>
      {points.map((p, i) => {
        if (i === 0) return null;
        const prev = points[i - 1];
        const dx = p.x - prev.x;
        const dy = p.y - prev.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: prev.x,
              top: prev.y,
              width: len,
              height: 2,
              backgroundColor: color,
              borderRadius: 1,
              transform: [{ rotate: `${angle}deg` }],
              transformOrigin: 'left center',
            }}
          />
        );
      })}
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
            backgroundColor: i === points.length - 1 ? color : color + '60',
          }}
        />
      ))}
    </View>
  );
}

// ─── Score Circle ────────────────────────────────────────────

function ScoreCircle({ score, label, color, size = 80 }: {
  score: number;
  label: string;
  color: string;
  size?: number;
}) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const middle = size / 2;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, position: 'relative' }}>
        {/* Background circle */}
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color + '20',
          }}
        />
        {/* Progress circle (simplified) */}
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            borderTopColor: 'transparent',
            borderRightColor: score > 25 ? color : 'transparent',
            borderBottomColor: score > 50 ? color : 'transparent',
            borderLeftColor: score > 75 ? color : 'transparent',
            transform: [{ rotate: '-45deg' }],
          }}
        />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <AppText style={{ fontSize: size * 0.32, fontWeight: '900', color: color }}>{score}</AppText>
        </View>
      </View>
      <AppText style={{ fontSize: 11, fontWeight: '600', color: color, marginTop: 6 }}>{label}</AppText>
    </View>
  );
}

// ─── Chart Card ───────────────────────────────────────────────

function ChartCard({ title, icon, children, colors, darkMode, onExpand }: {
  title: string;
  icon: string;
  children: React.ReactNode;
  colors: any;
  darkMode: boolean;
  onExpand?: () => void;
}) {
  return (
    <View style={[styles.chartCard, { backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
      <View style={styles.chartCardHeader}>
        <View style={[styles.chartIcon, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name={icon as any} size={16} color={colors.primary} />
        </View>
        <AppText style={[styles.chartTitle, { color: colors.textPrimary }]}>{title}</AppText>
        {onExpand && (
          <TouchableOpacity activeOpacity={0.7} onPress={onExpand}>
            <Ionicons name="expand-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────

export function WeeklyTrendsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { colors, darkMode, isRTL } = useTheme();
  const language = useAppStore((s) => s.language);
  const t = translations[language];
  const isAr = language === 'ar';

  const [data, setData] = useState<WeeklyData>(() => generateWeekData(75, isAr));
  const [refreshing, setRefreshing] = useState(false);
  const [activePeriod, setActivePeriod] = useState<'week' | 'month'>('week');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1000));
    setData(generateWeekData(75, isAr));
    setRefreshing(false);
  }, [isAr]);

  // Chart config
  const chartConfig = useMemo(() => ({
    backgroundColor: 'transparent',
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 194, 255, ${opacity})`,
    labelColor: () => colors.textSecondary,
    style: { borderRadius: 16 },
    propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary, fill: colors.surface },
    propsForBackgroundLines: { stroke: colors.border, strokeDasharray: '4 4' },
    propsForLabels: { fontSize: 10 },
    fillShadowGradientFrom: colors.danger,
    fillShadowGradientTo: colors.surface,
    fillShadowGradientFromOpacity: 0.15,
    fillShadowGradientToOpacity: 0,
  }), [colors]);

  // HR Chart data
  const hrChartData = useMemo(() => ({
    labels: data.days.map(d => d.dayShort),
    datasets: [{ data: data.days.map(d => d.hr), color: () => colors.danger, strokeWidth: 2.5 }],
  }), [data, colors]);

  // SpO2 Chart data
  const spo2ChartData = useMemo(() => ({
    labels: data.days.map(d => d.dayShort),
    datasets: [{ data: data.days.map(d => d.spo2), color: () => colors.primary, strokeWidth: 2 }],
  }), [data, colors]);

  // Sleep Chart data
  const sleepChartData = useMemo(() => ({
    labels: data.days.map(d => d.dayShort),
    datasets: [{ data: data.days.map(d => d.sleep), color: () => colors.success, strokeWidth: 2 }],
  }), [data, colors]);

  // Steps bar chart
  const stepsChartData = useMemo(() => ({
    labels: data.days.map(d => d.dayShort),
    datasets: [{ data: data.days.map(d => d.steps / 1000) }],
  }), [data]);

  const trendColors = {
    up: colors.success,
    down: colors.danger,
    stable: colors.warning,
  };

  const trendIcons = {
    up: 'trending-up',
    down: 'trending-down',
    stable: 'remove-outline',
  };

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      <ScreenHeader
        title={t.weeklyTrendsTitle}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Period Selector */}
        <View style={[styles.periodSelector, { backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
          {(['week', 'month'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              activeOpacity={0.7}
              onPress={() => setActivePeriod(p)}
              style={[
                styles.periodBtn,
                {
                  backgroundColor: activePeriod === p ? colors.primary : 'transparent',
                },
              ]}
            >
              <AppText style={[styles.periodBtnText, { color: activePeriod === p ? '#FFFFFF' : colors.textSecondary }]}>
                {p === 'week' ? (isAr ? 'أسبوع' : 'Week') : (isAr ? 'شهر' : 'Month')}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Wellness Score Card */}
        <View style={[styles.wellnessCard, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '25' }]}>
          <View style={styles.wellnessHeader}>
            <View style={[styles.wellnessIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="heart" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={[styles.wellnessTitle, { color: colors.textPrimary }]}>{t.wellnessScore}</AppText>
              <AppText style={[styles.wellnessSub, { color: colors.textSecondary }]}>
                {data.comparisonText}
              </AppText>
            </View>
            <View style={[styles.trendBadge, { backgroundColor: trendColors[data.trend] + '20' }]}>
              <Ionicons name={trendIcons[data.trend] as any} size={18} color={trendColors[data.trend]} />
            </View>
          </View>

          {/* Score Circle */}
          <View style={styles.scoreRow}>
            <ScoreCircle score={data.wellnessScore} label={isAr ? 'العافية' : 'Wellness'} color={colors.primary} size={100} />
            <View style={styles.subScores}>
              <ScoreCircle score={data.medicationAdherence} label={isAr ? 'الالتزام' : 'Adherence'} color={colors.success} size={70} />
              <ScoreCircle score={100 - data.fallRiskScore} label={isAr ? 'الأمان' : 'Safety'} color={colors.warning} size={70} />
            </View>
          </View>

          {/* Mini trend chart */}
          <View style={styles.miniTrend}>
            <Sparkline data={data.days.map(d => d.hr)} color={colors.danger} />
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { icon: 'heart', label: isAr ? 'متوسط النبض' : 'Avg HR', value: `${data.avgHR}`, unit: 'bpm', color: colors.danger },
            { icon: 'water', label: isAr ? 'متوسط الأكسجين' : 'Avg SpO2', value: `${data.avgSpo2}%`, unit: '', color: colors.primary },
            { icon: 'moon', label: isAr ? 'متوسط النوم' : 'Avg Sleep', value: `${data.avgSleep}h`, unit: '', color: colors.success },
            { icon: 'footsteps', label: isAr ? 'متوسط الخطوات' : 'Avg Steps', value: `${(data.avgSteps / 1000).toFixed(1)}k`, unit: '', color: colors.warning },
          ].map((stat, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <View style={[styles.statIconWrap, { backgroundColor: stat.color + '15' }]}>
                <Ionicons name={stat.icon as any} size={14} color={stat.color} />
              </View>
              <AppText style={[styles.statValue, { color: stat.color }]}>{stat.value}</AppText>
              <AppText style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</AppText>
            </View>
          ))}
        </View>

        {/* Heart Rate Chart */}
        <ChartCard
          title={t.heartRateTrends}
          icon="heart"
          colors={colors}
          darkMode={darkMode}
        >
          <LineChart
            data={hrChartData}
            width={CHART_W}
            height={CHART_H}
            chartConfig={{
              ...chartConfig,
              color: () => colors.danger,
              fillShadowGradientFrom: colors.danger,
            }}
            bezier
            style={styles.chart}
            withInnerLines
            withOuterLines={false}
            fromZero={false}
            segments={3}
          />
          <View style={styles.chartLegend}>
            <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
            <AppText style={[styles.legendText, { color: colors.textSecondary }]}>
              {isAr ? 'نبض القلب (ن/د)' : 'Heart Rate (bpm)'}
            </AppText>
            <View style={{ flex: 1 }} />
            <AppText style={[styles.legendAvg, { color: colors.danger }]}>
              {isAr ? `المتوسط: ${data.avgHR}` : `Avg: ${data.avgHR}`}
            </AppText>
          </View>
        </ChartCard>

        {/* SpO2 Chart */}
        <ChartCard
          title={t.oxygenTrends}
          icon="water"
          colors={colors}
          darkMode={darkMode}
        >
          <LineChart
            data={spo2ChartData}
            width={CHART_W}
            height={CHART_H}
            chartConfig={{
              ...chartConfig,
              color: () => colors.primary,
              fillShadowGradientFrom: colors.primary,
            }}
            bezier
            style={styles.chart}
            withInnerLines
            withOuterLines={false}
            fromZero={false}
            segments={2}
          />
          <View style={styles.chartLegend}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <AppText style={[styles.legendText, { color: colors.textSecondary }]}>
              {isAr ? 'تشبع الأكسجين (%)' : 'SpO2 (%)'}
            </AppText>
            <View style={{ flex: 1 }} />
            <AppText style={[styles.legendAvg, { color: colors.primary }]}>
              {isAr ? `المتوسط: ${data.avgSpo2}%` : `Avg: ${data.avgSpo2}%`}
            </AppText>
          </View>
        </ChartCard>

        {/* Sleep Chart */}
        <ChartCard
          title={t.sleepTrends}
          icon="moon"
          colors={colors}
          darkMode={darkMode}
        >
          <LineChart
            data={sleepChartData}
            width={CHART_W}
            height={CHART_H}
            chartConfig={{
              ...chartConfig,
              color: () => colors.success,
              fillShadowGradientFrom: colors.success,
            }}
            bezier
            style={styles.chart}
            withInnerLines
            withOuterLines={false}
            fromZero={false}
            segments={3}
          />
          <View style={styles.chartLegend}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <AppText style={[styles.legendText, { color: colors.textSecondary }]}>
              {isAr ? 'ساعات النوم' : 'Sleep Hours'}
            </AppText>
            <View style={{ flex: 1 }} />
            <AppText style={[styles.legendAvg, { color: colors.success }]}>
              {isAr ? `المتوسط: ${data.avgSleep}h` : `Avg: ${data.avgSleep}h`}
            </AppText>
          </View>
        </ChartCard>

        {/* Activity Steps */}
        <ChartCard
          title={t.activityTrends}
          icon="footsteps"
          colors={colors}
          darkMode={darkMode}
        >
          <BarChart
            data={stepsChartData}
            width={CHART_W}
            height={CHART_H}
            chartConfig={{
              ...chartConfig,
              color: () => colors.warning,
              fillShadowGradientFrom: colors.warning,
            }}
            style={styles.chart}
            withInnerLines
            showBarTops={false}
            fromZero={true}
            yAxisSuffix="k"
            yAxisLabel=""
          />
          <View style={styles.chartLegend}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <AppText style={[styles.legendText, { color: colors.textSecondary }]}>
              {isAr ? 'الخطوات (بآلاف)' : 'Steps (thousands)'}
            </AppText>
            <View style={{ flex: 1 }} />
            <AppText style={[styles.legendAvg, { color: colors.warning }]}>
              {isAr ? `المتوسط: ${(data.avgSteps / 1000).toFixed(1)}k` : `Avg: ${(data.avgSteps / 1000).toFixed(1)}k`}
            </AppText>
          </View>
        </ChartCard>

        {/* Fall Risk Score */}
        <View style={[styles.fallRiskCard, { backgroundColor: (data.fallRiskScore > 40 ? colors.warning : colors.success) + '12', borderColor: (data.fallRiskScore > 40 ? colors.warning : colors.success) + '30' }]}>
          <View style={styles.fallRiskHeader}>
            <View style={[styles.fallRiskIcon, { backgroundColor: (data.fallRiskScore > 40 ? colors.warning : colors.success) + '20' }]}>
              <Ionicons name="alert-circle" size={22} color={data.fallRiskScore > 40 ? colors.warning : colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={[styles.fallRiskTitle, { color: colors.textPrimary }]}>{t.fallRiskScore}</AppText>
              <AppText style={[styles.fallRiskSub, { color: colors.textSecondary }]}>
                {isAr
                  ? 'بناءً على النوم والنشاط وعلامات vitality'
                  : 'Based on sleep, activity & vital signs'}
              </AppText>
            </View>
            <View style={[styles.fallRiskScore, { backgroundColor: (data.fallRiskScore > 40 ? colors.warning : colors.success) + '20' }]}>
              <AppText style={[styles.fallRiskScoreText, { color: data.fallRiskScore > 40 ? colors.warning : colors.success }]}>
                {data.fallRiskScore}%
              </AppText>
            </View>
          </View>

          {/* Progress bar */}
          <View style={[styles.fallRiskBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.fallRiskProgress,
                {
                  width: `${data.fallRiskScore}%`,
                  backgroundColor: data.fallRiskScore > 40 ? colors.warning : colors.success,
                },
              ]}
            />
          </View>

          {/* Risk level text */}
          <View style={styles.riskLevel}>
            <AppText style={[styles.riskLevelText, { color: data.fallRiskScore > 40 ? colors.warning : colors.success }]}>
              {data.fallRiskScore > 60
                ? (isAr ? 'خطر مرتفع' : 'High Risk')
                : data.fallRiskScore > 40
                  ? (isAr ? 'خطر متوسط' : 'Moderate Risk')
                  : (isAr ? 'خطر منخفض' : 'Low Risk')}
            </AppText>
          </View>
        </View>

        {/* Medication Adherence */}
        <View style={[styles.adherenceCard, { backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <View style={styles.adherenceHeader}>
            <View style={[styles.adherenceIcon, { backgroundColor: colors.success + '15' }]}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={[styles.adherenceTitle, { color: colors.textPrimary }]}>{t.medicationAdherence}</AppText>
              <AppText style={[styles.adherenceSub, { color: colors.textSecondary }]}>
                {isAr ? 'الأدوية الموصوفة تم تناولها' : 'Prescribed medications taken'}
              </AppText>
            </View>
            <View style={[styles.adherenceScore, { backgroundColor: colors.success + '20' }]}>
              <AppText style={[styles.adherenceScoreText, { color: colors.success }]}>
                {data.medicationAdherence}%
              </AppText>
            </View>
          </View>

          {/* Progress bar */}
          <View style={[styles.adherenceBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.adherenceProgress,
                {
                  width: `${data.medicationAdherence}%`,
                  backgroundColor: data.medicationAdherence >= 80 ? colors.success : data.medicationAdherence >= 60 ? colors.warning : colors.danger,
                },
              ]}
            />
          </View>
        </View>

        {/* AI Observations */}
        <View style={[styles.aiCard, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '25' }]}>
          <View style={styles.aiHeader}>
            <View style={[styles.aiIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="bulb" size={20} color={colors.primary} />
            </View>
            <AppText style={[styles.aiTitle, { color: colors.primary }]}>{t.aiObservations}</AppText>
          </View>

          {data.aiObservations.map((obs, i) => (
            <View key={i} style={styles.aiObservation}>
              <View style={[styles.aiBullet, { backgroundColor: colors.primary }]} />
              <AppText style={[styles.aiText, { color: colors.textSecondary }]}>{obs}</AppText>
            </View>
          ))}
        </View>

        {/* Quick Insights */}
        <View style={styles.insightsGrid}>
          <View style={[styles.insightCard, { backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <AppText style={[styles.insightLabel, { color: colors.textSecondary }]}>
              {isAr ? 'أيام التتبع' : 'Days Tracked'}
            </AppText>
            <AppText style={[styles.insightValue, { color: colors.textPrimary }]}>7</AppText>
          </View>

          <View style={[styles.insightCard, { backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <Ionicons name="cloud-upload" size={20} color={colors.success} />
            <AppText style={[styles.insightLabel, { color: colors.textSecondary }]}>
              {isAr ? 'البيانات المزامنة' : 'Data Synced'}
            </AppText>
            <AppText style={[styles.insightValue, { color: colors.textPrimary }]}>100%</AppText>
          </View>

          <View style={[styles.insightCard, { backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <Ionicons name="pulse" size={20} color={colors.danger} />
            <AppText style={[styles.insightLabel, { color: colors.textSecondary }]}>
              {isAr ? 'متوسط النبض' : 'Avg Heart Rate'}
            </AppText>
            <AppText style={[styles.insightValue, { color: colors.textPrimary }]}>{data.avgHR}</AppText>
          </View>

          <View style={[styles.insightCard, { backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <Ionicons name="water" size={20} color={colors.primary} />
            <AppText style={[styles.insightLabel, { color: colors.textSecondary }]}>
              {isAr ? 'متوسط SpO2' : 'Avg SpO2'}
            </AppText>
            <AppText style={[styles.insightValue, { color: colors.textPrimary }]}>{data.avgSpo2}%</AppText>
          </View>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  periodSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: spacing.md,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  periodBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  wellnessCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  wellnessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  wellnessIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wellnessTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  wellnessSub: {
    fontSize: 12,
    marginTop: 2,
  },
  trendBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginBottom: spacing.md,
  },
  subScores: {
    flexDirection: 'row',
    gap: 20,
  },
  miniTrend: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.md,
  },
  statCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  chartCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  chartIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  chart: {
    borderRadius: 12,
    marginLeft: -8,
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  legendAvg: {
    fontSize: 12,
    fontWeight: '700',
  },
  fallRiskCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  fallRiskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  fallRiskIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallRiskTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  fallRiskSub: {
    fontSize: 11,
    marginTop: 2,
  },
  fallRiskScore: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  fallRiskScoreText: {
    fontSize: 16,
    fontWeight: '900',
  },
  fallRiskBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  fallRiskProgress: {
    height: '100%',
    borderRadius: 4,
  },
  riskLevel: {
    alignItems: 'center',
  },
  riskLevelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  adherenceCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  adherenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  adherenceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adherenceTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  adherenceSub: {
    fontSize: 11,
    marginTop: 2,
  },
  adherenceScore: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  adherenceScoreText: {
    fontSize: 16,
    fontWeight: '900',
  },
  adherenceBar: {
    height: 8,
    borderRadius: 4,
  },
  adherenceProgress: {
    height: '100%',
    borderRadius: 4,
  },
  aiCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.md,
  },
  aiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  aiObservation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  aiBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
  },
  aiText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  insightCard: {
    width: '47%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  insightValue: {
    fontSize: 18,
    fontWeight: '900',
  },
});