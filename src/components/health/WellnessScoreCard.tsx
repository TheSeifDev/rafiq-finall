/**
 * WellnessScoreCard - AI health insight summary
 * Production-grade, no infinite animations
 */
import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../ui/AppText";
import { spacing, radius } from "../../theme";

interface WellnessScoreCardProps {
  score: number;
  label: string;
  insight: string;
  isRTL: boolean;
  colors: {
    textPrimary: string;
    textSecondary: string;
    primary: string;
    success: string;
    warning: string;
    danger: string;
  };
}

export const WellnessScoreCard = memo(function WellnessScoreCard({
  score,
  label,
  insight,
  isRTL,
  colors,
}: WellnessScoreCardProps): React.JSX.Element {
  const scoreColor = score >= 80 ? colors.success : score >= 60 ? colors.warning : colors.danger;

  return (
    <View style={styles.card}>
      <View style={[styles.content, { backgroundColor: colors.primary + "12" }]}>
        <View style={[styles.header, isRTL && styles.rowReverse]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + "18" }]}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
          </View>
          <AppText style={[styles.title, { color: colors.textPrimary }]}>{label}</AppText>
        </View>

        <View style={[styles.scoreRow, isRTL && styles.rowReverse]}>
          <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
            <AppText style={[styles.scoreValue, { color: scoreColor }]}>{score}</AppText>
            <AppText style={styles.scoreLabel}>/ 100</AppText>
          </View>
          <View style={styles.insightWrap}>
            <AppText style={[styles.insightLabel, { color: colors.textSecondary }]}>
              {isRTL ? "الرؤية الذكية" : "AI Insight"}
            </AppText>
            <AppText style={[styles.insight, { color: colors.textPrimary }]}>{insight}</AppText>
          </View>
        </View>

        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${score}%`, backgroundColor: scoreColor }]} />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  content: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  scoreCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreValue: {
    fontSize: 26,
    fontWeight: "900",
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#888",
  },
  insightWrap: {
    flex: 1,
    gap: 2,
  },
  insightLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  insight: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  bar: {
    height: 6,
    backgroundColor: "rgba(0,0,0,0.08)",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
});