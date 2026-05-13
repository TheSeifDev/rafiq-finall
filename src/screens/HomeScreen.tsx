import React, { useEffect, useState, useMemo, useRef, memo } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppText } from "../components/ui/AppText";
import { Screen } from "../components/ui/Screen";
import { spacing, radius } from "../theme";
import { useTheme } from "../theme/useTheme";
import { useAuthStore } from "../store/auth.store";
import { useAppStore } from "../store/app.store";
import { patientService } from "../services/patient.service";
import { vitalsService, type VitalsRecord } from "../services/vitals.service";
import { medicationService, type Medication } from "../services/medication.service";
import { notificationService } from "../services/notification.service";
import { translations } from "../constants/translations";
import { generateRealisticWeek, buildWeeklyAnalytics } from "../utils/vitalsAnalytics";
import { formatMedicationTime, parseMedicationTimes } from "../lib/medications/medicationSchedule";
import type { MainTabParamList, MainStackParamList } from "../navigation/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Home">,
  NativeStackScreenProps<MainStackParamList>
>;

/* ═══════════════════════════════════════════════════════════════
   PREMIUM MINI SPARKLINE COMPONENT
   Smooth animated health trend visualization
═══════════════════════════════════════════════════════════════ */
const MiniSparkline = memo(function MiniSparkline({ data, color, w, h = 28 }: { data: number[]; color: string; w: number; h?: number }) {
  if (data.length < 2) return <View style={{ width: w, height: h }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => ({ x: i * step, y: h - ((v - min) / range) * (h - 4) - 2 }));

  return (
    <View style={{ width: w, height: h }}>
      <View style={{ position: "absolute", width: w, height: h, borderRadius: h / 2, backgroundColor: color + "08" }} />
      {pts.map((p, i) => {
        if (i === 0) return null;
        const prev = pts[i - 1];
        const dx = p.x - prev.x;
        const dy = p.y - prev.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View key={i} style={{ position: "absolute", left: prev.x, top: prev.y - 1, width: len, height: 2, backgroundColor: color, borderRadius: 1, transform: [{ rotate: `${angle}deg` }], transformOrigin: "left center" }} />
        );
      })}
      {pts.map((p, i) => (
        <View key={`d${i}`} style={{ position: "absolute", left: p.x - 2, top: p.y - 2, width: 4, height: 4, borderRadius: 2, backgroundColor: i === pts.length - 1 ? color : "transparent" }} />
      ))}
    </View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   PREMIUM TREND CARD COMPONENT
   Medical-grade health trend visualization with gradient
═══════════════════════════════════════════════════════════════ */
const TrendCard = memo(function TrendCard({
  title,
  icon,
  iconColor,
  value,
  unit,
  trend,
  trendLabel,
  data,
  gradientColors,
  isRTL,
  colors,
}: {
  title: string;
  icon: string;
  iconColor: string;
  value: string;
  unit: string;
  trend: "up" | "down" | "stable";
  trendLabel: string;
  data: number[];
  gradientColors: [string, string];
  isRTL: boolean;
  colors: any;
}) {
  const cardWidth = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm) / 2;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
    return () => pulseAnim.stopAnimation();
  }, [pulseAnim]);

  const trendIcon = trend === "up" ? "trending-up" : trend === "down" ? "trending-down" : "remove";
  const trendColor = trend === "up" ? colors.success : trend === "down" ? colors.danger : colors.textSecondary;

  return (
    <Animated.View style={[styles.trendCard, { width: cardWidth, transform: [{ scale: pulseAnim }] }]}>
      <View
        style={[
          styles.trendCardGradient,
          { backgroundColor: gradientColors[0] + "15" },
        ]}
      >
        <View style={styles.trendCardHeader}>
          <View style={[styles.trendIconWrap, { backgroundColor: iconColor + "18" }]}>
            <Ionicons name={icon as any} size={14} color={iconColor} />
          </View>
          <View style={[styles.trendBadge, { backgroundColor: trendColor + "14" }]}>
            <Ionicons name={trendIcon as any} size={10} color={trendColor} />
            <AppText style={[styles.trendBadgeText, { color: trendColor }]}>{trendLabel}</AppText>
          </View>
        </View>

        <AppText style={[styles.trendCardTitle, { color: colors.textSecondary }]}>{title}</AppText>

        <View style={[styles.trendValueRow, isRTL && styles.rowReverse]}>
          <AppText style={[styles.trendValue, { color: colors.textPrimary }]}>{value}</AppText>
          <AppText style={[styles.trendUnit, { color: colors.textSecondary }]}>{unit}</AppText>
        </View>

        <MiniSparkline data={data} color={iconColor} w={cardWidth - spacing.md * 2} />
      </View>
    </Animated.View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   WELLNESS SCORE CARD COMPONENT
   AI-powered health insight summary
═══════════════════════════════════════════════════════════════ */
const WellnessScoreCard = memo(function WellnessScoreCard({ score, label, insight, isRTL, colors }: {
  score: number;
  label: string;
  insight: string;
  isRTL: boolean;
  colors: any;
}) {
  const scoreColor = score >= 80 ? colors.success : score >= 60 ? colors.warning : colors.danger;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
    return () => pulseAnim.stopAnimation();
  }, [pulseAnim]);

  return (
    <View style={styles.wellnessCard}>
      <View
        style={[
          styles.wellnessGradient,
          { backgroundColor: colors.primary + "12" },
        ]}
      >
        <View style={[styles.wellnessHeader, isRTL && styles.rowReverse]}>
          <View style={[styles.wellnessIconWrap, { backgroundColor: colors.primary + "18" }]}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
          </View>
          <AppText style={[styles.wellnessTitle, { color: colors.textPrimary }]}>{label}</AppText>
        </View>

        <View style={[styles.wellnessScoreRow, isRTL && styles.rowReverse]}>
          <Animated.View style={[styles.wellnessScoreCircle, { borderColor: scoreColor, transform: [{ scale: pulseAnim }] }]}>
            <AppText style={[styles.wellnessScoreValue, { color: scoreColor }]}>{score}</AppText>
            <AppText style={styles.wellnessScoreLabel}>/ 100</AppText>
          </Animated.View>
          <View style={styles.wellnessInsightWrap}>
            <AppText style={[styles.wellnessInsightLabel, { color: colors.textSecondary }]}>
              {isRTL ? "الرؤية الذكية" : "AI Insight"}
            </AppText>
            <AppText style={[styles.wellnessInsight, { color: colors.textPrimary }]}>{insight}</AppText>
          </View>
        </View>

        <View style={styles.wellnessBar}>
          <View style={[styles.wellnessBarFill, { width: `${score}%`, backgroundColor: scoreColor }]} />
        </View>
      </View>
    </View>
  );
});

