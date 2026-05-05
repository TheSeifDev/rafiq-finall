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
import { medicationService, type Medication } from "../services/medication.service";
import { notificationService } from "../services/notification.service";
import { translations } from "../constants/translations";
import { generateRealisticWeek, buildWeeklyAnalytics } from "../utils/vitalsAnalytics";
import type { MainTabParamList, MainStackParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Home">,
  NativeStackScreenProps<MainStackParamList>
>;

/* ── Mini Sparkline ── */
function MiniSparkline({ data, color, w, h = 36 }: { data: number[]; color: string; w: number; h?: number }) {
  if (data.length < 2) return <View style={{ width: w, height: h }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => ({ x: i * step, y: h - ((v - min) / range) * (h - 6) - 3 }));
  return (
    <View style={{ width: w, height: h }}>
      {pts.map((p, i) => {
        if (i === 0) return null;
        const prev = pts[i - 1];
        const dx = p.x - prev.x;
        const dy = p.y - prev.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View key={i} style={{ position: "absolute", left: prev.x, top: prev.y, width: len, height: 2, backgroundColor: color, borderRadius: 1, transform: [{ rotate: `${angle}deg` }], transformOrigin: "left center" }} />
        );
      })}
      {pts.map((p, i) => (
        <View key={`d${i}`} style={{ position: "absolute", left: p.x - 2.5, top: p.y - 2.5, width: 5, height: 5, borderRadius: 3, backgroundColor: i === pts.length - 1 ? color : color + "80" }} />
      ))}
    </View>
  );
}

