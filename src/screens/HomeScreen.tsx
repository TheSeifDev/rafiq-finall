import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
  Animated,
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
import {
  medicationService,
  type Medication,
} from "../services/medication.service";
import {
  notificationService,
  type AppNotification,
} from "../services/notification.service";
import { translations } from "../constants/translations";
import {
  generateRealisticWeek,
  buildWeeklyAnalytics,
} from "../utils/vitalsAnalytics";
import type { MainTabParamList, MainStackParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Home">,
  NativeStackScreenProps<MainStackParamList>
>;

/* ── Animated press wrapper ── */
function Pressable({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn = () =>
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  const onOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={onIn}
      onPressOut={onOut}
      onPress={onPress}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

/* ── Mini sparkline ── */
function MiniChart({
  data,
  color,
  height = 40,
  width: chartWidth,
}: {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}) {
  const { width: screenW } = useWindowDimensions();
  const w = chartWidth ?? screenW * 0.35;
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => ({
    x: i * step,
    y: height - ((v - min) / range) * (height - 8) - 4,
  }));

  return (
    <View style={{ height, width: w, position: "relative" }}>
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
              position: "absolute",
              left: prev.x,
              top: prev.y,
              width: len,
              height: 2,
              backgroundColor: color,
              borderRadius: 1,
              transform: [{ rotate: `${angle}deg` }],
              transformOrigin: "left center",
            }}
          />
        );
      })}
      {points.map((p, i) => (
        <View
          key={`d${i}`}
          style={{
            position: "absolute",
            left: p.x - 2.5,
            top: p.y - 2.5,
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

/* ────────── MAIN HOMESCREEN ────────── */
export function HomeScreen({ navigation }: Props): React.JSX.Element {
  const session = useAuthStore((s) => s.session);
  const { colors, darkMode, isRTL } = useTheme();
  const language = useAppStore((s) => s.language);
  const t = translations[language];
  const { width: screenW } = useWindowDimensions();
  const isAr = language === "ar";

  const [refreshing, setRefreshing] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [latestVitals, setLatestVitals] = useState<VitalsRecord | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  /* ── Data loading (untouched logic) ── */
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

  /* ── Derived data ── */
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (isAr) return hour < 12 ? "صباح الخير" : "مساء الخير";
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, [language]);

  const dateStr = useMemo(() => {
    const d = new Date();
    const locale = isAr ? "ar-EG" : "en-US";
    return d.toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }, [language]);

  const healthStatus = useMemo(() => {
    if (!latestVitals) return { level: "unknown", label: isAr ? "لا توجد بيانات" : "No data", color: colors.textSecondary };
    const hr = latestVitals.heart_rate ?? 0;
    const spo2 = latestVitals.oxygen_saturation ?? 100;
    if (hr > 120 || hr < 50 || spo2 < 90) return { level: "critical", label: isAr ? "يحتاج متابعة" : "Needs attention", color: colors.danger };
    if (hr > 100 || spo2 < 95) return { level: "warning", label: isAr ? "مقبول" : "Fair", color: colors.warning };
    return { level: "good", label: isAr ? "ممتاز" : "Excellent", color: colors.success };
  }, [latestVitals, isAr, colors]);

  const surfaceBg = darkMode ? "rgba(26, 35, 50, 0.85)" : "rgba(255, 255, 255, 0.92)";
  const cardBorder = darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

  /* ── Vitals data for health snapshot ── */
  const healthCards = [
    { icon: "heart", label: t.heartRate, value: latestVitals?.heart_rate?.toString() ?? "--", unit: t.bpm, color: colors.danger },
    { icon: "fitness", label: t.bloodPressure, value: latestVitals?.blood_pressure_systolic ? `${latestVitals.blood_pressure_systolic}/${latestVitals.blood_pressure_diastolic}` : "--/--", unit: "mmHg", color: colors.primary },
    { icon: "water", label: t.oxygenSaturation, value: latestVitals?.oxygen_saturation?.toString() ?? "--", unit: "%", color: colors.success },
    { icon: "thermometer", label: t.temperature, value: latestVitals?.temperature?.toString() ?? "--", unit: "°C", color: colors.warning },
  ];

  /* ── Quick actions ── */
  const quickActions = [
    { icon: "chatbubbles", label: t.chat, color: colors.primary, screen: "Chat" as const },
    { icon: "shield-checkmark", label: t.emergency, color: colors.danger, screen: "Emergency" as const },
    { icon: "medical", label: t.medications, color: colors.success, screen: null },
    { icon: "heart", label: t.vitals, color: colors.warning, screen: "Vitals" as const },
  ];

  /* ── Weekly trend ── */
  const week = useMemo(() => {
    const days = generateRealisticWeek(74, 120, 78, isAr);
    return buildWeeklyAnalytics(days);
  }, [language]);

  const actionW = (screenW - spacing.lg * 2 - spacing.sm * 1) / 2;
  const snapCardW = screenW * 0.38;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ════════ HERO SECTION ════════ */}
        <View style={[s.hero, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
          <View style={[s.heroTop, isRTL && s.rowReverse]}>
            <View style={{ flex: 1 }}>
              <AppText style={[s.greeting, { color: colors.textSecondary }]}>
                {greetingText} 👋
              </AppText>
              <AppText style={[s.heroName, { color: colors.textPrimary }]} numberOfLines={1}>
                {patientName || t.appName}
              </AppText>
              <AppText style={[s.heroDate, { color: colors.textSecondary }]}>
                {dateStr}
              </AppText>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate("NotificationCenter")}
              style={[s.notifBtn, { backgroundColor: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderColor: cardBorder }]}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
              {unreadCount > 0 && (
                <View style={[s.notifBadge, { backgroundColor: colors.danger }]}>
                  <AppText style={s.notifBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</AppText>
                </View>
              )}
            </TouchableOpacity>
          </View>
          {/* Health Status Badge */}
          <View style={[s.statusBadge, { backgroundColor: healthStatus.color + "12", borderColor: healthStatus.color + "25" }]}>
            <View style={[s.statusDot, { backgroundColor: healthStatus.color }]} />
            <AppText style={[s.statusLabel, { color: healthStatus.color }]}>
              {isAr ? "الحالة الصحية: " : "Health: "}{healthStatus.label}
            </AppText>
          </View>
        </View>

        {/* ════════ QUICK ACTIONS 2×2 ════════ */}
        <View style={s.section}>
          <AppText style={[s.sectionTitle, { color: colors.textPrimary }]}>{t.quickActions}</AppText>
          <View style={s.actionsGrid}>
            {quickActions.map((a, idx) => (
              <Pressable
                key={idx}
                onPress={() => {
                  if (a.screen) navigation.navigate(a.screen as any);
                  else navigation.navigate("Profile", { screen: "Medications" });
                }}
                style={[s.actionCard, { width: actionW, backgroundColor: surfaceBg, borderColor: cardBorder }]}
              >
                <View style={[s.actionIconWrap, { backgroundColor: a.color + "12" }]}>
                  <Ionicons name={a.icon as any} size={24} color={a.color} />
                </View>
                <AppText style={[s.actionLabel, { color: colors.textPrimary }]}>{a.label}</AppText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ════════ HEALTH SNAPSHOT (Horizontal) ════════ */}
        <View style={s.section}>
          <AppText style={[s.sectionTitle, { color: colors.textPrimary }]}>{t.healthSummary}</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.snapScroll}>
            {healthCards.map((card, idx) => (
              <View key={idx} style={[s.snapCard, { width: snapCardW, backgroundColor: surfaceBg, borderColor: cardBorder }]}>
                <View style={[s.snapIconWrap, { backgroundColor: card.color + "12" }]}>
                  <Ionicons name={card.icon as any} size={20} color={card.color} />
                </View>
                <AppText style={[s.snapLabel, { color: colors.textSecondary }]}>{card.label}</AppText>
                <View style={s.snapValueRow}>
                  <AppText style={[s.snapValue, { color: colors.textPrimary }]}>{card.value}</AppText>
                  <AppText style={[s.snapUnit, { color: colors.textSecondary }]}>{card.unit}</AppText>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ════════ INSIGHTS CARD ════════ */}
        <View style={s.section}>
          <View style={[s.insightCard, { backgroundColor: colors.primary + "0A", borderColor: colors.primary + "18" }]}>
            <View style={[s.insightIconWrap, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="sparkles" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText style={[s.insightTitle, { color: colors.textPrimary }]}>
                {isAr ? "تحليل صحتك" : "Health Insights"}
              </AppText>
              <AppText style={[s.insightBody, { color: colors.textSecondary }]}>
                {healthStatus.level === "good"
                  ? (isAr ? "مؤشراتك الحيوية مستقرة. حافظ على نمط حياتك الصحي." : "Your vitals are stable. Keep up the healthy lifestyle.")
                  : healthStatus.level === "warning"
                    ? (isAr ? "بعض المؤشرات تحتاج انتباه. راجع طبيبك." : "Some vitals need attention. Consult your doctor.")
                    : (isAr ? "ابدأ بتسجيل مؤشراتك الحيوية لتلقي تحليلات ذكية." : "Start recording vitals to receive smart insights.")}
              </AppText>
            </View>
          </View>
        </View>

        {/* ════════ WEEKLY TREND ════════ */}
        <View style={s.section}>
          <AppText style={[s.sectionTitle, { color: colors.textPrimary }]}>{t.weeklyTrend}</AppText>
          <View style={[s.trendCard, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
            {/* Stats row */}
            <View style={s.trendStatsRow}>
              {[
                { label: isAr ? "المتوسط" : "Avg", value: week.hr.avg, color: colors.danger },
                { label: isAr ? "الأعلى" : "High", value: week.hr.max, color: colors.warning },
                { label: isAr ? "الأدنى" : "Low", value: week.hr.min, color: colors.success },
              ].map((stat, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <View style={[s.trendDiv, { backgroundColor: cardBorder }]} />}
                  <View style={s.trendStat}>
                    <AppText style={[s.trendStatLabel, { color: colors.textSecondary }]}>{stat.label}</AppText>
                    <AppText style={[s.trendStatVal, { color: stat.color }]}>{stat.value}</AppText>
                    <AppText style={[s.trendStatUnit, { color: colors.textSecondary }]}>{t.bpm}</AppText>
                  </View>
                </React.Fragment>
              ))}
            </View>
            {/* Charts */}
            <View style={s.chartRow}>
              <View style={s.chartCol}>
                <View style={s.chartLabelRow}>
                  <View style={[s.chartDot, { backgroundColor: colors.danger }]} />
                  <AppText style={[s.chartLabel, { color: colors.textSecondary }]}>{t.heartRate}</AppText>
                </View>
                <MiniChart data={week.days.map((d) => d.hr)} color={colors.danger} />
              </View>
              <View style={[s.chartDivider, { backgroundColor: cardBorder }]} />
              <View style={s.chartCol}>
                <View style={s.chartLabelRow}>
                  <View style={[s.chartDot, { backgroundColor: colors.primary }]} />
                  <AppText style={[s.chartLabel, { color: colors.textSecondary }]}>{t.bloodPressure}</AppText>
                </View>
                <MiniChart data={week.days.map((d) => d.sys)} color={colors.primary} />
              </View>
            </View>
            {/* Day labels */}
            <View style={[s.chartDays, { borderTopColor: cardBorder }]}>
              {week.days.map((d, i) => (
                <AppText key={`${d.day}-${i}`} style={[s.chartDayText, { color: colors.textSecondary }]}>{d.day}</AppText>
              ))}
            </View>
          </View>
        </View>

        {/* ════════ TODAY'S MEDS ════════ */}
        <View style={s.section}>
          <View style={[s.sectionHeader, isRTL && s.rowReverse]}>
            <AppText style={[s.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>{t.todayMeds}</AppText>
            {medications.length > 0 && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate("Profile", { screen: "Medications" })}>
                <AppText style={[s.viewAll, { color: colors.primary }]}>{t.viewAll}</AppText>
              </TouchableOpacity>
            )}
          </View>
          <View style={[s.medsCard, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
            {medications.length > 0 ? (
              medications.slice(0, 4).map((med, idx) => {
                const timeLabel = med.time_of_day?.join(", ") ?? "";
                const isLast = idx === Math.min(medications.length - 1, 3);
                return (
                  <View key={med.id} style={[s.medRow, !isLast && { borderBottomWidth: 1, borderBottomColor: cardBorder }]}>
                    <View style={[s.medDot, { backgroundColor: colors.success }]} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText style={[s.medName, { color: colors.textPrimary }]}>{med.name}</AppText>
                      <AppText style={[s.medDose, { color: colors.textSecondary }]}>{med.dosage} · {med.frequency}</AppText>
                    </View>
                    {timeLabel ? (
                      <View style={[s.medTimeBadge, { backgroundColor: colors.primary + "12" }]}>
                        <AppText style={[s.medTimeText, { color: colors.primary }]}>{timeLabel}</AppText>
                      </View>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <View style={s.emptyMeds}>
                <Ionicons name="medical-outline" size={32} color={colors.textSecondary + "60"} />
                <AppText style={[s.emptyText, { color: colors.textSecondary }]}>{t.noMedsToday}</AppText>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

/* ────────── STYLES ────────── */
const s = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  rowReverse: { flexDirection: "row-reverse" },

  /* Hero */
  hero: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.md },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting: { fontSize: 14, fontWeight: "500" },
  heroName: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5, marginTop: 4 },
  heroDate: { fontSize: 13, fontWeight: "500", marginTop: 4 },
  notifBtn: { width: 46, height: 46, borderRadius: radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  notifBadge: { position: "absolute", top: -4, right: -4, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  notifBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  statusBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 13, fontWeight: "700" },

  /* Sections */
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: spacing.md },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  viewAll: { fontSize: 14, fontWeight: "600" },

  /* Quick Actions 2x2 */
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actionCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  actionIconWrap: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 14, fontWeight: "700" },

  /* Health Snapshot horizontal */
  snapScroll: { gap: spacing.sm, paddingRight: spacing.lg },
  snapCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: 8 },
  snapIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  snapLabel: { fontSize: 11, fontWeight: "600" },
  snapValueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  snapValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  snapUnit: { fontSize: 11, fontWeight: "600" },

  /* Insights */
  insightCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1 },
  insightIconWrap: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  insightTitle: { fontSize: 15, fontWeight: "700" },
  insightBody: { fontSize: 13, fontWeight: "500", lineHeight: 20 },

  /* Trend card */
  trendCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  trendStatsRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  trendStat: { flex: 1, alignItems: "center", gap: 2 },
  trendStatLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  trendStatVal: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  trendStatUnit: { fontSize: 10, fontWeight: "600" },
  trendDiv: { width: 1, height: 28, borderRadius: 1 },
  chartRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-start" },
  chartCol: { alignItems: "center", gap: 8 },
  chartLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  chartDot: { width: 8, height: 8, borderRadius: 4 },
  chartLabel: { fontSize: 12, fontWeight: "600" },
  chartDivider: { width: 1, height: "80%", alignSelf: "center" },
  chartDays: { flexDirection: "row", justifyContent: "space-around", paddingTop: spacing.xs, borderTopWidth: 1 },
  chartDayText: { fontSize: 10, fontWeight: "600" },

  /* Medications */
  medsCard: { borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
  medRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.sm },
  medDot: { width: 8, height: 8, borderRadius: 4 },
  medName: { fontSize: 15, fontWeight: "600" },
  medDose: { fontSize: 12, fontWeight: "500" },
  medTimeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  medTimeText: { fontSize: 11, fontWeight: "700" },
  emptyMeds: { alignItems: "center", padding: spacing.xl, gap: spacing.sm },
  emptyText: { fontSize: 14, fontWeight: "500" },
});
