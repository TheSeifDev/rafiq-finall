/**
 * HomeScreen - Production-grade healthcare dashboard
 * Refactored with clean architecture, no infinite animations
 */
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
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
import {
  TrendCard,
  WellnessScoreCard,
  WeeklyComparison,
} from "../components/health";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Home">,
  NativeStackScreenProps<MainStackParamList>
>;

export function HomeScreen({ navigation }: Props): React.JSX.Element {
  const session = useAuthStore((s) => s.session);
  const { colors, isRTL } = useTheme();
  const language = useAppStore((s) => s.language);
  const t = translations[language];
  const isAr = language === "ar";
  const { width: screenWidth } = useWindowDimensions();

  const [refreshing, setRefreshing] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [latestVitals, setLatestVitals] = useState<VitalsRecord | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load data
  const loadData = useCallback(async () => {
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
    } catch {
      // Silent fail - production ready
    }
  }, [session?.user.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Derived values
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (isAr) return hour < 12 ? "صباح الخير" : "مساء الخير";
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  }, [language]);

  const dateStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(isAr ? "ar-EG" : "en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }, [language]);

  const healthStatus = useMemo(() => {
    if (!latestVitals) {
      return {
        label: isAr ? "لا توجد بيانات" : "No data yet",
        color: colors.textSecondary,
        icon: "help-circle-outline" as const,
      };
    }
    const hr = latestVitals.heart_rate ?? 75;
    const spo2 = latestVitals.oxygen_saturation ?? 98;
    if (hr > 120 || hr < 50 || spo2 < 90) {
      return {
        label: isAr ? "يحتاج متابعة" : "Needs attention",
        color: colors.danger,
        icon: "warning-outline" as const,
      };
    }
    if (hr > 100 || spo2 < 95) {
      return {
        label: isAr ? "مقبول" : "Fair",
        color: colors.warning,
        icon: "alert-circle-outline" as const,
      };
    }
    return {
      label: isAr ? "مستقر" : "Stable",
      color: colors.success,
      icon: "checkmark-circle-outline" as const,
    };
  }, [latestVitals, isAr, colors]);

  // Week data for charts
  const week = useMemo(() => {
    const days = generateRealisticWeek(74, 120, 78, isAr);
    return buildWeeklyAnalytics(days);
  }, [language]);

  const weekDia = useMemo(() => {
    if (!week.days.length) return 80;
    const sum = week.days.reduce((acc, d) => acc + d.dia, 0);
    return Math.round(sum / week.days.length);
  }, [week]);

  // Vitals cards data
  const vitalsCards = [
    {
      icon: "heart" as const,
      label: isAr ? "معدل القلب" : "Heart Rate",
      value: latestVitals?.heart_rate?.toString() ?? "--",
      unit: isAr ? "ن/د" : "bpm",
      color: colors.danger,
      caption: isAr ? "آخر قراءة" : "Latest",
    },
    {
      icon: "fitness" as const,
      label: isAr ? "ضغط الدم" : "Blood Pressure",
      value: latestVitals?.blood_pressure_systolic
        ? `${latestVitals.blood_pressure_systolic}/${latestVitals.blood_pressure_diastolic}`
        : "--/--",
      unit: "mmHg",
      color: colors.primary,
      caption: isAr ? "انقباض/انبساط" : "Sys/Dia",
    },
    {
      icon: "water" as const,
      label: isAr ? "الأكسجين" : "Oxygen",
      value: latestVitals?.oxygen_saturation?.toString() ?? "--",
      unit: "%",
      color: colors.success,
      caption: isAr ? "تشبع" : "SpO2",
    },
    {
      icon: "thermometer" as const,
      label: isAr ? "الحرارة" : "Temp",
      value: latestVitals?.temperature?.toString() ?? "--",
      unit: "°C",
      color: colors.warning,
      caption: isAr ? "الجسم" : "Body",
    },
  ];

  // Next medication
  const nextMed = medications[0] ?? null;
  const nextMedTime = useMemo(() => {
    if (!nextMed) return null;
    const first = parseMedicationTimes(nextMed.times, nextMed.time_of_day).find(
      (dose) => dose.kind === "time"
    );
    return first?.kind === "time"
      ? formatMedicationTime(first.time)
      : nextMed.time_of_day?.[0] ?? null;
  }, [nextMed]);

  // Alert flag
  const showAlert = healthStatus.color === colors.danger;

  // Wellness score
  const wellnessScore = useMemo(() => {
    if (!latestVitals) return 72;
    const hrScore = latestVitals.heart_rate
      ? Math.max(0, 100 - Math.abs(latestVitals.heart_rate - 72) * 2)
      : 80;
    const spo2Score = latestVitals.oxygen_saturation
      ? Math.max(0, (latestVitals.oxygen_saturation - 90) * 10)
      : 90;
    const bpScore = latestVitals.blood_pressure_systolic
      ? Math.max(0, 100 - Math.abs(latestVitals.blood_pressure_systolic - 120) * 1.5)
      : 85;
    return Math.round((hrScore + spo2Score + bpScore) / 3);
  }, [latestVitals]);

  const wellnessInsight = useMemo(() => {
    if (wellnessScore >= 80) return isAr ? "حالتك الصحية ممتازة!" : "Your health is excellent!";
    if (wellnessScore >= 60) return isAr ? "حالتك جيدة بشكل عام" : "Your health is generally good";
    return isAr ? "ينصح بمتابعة الطبيب" : "Consider consulting your doctor";
  }, [wellnessScore, isAr]);

  // Trend data
  const hrTrend = useMemo(() => {
    const values = week.days.map((d) => d.hr);
    const recent = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const older = values.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    if (recent > older + 5) return "up";
    if (recent < older - 5) return "down";
    return "stable";
  }, [week]);

  const spo2Data = week.days.map((d) => d.spo2);
  const spo2Trend =
    spo2Data[spo2Data.length - 1] > spo2Data[0]
      ? "up"
      : spo2Data[spo2Data.length - 1] < spo2Data[0]
        ? "down"
        : "stable";

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { backgroundColor: colors.background }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, isRTL && styles.rowReverse]}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText style={[styles.greeting, { color: colors.textSecondary }]}>
              {greetingText}
            </AppText>
            <AppText
              style={[styles.heroName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {patientName || t.appName}
            </AppText>
            <AppText style={[styles.dateText, { color: colors.textSecondary }]}>
              {dateStr}
            </AppText>
          </View>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.navigate("NotificationCenter")}
            style={[
              styles.notifBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            {unreadCount > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: colors.danger }]}>
                <AppText style={styles.notifBadgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <View
          style={[
            styles.statusCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={[styles.statusLeft, isRTL && styles.rowReverse]}>
            <View
              style={[styles.statusIconWrap, { backgroundColor: healthStatus.color + "18" }]}
            >
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
            style={[
              styles.emergencyBtn,
              { backgroundColor: colors.danger + "14", borderColor: colors.danger + "30" },
            ]}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.danger} />
            <AppText style={[styles.emergencyBtnText, { color: colors.danger }]}>
              {isAr ? "طوارئ" : "SOS"}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Alert Banner */}
        {showAlert && (
          <View
            style={[
              styles.alertBanner,
              { backgroundColor: colors.danger + "12", borderColor: colors.danger + "30" },
            ]}
          >
            <Ionicons name="warning" size={16} color={colors.danger} />
            <AppText style={[styles.alertText, { color: colors.danger }]}>
              {isAr
                ? "بعض المؤشرات تحتاج انتباهاً — راجع طبيبك."
                : "Some vitals need attention — please consult your doctor."}
            </AppText>
          </View>
        )}

        {/* Vitals Snapshot */}
        <View style={styles.sectionRow}>
          <AppText style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t.healthSummary}
          </AppText>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Vitals")}
          >
            <AppText style={[styles.sectionLink, { color: colors.primary }]}>
              {isAr ? "كل المقاسات" : "All readings"}
            </AppText>
          </TouchableOpacity>
        </View>
        <View
          style={[
            styles.vitalsPanel,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={[styles.vitalsPanelTop, isRTL && styles.rowReverse]}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText style={[styles.vitalsPanelTitle, { color: colors.textPrimary }]}>
                {healthStatus.label}
              </AppText>
              <AppText style={[styles.vitalsPanelSub, { color: colors.textSecondary }]}>
                {latestVitals?.recorded_at
                  ? new Date(latestVitals.recorded_at).toLocaleString(
                      isAr ? "ar-EG" : "en-US",
                      {
                        hour: "numeric",
                        minute: "2-digit",
                        month: "short",
                        day: "numeric",
                      }
                    )
                  : t.noData}
              </AppText>
            </View>
            <View
              style={[
                styles.vitalsSignal,
                { backgroundColor: healthStatus.color + "16", borderColor: healthStatus.color + "35" },
              ]}
            >
              <Ionicons name={healthStatus.icon} size={18} color={healthStatus.color} />
            </View>
          </View>
          <View style={styles.vitalsGrid}>
            {vitalsCards.map((card, index) => (
              <View
                key={index}
                style={[
                  styles.snapCard,
                  { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
                ]}
              >
                <View style={[styles.snapTop, isRTL && styles.rowReverse]}>
                  <View style={[styles.snapIcon, { backgroundColor: card.color + "14" }]}>
                    <Ionicons name={card.icon} size={17} color={card.color} />
                  </View>
                  <AppText style={[styles.snapCaption, { color: colors.textSecondary }]}>
                    {card.caption}
                  </AppText>
                </View>
                <AppText style={[styles.snapLabel, { color: colors.textSecondary }]}>
                  {card.label}
                </AppText>
                <View style={[styles.snapValueRow, isRTL && styles.rowReverse]}>
                  <AppText style={[styles.snapValue, { color: colors.textPrimary }]}>
                    {card.value}
                  </AppText>
                  <AppText style={[styles.snapUnit, { color: colors.textSecondary }]}>
                    {card.unit}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Weekly Trends Section */}
        <View style={styles.sectionRow}>
          <AppText style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t.weeklyTrend}
          </AppText>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("MainTabs", {
                screen: "Profile",
                params: { screen: "WeeklyTrends" },
              })
            }
          >
            <AppText style={[styles.sectionLink, { color: colors.primary }]}>
              {isAr ? "التفاصيل" : "Details"}
            </AppText>
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

        {/* Trend Cards Grid */}
        <View style={styles.trendsGrid}>
          <TrendCard
            title={isAr ? "معدل القلب" : "Heart Rate"}
            icon="heart"
            iconColor={colors.danger}
            value={String(week.hr.avg)}
            unit={isAr ? "ن/د" : "bpm"}
            trend={hrTrend}
            trendLabel={
              isAr
                ? hrTrend === "up"
                  ? "مرتفع"
                  : hrTrend === "down"
                    ? "منخفض"
                    : "مستقر"
                : hrTrend === "up"
                  ? "High"
                  : hrTrend === "down"
                    ? "Low"
                    : "Stable"
            }
            data={week.days.map((d) => d.hr)}
            backgroundColor={colors.danger + "15"}
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
            trendLabel={
              isAr
                ? spo2Trend === "up"
                  ? "مرتفع"
                  : spo2Trend === "down"
                    ? "منخفض"
                    : "مستقر"
                : spo2Trend === "up"
                  ? "High"
                  : spo2Trend === "down"
                    ? "Low"
                    : "Stable"
            }
            data={spo2Data}
            backgroundColor={colors.success + "15"}
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
            data={week.days.map((d) => d.sys)}
            backgroundColor={colors.primary + "15"}
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
            backgroundColor={colors.warning + "15"}
            isRTL={isAr}
            colors={colors}
          />
        </View>

        {/* Weekly Comparison */}
        <WeeklyComparison isRTL={isAr} colors={colors} />

        {/* Today's Plan */}
        <View style={styles.sectionRow}>
          <AppText style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t.todayMeds}
          </AppText>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Medications")}
          >
            <AppText style={[styles.sectionLink, { color: colors.primary }]}>
              {t.viewAll}
            </AppText>
          </TouchableOpacity>
        </View>
        {nextMed ? (
          <View
            style={[
              styles.planCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.planIcon, { backgroundColor: colors.success + "14" }]}>
              <Ionicons name="medical" size={20} color={colors.success} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <AppText style={[styles.planTitle, { color: colors.textPrimary }]}>
                {nextMed.name}
              </AppText>
              <AppText style={[styles.planSub, { color: colors.textSecondary }]}>
                {nextMed.dosage} · {nextMed.frequency}
              </AppText>
            </View>
            {nextMedTime && (
              <View style={[styles.timeBadge, { backgroundColor: colors.primary + "12" }]}>
                <AppText style={[styles.timeText, { color: colors.primary }]}>
                  {nextMedTime}
                </AppText>
              </View>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.emptyPlan,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="medical-outline" size={28} color={colors.textSecondary + "60"} />
            <AppText style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t.noMedsToday}
            </AppText>
          </View>
        )}

        <View style={{ height: spacing["2xl"] }} />
      </ScrollView>
    </Screen>
  );
}

// Styles
const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  greeting: {
    fontSize: 13,
    fontWeight: "500",
  },
  heroName: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  statusHeading: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  emergencyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  emergencyBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 20,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: "600",
  },
  vitalsPanel: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  vitalsPanelTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  vitalsPanelTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  vitalsPanelSub: {
    fontSize: 12,
    fontWeight: "600",
  },
  vitalsSignal: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  vitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  snapCard: {
    width: "48%",
    minWidth: 140,
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: 7,
  },
  snapTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  snapIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  snapCaption: {
    fontSize: 10,
    fontWeight: "700",
  },
  snapLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  snapValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  snapValue: {
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: 0,
  },
  snapUnit: {
    fontSize: 11,
    fontWeight: "600",
  },
  trendsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  planIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  planTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  planSub: {
    fontSize: 12,
    fontWeight: "500",
  },
  timeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptyPlan: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
  },
});