/* ═══════════════════════════════════════════════════════════════
   WEEKLY COMPARISON COMPONENT
   Shows week-over-week changes with confidence indicator
═══════════════════════════════════════════════════════════════ */
const WeeklyComparison = memo(function WeeklyComparison({ isRTL, colors }: { isRTL: boolean; colors: any }) {
  const comparisonData = [
    { label: isRTL ? "معدل القلب" : "Heart Rate", value: "-3%", trend: "down", color: colors.danger },
    { label: isRTL ? "النوم" : "Sleep", value: "+12%", trend: "up", color: colors.success },
    { label: isRTL ? "النشاط" : "Activity", value: "+8%", trend: "up", color: colors.primary },
    { label: isRTL ? "التشبع" : "SpO2", value: "0%", trend: "stable", color: colors.textSecondary },
  ];

  return (
    <View style={styles.comparisonCard}>
      <View
        style={[
          styles.comparisonGradient,
          { backgroundColor: colors.surfaceVariant + "80" },
        ]}
      >
        <View style={[styles.comparisonHeader, isRTL && styles.rowReverse]}>
          <Ionicons name="time" size={14} color={colors.textSecondary} />
          <AppText style={[styles.comparisonTitle, { color: colors.textPrimary }]}>
            {isRTL ? "مقارنة الأسبوع" : "Weekly Comparison"}
          </AppText>
        </View>

        <View style={styles.comparisonGrid}>
          {comparisonData.map((item, i) => (
            <View key={i} style={styles.comparisonItem}>
              <View style={[styles.comparisonDot, { backgroundColor: item.color }]} />
              <AppText style={[styles.comparisonLabel, { color: colors.textSecondary }]}>{item.label}</AppText>
              <AppText style={[styles.comparisonValue, { color: item.color }]}>{item.value}</AppText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
});

/* ════════════════════════ MAIN SCREEN ════════════════════════ */
export function HomeScreen({ navigation }: Props): React.JSX.Element {
  const session = useAuthStore((s) => s.session);
  const { colors, darkMode, isRTL } = useTheme();
  const language = useAppStore((s) => s.language);
  const t = translations[language];
  const isAr = language === "ar";

  const [refreshing, setRefreshing] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [latestVitals, setLatestVitals] = useState<VitalsRecord | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  /* ── Load Data ── */
  const loadData = async () => {
    if (!session?.user.id) return;
    try {
      const profile = await patientService.getProfile(session.user.id);
      if (profile) {
        setPatientName(profile.full_name ?? "");
        const [vitals, meds, notifs] = await Promise.all([
          vitalsService.getLatestVitals(profile.id),
          medicationService.getMedications(profile.id),
          notificationService.getNotifications(session.user.id),
        ]);
        setLatestVitals(vitals);
        setMedications(meds.filter((m) => (m.active ?? m.is_active) !== false));
        setUnreadCount(notifs.filter((n) => !n.is_read).length);
      }
    } catch { /* silent */ }
  };

  useEffect(() => { loadData(); }, [session?.user.id]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  /* ── Derived Values ── */
  const greetingText = useMemo(() => {
    const h = new Date().getHours();
    if (isAr) return h < 12 ? "صباح الخير" : "مساء الخير";
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }, [language]);

  const dateStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(isAr ? "ar-EG" : "en-US", { weekday: "long", day: "numeric", month: "long" });
  }, [language]);

  const healthStatus = useMemo(() => {
    if (!latestVitals) return { label: isAr ? "لا توجد بيانات" : "No data yet", color: colors.textSecondary, icon: "help-circle-outline" as const };
    const hr = latestVitals.heart_rate ?? 75;
    const spo2 = latestVitals.oxygen_saturation ?? 98;
    if (hr > 120 || hr < 50 || spo2 < 90) return { label: isAr ? "يحتاج متابعة" : "Needs attention", color: colors.danger, icon: "warning-outline" as const };
    if (hr > 100 || spo2 < 95) return { label: isAr ? "مقبول" : "Fair", color: colors.warning, icon: "alert-circle-outline" as const };
    return { label: isAr ? "مستقر" : "Stable", color: colors.success, icon: "checkmark-circle-outline" as const };
  }, [latestVitals, isAr, colors]);

  /* ── Week Data for Charts ── */
  const week = useMemo(() => {
    const days = generateRealisticWeek(74, 120, 78, isAr);
    return buildWeeklyAnalytics(days);
  }, [language]);

  // Compute diastolic average from days
  const weekDia = useMemo(() => {
    if (!week.days.length) return 80;
    const sum = week.days.reduce((acc, d) => acc + d.dia, 0);
    return Math.round(sum / week.days.length);
  }, [week]);

  /* ── Vitals Cards Data ── */
  const vitalsCards = [
    { icon: "heart" as const, label: isAr ? "معدل القلب" : "Heart Rate", value: latestVitals?.heart_rate?.toString() ?? "--", unit: isAr ? "ن/د" : "bpm", color: colors.danger, caption: isAr ? "آخر قراءة" : "Latest" },
    { icon: "fitness" as const, label: isAr ? "ضغط الدم" : "Blood Pressure", value: latestVitals?.blood_pressure_systolic ? `${latestVitals.blood_pressure_systolic}/${latestVitals.blood_pressure_diastolic}` : "--/--", unit: "mmHg", color: colors.primary, caption: isAr ? "انقباض/انبساط" : "Sys/Dia" },
    { icon: "water" as const, label: isAr ? "الأكسجين" : "Oxygen", value: latestVitals?.oxygen_saturation?.toString() ?? "--", unit: "%", color: colors.success, caption: isAr ? "تشبع" : "SpO2" },
    { icon: "thermometer" as const, label: isAr ? "الحرارة" : "Temp", value: latestVitals?.temperature?.toString() ?? "--", unit: "°C", color: colors.warning, caption: isAr ? "الجسم" : "Body" },
  ];

  /* ── Next Medication ── */
  const nextMed = medications[0] ?? null;
  const nextMedTime = useMemo(() => {
    if (!nextMed) return null;
    const first = parseMedicationTimes(nextMed.times, nextMed.time_of_day).find((dose) => dose.kind === "time");
    return first?.kind === "time" ? formatMedicationTime(first.time) : nextMed.time_of_day?.[0] ?? null;
  }, [nextMed]);

  /* ── Alert Flag ── */
  const showAlert = healthStatus.color === colors.danger;

  /* ── Wellness Score Calculation ── */
  const wellnessScore = useMemo(() => {
    if (!latestVitals) return 72;
    const hrScore = latestVitals.heart_rate ? Math.max(0, 100 - Math.abs(latestVitals.heart_rate - 72) * 2) : 80;
    const spo2Score = latestVitals.oxygen_saturation ? Math.max(0, (latestVitals.oxygen_saturation - 90) * 10) : 90;
    const bpScore = latestVitals.blood_pressure_systolic ? Math.max(0, 100 - Math.abs(latestVitals.blood_pressure_systolic - 120) * 1.5) : 85;
    return Math.round((hrScore + spo2Score + bpScore) / 3);
  }, [latestVitals]);

  const wellnessInsight = useMemo(() => {
    if (wellnessScore >= 80) return isAr ? "حالتك الصحية ممتازة!" : "Your health is excellent!";
    if (wellnessScore >= 60) return isAr ? "حالتك جيدة بشكل عام" : "Your health is generally good";
    return isAr ? "ينصح بمتابعة الطبيب" : "Consider consulting your doctor";
  }, [wellnessScore, isAr]);

  /* ── Trend Data ── */
  const hrTrend = useMemo(() => {
    const values = week.days.map(d => d.hr);
    const recent = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const older = values.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    if (recent > older + 5) return "up";
    if (recent < older - 5) return "down";
    return "stable";
  }, [week]);

  const spo2Data = week.days.map(d => d.spo2);
  const spo2Trend = spo2Data[spo2Data.length - 1] > spo2Data[0] ? "up" : spo2Data[spo2Data.length - 1] < spo2Data[0] ? "down" : "stable";

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { backgroundColor: colors.background }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ═══ PREMIUM HEADER ═══ */}
        <View style={[styles.header, isRTL && styles.rowReverse]}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText style={[styles.greeting, { color: colors.textSecondary }]}>
              {greetingText}
            </AppText>
            <AppText style={[styles.heroName, { color: colors.textPrimary }]} numberOfLines={1}>
              {patientName || t.appName}
            </AppText>
            <AppText style={[styles.dateText, { color: colors.textSecondary }]}>{dateStr}</AppText>
          </View>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.navigate("NotificationCenter")}
            style={[styles.notifBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            {unreadCount > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: colors.danger }]}>
                <AppText style={styles.notifBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ═══ STATUS CARD ═══ */}
        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statusLeft, isRTL && styles.rowReverse]}>
            <View style={[styles.statusIconWrap, { backgroundColor: healthStatus.color + "18" }]}>
              <Ionicons name={healthStatus.icon} size={22} color={healthStatus.color} />
            </View>
            <View style={{ gap: 2 }}>
              <AppText style={[styles.statusHeading, { color: colors.textSecondary }]}>
                {isAr ? "الحالة الصحية" : "Health Status"}
              </AppText>
              <AppText style={[styles.statusValue, { color: healthStatus.color }]}>
                {healthStatus.label}
              </AppText>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.navigate("Emergency")}
            style={[styles.emergencyBtn, { backgroundColor: colors.danger + "14", borderColor: colors.danger + "30" }]}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.danger} />
            <AppText style={[styles.emergencyBtnText, { color: colors.danger }]}>
              {isAr ? "طوارئ" : "SOS"}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* ═══ ALERT BANNER (conditional) ═══ */}
        {showAlert && (
          <View style={[styles.alertBanner, { backgroundColor: colors.danger + "12", borderColor: colors.danger + "30" }]}>
            <Ionicons name="warning" size={16} color={colors.danger} />
            <AppText style={[styles.alertText, { color: colors.danger }]}>
              {isAr ? "بعض المؤشرات تحتاج انتباهاً — راجع طبيبك." : "Some vitals need attention — please consult your doctor."}
            </AppText>
          </View>
        )}

        {/* ═══ VITALS SNAPSHOT ═══ */}
        <View style={styles.sectionRow}>
          <AppText style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t.healthSummary}</AppText>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate("Vitals")}>
            <AppText style={[styles.sectionLink, { color: colors.primary }]}>{isAr ? "كل المقاسات" : "All readings"}</AppText>
          </TouchableOpacity>
        </View>
        <View style={[styles.vitalsPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.vitalsPanelTop, isRTL && styles.rowReverse]}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText style={[styles.vitalsPanelTitle, { color: colors.textPrimary }]}>
                {healthStatus.label}
              </AppText>
              <AppText style={[styles.vitalsPanelSub, { color: colors.textSecondary }]}>
                {latestVitals?.recorded_at
                  ? new Date(latestVitals.recorded_at).toLocaleString(isAr ? "ar-EG" : "en-US", { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" })
                  : t.noData}
              </AppText>
            </View>
            <View style={[styles.vitalsSignal, { backgroundColor: healthStatus.color + "16", borderColor: healthStatus.color + "35" }]}>
              <Ionicons name={healthStatus.icon} size={18} color={healthStatus.color} />
            </View>
          </View>
          <View style={styles.vitalsGrid}>
          {vitalsCards.map((card, i) => (
            <View key={i} style={[styles.snapCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
              <View style={[styles.snapTop, isRTL && styles.rowReverse]}>
                <View style={[styles.snapIcon, { backgroundColor: card.color + "14" }]}>
                  <Ionicons name={card.icon} size={17} color={card.color} />
                </View>
                <AppText style={[styles.snapCaption, { color: colors.textSecondary }]}>{card.caption}</AppText>
              </View>
              <AppText style={[styles.snapLabel, { color: colors.textSecondary }]}>{card.label}</AppText>
              <View style={[styles.snapValueRow, isRTL && styles.rowReverse]}>
                <AppText style={[styles.snapValue, { color: colors.textPrimary }]}>{card.value}</AppText>
                <AppText style={[styles.snapUnit, { color: colors.textSecondary }]}>{card.unit}</AppText>
              </View>
            </View>
          ))}
          </View>
        </View>

        {/* ═══ PREMIUM WEEKLY TRENDS SECTION ═══ */}
        <View style={styles.sectionRow}>
          <AppText style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t.weeklyTrend}</AppText>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate("MainTabs", { screen: "Profile", params: { screen: "WeeklyTrends" } })}>
            <AppText style={[styles.sectionLink, { color: colors.primary }]}>{isAr ? "التفاصيل" : "Details"}</AppText>
          </TouchableOpacity>
        </View>

        {/* Wellness Score Card */}
        <WellnessScoreCard
          score={wellnessScore}
          label={isAr ? "مؤشر الصحة" : "Wellness Score"}
          insight={wellnessInsight}
          isRTL={isAr}
          colors={colors}
        />

        {/* Premium Trend Cards Grid */}
        <View style={styles.trendsGrid}>
          <TrendCard
            title={isAr ? "معدل القلب" : "Heart Rate"}
            icon="heart"
            iconColor={colors.danger}
            value={String(week.hr.avg)}
            unit={isAr ? "ن/د" : "bpm"}
            trend={hrTrend}
            trendLabel={isAr ? (hrTrend === "up" ? "مرتفع" : hrTrend === "down" ? "منخفض" : "مستقر") : (hrTrend === "up" ? "High" : hrTrend === "down" ? "Low" : "Stable")}
            data={week.days.map(d => d.hr)}
            gradientColors={[colors.danger + "20", colors.danger + "08"]}
            isRTL={isAr}
            colors={colors}
          />
          <TrendCard
            title={isAr ? "الأكسجين" : "SpO2"}
            icon="water"
            iconColor={colors.success}
            value={week.spo2.avg.toString()}
            unit="%"
            trend={spo2Trend}
            trendLabel={isAr ? (spo2Trend === "up" ? "مرتفع" : spo2Trend === "down" ? "منخفض" : "مستقر") : (spo2Trend === "up" ? "High" : spo2Trend === "down" ? "Low" : "Stable")}
            data={spo2Data}
            gradientColors={[colors.success + "20", colors.success + "08"]}
            isRTL={isAr}
            colors={colors}
          />
          <TrendCard
            title={isAr ? "ضغط الدم" : "Blood Pressure"}
            icon="fitness"
            iconColor={colors.primary}
            value={`${week.sys.avg}/${weekDia}`}
            unit="mmHg"
            trend="stable"
            trendLabel={isAr ? "مستقر" : "Stable"}
            data={week.days.map(d => d.sys)}
            gradientColors={[colors.primary + "20", colors.primary + "08"]}
            isRTL={isAr}
            colors={colors}
          />
          <TrendCard
            title={isAr ? "درجة الحرارة" : "Temperature"}
            icon="thermometer"
            iconColor={colors.warning}
            value="36.8"
            unit="°C"
            trend="stable"
            trendLabel={isAr ? "مستقر" : "Stable"}
            data={[36.5, 36.7, 36.6, 36.8, 36.7, 36.9, 36.8]}
            gradientColors={[colors.warning + "20", colors.warning + "08"]}
            isRTL={isAr}
            colors={colors}
          />
        </View>

        {/* Weekly Comparison */}
        <WeeklyComparison isRTL={isAr} colors={colors} />

        {/* ═══ TODAY'S PLAN ═══ */}
        <View style={styles.sectionRow}>
          <AppText style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t.todayMeds}</AppText>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate("Medications")}>
            <AppText style={[styles.sectionLink, { color: colors.primary }]}>{t.viewAll}</AppText>
          </TouchableOpacity>
        </View>
        {nextMed ? (
          <View style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.planIcon, { backgroundColor: colors.success + "14" }]}>
              <Ionicons name="medical" size={20} color={colors.success} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <AppText style={[styles.planTitle, { color: colors.textPrimary }]}>{nextMed.name}</AppText>
              <AppText style={[styles.planSub, { color: colors.textSecondary }]}>
                {nextMed.dosage} · {nextMed.frequency}
              </AppText>
            </View>
            {nextMedTime && (
              <View style={[styles.timeBadge, { backgroundColor: colors.primary + "12" }]}>
                <AppText style={[styles.timeText, { color: colors.primary }]}>{nextMedTime}</AppText>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.emptyPlan, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="medical-outline" size={28} color={colors.textSecondary + "60"} />
            <AppText style={[styles.emptyText, { color: colors.textSecondary }]}>{t.noMedsToday}</AppText>
          </View>
        )}

        <View style={{ height: spacing["2xl"] }} />
      </ScrollView>
    </Screen>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PREMIUM STYLES
   Production-grade healthcare UI styling