/* ════════════════════════ MAIN ════════════════════════ */
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

  /* ── Logic untouched ── */
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
    } catch { /* silent */ }
  };

  useEffect(() => { loadData(); }, [session?.user.id]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  /* ── Derived ── */
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

  /* ── Week data for mini chart ── */
  const week = useMemo(() => {
    const days = generateRealisticWeek(74, 120, 78, isAr);
    return buildWeeklyAnalytics(days);
  }, [language]);

  /* ── Vitals cards ── */
  const vitalsCards = [
    { icon: "heart" as const, label: isAr ? "معدل القلب" : "Heart Rate", value: latestVitals?.heart_rate?.toString() ?? "--", unit: isAr ? "ن/د" : "bpm", color: colors.danger },
    { icon: "fitness" as const, label: isAr ? "ضغط الدم" : "Blood Pressure", value: latestVitals?.blood_pressure_systolic ? `${latestVitals.blood_pressure_systolic}/${latestVitals.blood_pressure_diastolic}` : "--/--", unit: "mmHg", color: colors.primary },
    { icon: "water" as const, label: isAr ? "الأكسجين" : "Oxygen", value: latestVitals?.oxygen_saturation?.toString() ?? "--", unit: "%", color: colors.success },
    { icon: "thermometer" as const, label: isAr ? "الحرارة" : "Temp", value: latestVitals?.temperature?.toString() ?? "--", unit: "°C", color: colors.warning },
  ];

  /* ── Next med ── */
  const nextMed = medications[0] ?? null;

  /* ── Abnormal alert ── */
  const showAlert = healthStatus.color === colors.danger;

  const snapW = screenW * 0.42;
  const chartW = (screenW - spacing.lg * 2 - spacing.md) / 2;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { backgroundColor: colors.background }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ═══ HEADER ═══ */}
        <View style={[s.header, isRTL && s.rowReverse]}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText style={[s.greeting, { color: colors.textSecondary }]}>
              {greetingText}
            </AppText>
            <AppText style={[s.heroName, { color: colors.textPrimary }]} numberOfLines={1}>
              {patientName || t.appName}
            </AppText>
            <AppText style={[s.dateText, { color: colors.textSecondary }]}>{dateStr}</AppText>
          </View>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.navigate("NotificationCenter")}
            style={[s.notifBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            {unreadCount > 0 && (
              <View style={[s.notifBadge, { backgroundColor: colors.danger }]}>
                <AppText style={s.notifBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ═══ STATUS CARD ═══ */}
        <View style={[s.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.statusLeft, isRTL && s.rowReverse]}>
            <View style={[s.statusIconWrap, { backgroundColor: healthStatus.color + "18" }]}>
              <Ionicons name={healthStatus.icon} size={22} color={healthStatus.color} />
            </View>
            <View style={{ gap: 2 }}>
              <AppText style={[s.statusHeading, { color: colors.textSecondary }]}>
                {isAr ? "الحالة الصحية" : "Health Status"}
              </AppText>
              <AppText style={[s.statusValue, { color: healthStatus.color }]}>
                {healthStatus.label}
              </AppText>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.navigate("Emergency")}
            style={[s.emergencyBtn, { backgroundColor: colors.danger + "14", borderColor: colors.danger + "30" }]}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.danger} />
            <AppText style={[s.emergencyBtnText, { color: colors.danger }]}>
              {isAr ? "طوارئ" : "SOS"}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* ═══ ALERT (conditional) ═══ */}
        {showAlert && (
          <View style={[s.alertBanner, { backgroundColor: colors.danger + "12", borderColor: colors.danger + "30" }]}>
            <Ionicons name="warning" size={16} color={colors.danger} />
            <AppText style={[s.alertText, { color: colors.danger }]}>
              {isAr ? "بعض المؤشرات تحتاج انتباهاً — راجع طبيبك." : "Some vitals need attention — please consult your doctor."}
            </AppText>
          </View>
        )}

        {/* ═══ VITALS SNAPSHOT ═══ */}
        <View style={s.sectionRow}>
          <AppText style={[s.sectionTitle, { color: colors.textPrimary }]}>{t.healthSummary}</AppText>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate("Vitals")}>
            <AppText style={[s.sectionLink, { color: colors.primary }]}>{isAr ? "كل المقاسات" : "All readings"}</AppText>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.snapScroll}>
          {vitalsCards.map((card, i) => (
            <View key={i} style={[s.snapCard, { width: snapW, backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[s.snapIcon, { backgroundColor: card.color + "14" }]}>
                <Ionicons name={card.icon} size={18} color={card.color} />
              </View>
              <AppText style={[s.snapLabel, { color: colors.textSecondary }]}>{card.label}</AppText>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
                <AppText style={[s.snapValue, { color: colors.textPrimary }]}>{card.value}</AppText>
                <AppText style={[s.snapUnit, { color: colors.textSecondary }]}>{card.unit}</AppText>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* ═══ TREND CHART ═══ */}
        <View style={s.sectionRow}>
          <AppText style={[s.sectionTitle, { color: colors.textPrimary }]}>{t.weeklyTrend}</AppText>
        </View>
        <View style={[s.trendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.trendCharts}>
            <View style={s.trendCol}>
              <View style={s.chartMeta}>
                <View style={[s.chartDot, { backgroundColor: colors.danger }]} />
                <AppText style={[s.chartMetaLabel, { color: colors.textSecondary }]}>{isAr ? "القلب" : "Heart"}</AppText>
                <AppText style={[s.chartMetaVal, { color: colors.danger }]}>{week.hr.avg}</AppText>
              </View>
              <MiniSparkline data={week.days.map(d => d.hr)} color={colors.danger} w={chartW} />
            </View>
            <View style={[s.chartDivider, { backgroundColor: colors.border }]} />
            <View style={s.trendCol}>
              <View style={s.chartMeta}>
                <View style={[s.chartDot, { backgroundColor: colors.primary }]} />
                <AppText style={[s.chartMetaLabel, { color: colors.textSecondary }]}>{isAr ? "الضغط" : "BP"}</AppText>
                <AppText style={[s.chartMetaVal, { color: colors.primary }]}>{week.sys.avg}</AppText>
              </View>
              <MiniSparkline data={week.days.map(d => d.sys)} color={colors.primary} w={chartW} />
            </View>
          </View>
          <View style={[s.dayRow, { borderTopColor: colors.border }]}>
            {week.days.map((d, i) => (
              <AppText key={i} style={[s.dayLabel, { color: colors.textSecondary }]}>{d.day}</AppText>
            ))}
          </View>
        </View>

        {/* ═══ TODAY'S PLAN ═══ */}
        <View style={s.sectionRow}>
          <AppText style={[s.sectionTitle, { color: colors.textPrimary }]}>{t.todayMeds}</AppText>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate("Medications")}>
            <AppText style={[s.sectionLink, { color: colors.primary }]}>{t.viewAll}</AppText>
          </TouchableOpacity>
        </View>
        {nextMed ? (
          <View style={[s.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.planIcon, { backgroundColor: colors.success + "14" }]}>
              <Ionicons name="medical" size={20} color={colors.success} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <AppText style={[s.planTitle, { color: colors.textPrimary }]}>{nextMed.name}</AppText>
              <AppText style={[s.planSub, { color: colors.textSecondary }]}>
                {nextMed.dosage} · {nextMed.frequency}
              </AppText>
            </View>
            {nextMed.time_of_day?.[0] && (
              <View style={[s.timeBadge, { backgroundColor: colors.primary + "12" }]}>
                <AppText style={[s.timeText, { color: colors.primary }]}>{nextMed.time_of_day[0]}</AppText>
              </View>
            )}
          </View>
        ) : (
          <View style={[s.emptyPlan, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="medical-outline" size={28} color={colors.textSecondary + "60"} />
            <AppText style={[s.emptyText, { color: colors.textSecondary }]}>{t.noMedsToday}</AppText>
          </View>
        )}

        <View style={{ height: spacing["2xl"] }} />
      </ScrollView>
    </Screen>
  );
}

/* ── Styles ── */
const s = StyleSheet.create({
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

  /* Status card */
  statusCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusIconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  statusHeading: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  statusValue: { fontSize: 16, fontWeight: "700" },
  emergencyBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1 },
  emergencyBtnText: { fontSize: 12, fontWeight: "700" },

  /* Alert banner */
  alertBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md },
  alertText: { flex: 1, fontSize: 13, fontWeight: "500", lineHeight: 20 },

  /* Section headers */
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm, marginTop: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionLink: { fontSize: 13, fontWeight: "600" },

  /* Vitals snapshot */
  snapScroll: { gap: spacing.sm, paddingRight: spacing.lg, marginBottom: spacing.md },
  snapCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: 6 },
  snapIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  snapLabel: { fontSize: 11, fontWeight: "600" },
  snapValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  snapUnit: { fontSize: 11, fontWeight: "600" },

  /* Trend chart */
  trendCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, marginBottom: spacing.md },
  trendCharts: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  trendCol: { flex: 1, gap: spacing.sm },
  chartMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  chartDot: { width: 7, height: 7, borderRadius: 4 },
  chartMetaLabel: { flex: 1, fontSize: 12, fontWeight: "600" },
  chartMetaVal: { fontSize: 13, fontWeight: "800" },
  chartDivider: { width: 1, alignSelf: "stretch" },
  dayRow: { flexDirection: "row", justifyContent: "space-around", paddingTop: spacing.sm, marginTop: spacing.sm, borderTopWidth: 1 },
  dayLabel: { fontSize: 10, fontWeight: "600" },

  /* Today's plan */
  planCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  planIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  planTitle: { fontSize: 15, fontWeight: "700" },
  planSub: { fontSize: 12, fontWeight: "500" },
  timeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm },
  timeText: { fontSize: 11, fontWeight: "700" },
  emptyPlan: { alignItems: "center", justifyContent: "center", padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm },
  emptyText: { fontSize: 14, fontWeight: "500" },
});