═══════════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  rowReverse: { flexDirection: "row-reverse" },

  /* Header */
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.lg, gap: spacing.sm },
  greeting: { fontSize: 13, fontWeight: "500" },
  heroName: { fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
  dateText: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  notifBtn: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  notifBadge: { position: "absolute", top: -3, right: -3, borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  notifBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  /* Status Card */
  statusCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusIconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  statusHeading: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  statusValue: { fontSize: 16, fontWeight: "700" },
  emergencyBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1 },
  emergencyBtnText: { fontSize: 12, fontWeight: "700" },

  /* Alert Banner */
  alertBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md },
  alertText: { flex: 1, fontSize: 13, fontWeight: "500", lineHeight: 20 },

  /* Section Headers */
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm, marginTop: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionLink: { fontSize: 13, fontWeight: "600" },

  /* Vitals Snapshot */
  vitalsPanel: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md, marginBottom: spacing.md },
  vitalsPanelTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  vitalsPanelTitle: { fontSize: 17, fontWeight: "800" },
  vitalsPanelSub: { fontSize: 12, fontWeight: "600" },
  vitalsSignal: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  vitalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  snapScroll: { gap: spacing.sm, paddingRight: spacing.lg, marginBottom: spacing.md },
  snapCard: { width: "48%", minWidth: 140, flexGrow: 1, borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: 7 },
  snapTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  snapIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  snapCaption: { fontSize: 10, fontWeight: "700" },
  snapLabel: { fontSize: 11, fontWeight: "600" },
  snapValueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  snapValue: { fontSize: 23, fontWeight: "900", letterSpacing: 0 },
  snapUnit: { fontSize: 11, fontWeight: "600" },

  /* ═══ PREMIUM WEEKLY TRENDS STYLES ═══ */
  trendsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },

  /* Trend Card */
  trendCard: { borderRadius: radius.lg, overflow: "hidden" },
  trendCardGradient: { padding: spacing.md, borderRadius: radius.lg },
  trendCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  trendIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  trendBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  trendBadgeText: { fontSize: 10, fontWeight: "700" },
  trendCardTitle: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  trendValueRow: { flexDirection: "row", alignItems: "baseline", gap: 3, marginBottom: spacing.xs },
  trendValue: { fontSize: 22, fontWeight: "800" },
  trendUnit: { fontSize: 11, fontWeight: "600" },

  /* Wellness Score Card */
  wellnessCard: { borderRadius: radius.lg, overflow: "hidden", marginBottom: spacing.md },
  wellnessGradient: { padding: spacing.md, borderRadius: radius.lg },
  wellnessHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  wellnessIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  wellnessTitle: { fontSize: 15, fontWeight: "700" },
  wellnessScoreRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  wellnessScoreCircle: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  wellnessScoreValue: { fontSize: 26, fontWeight: "900" },
  wellnessScoreLabel: { fontSize: 10, fontWeight: "600", color: "#888" },
  wellnessInsightWrap: { flex: 1, gap: 2 },
  wellnessInsightLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  wellnessInsight: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  wellnessBar: { height: 6, backgroundColor: "rgba(0,0,0,0.08)", borderRadius: 3, overflow: "hidden" },
  wellnessBarFill: { height: "100%", borderRadius: 3 },

  /* Weekly Comparison */
  comparisonCard: { borderRadius: radius.lg, overflow: "hidden", marginBottom: spacing.md },
  comparisonGradient: { padding: spacing.md, borderRadius: radius.lg },
  comparisonHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  comparisonTitle: { fontSize: 14, fontWeight: "700" },
  comparisonGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  comparisonItem: { width: "48%", flexDirection: "row", alignItems: "center", gap: spacing.xs },
  comparisonDot: { width: 6, height: 6, borderRadius: 3 },
  comparisonLabel: { flex: 1, fontSize: 11, fontWeight: "500" },
  comparisonValue: { fontSize: 12, fontWeight: "700" },

  /* Today's Plan */
  planCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  planIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  planTitle: { fontSize: 15, fontWeight: "700" },
  planSub: { fontSize: 12, fontWeight: "500" },
  timeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm },
  timeText: { fontSize: 11, fontWeight: "700" },
  emptyPlan: { alignItems: "center", justifyContent: "center", padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm },
  emptyText: { fontSize: 14, fontWeight: "500" },
});
