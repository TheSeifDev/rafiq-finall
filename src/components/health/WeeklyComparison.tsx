/**
 * WeeklyComparison - Shows week-over-week changes
 * Production-grade, static UI
 */
import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../ui/AppText";
import { spacing, radius } from "../../theme";

interface WeeklyComparisonProps {
  isRTL: boolean;
  colors: {
    textPrimary: string;
    textSecondary: string;
    success: string;
    danger: string;
    primary: string;
    surfaceVariant: string;
  };
}

interface ComparisonItem {
  label: string;
  value: string;
  color: string;
}

export const WeeklyComparison = memo(function WeeklyComparison({
  isRTL,
  colors,
}: WeeklyComparisonProps): React.JSX.Element {
  const comparisonData: ComparisonItem[] = [
    { label: isRTL ? "معدل القلب" : "Heart Rate", value: "-3%", color: colors.danger },
    { label: isRTL ? "النوم" : "Sleep", value: "+12%", color: colors.success },
    { label: isRTL ? "النشاط" : "Activity", value: "+8%", color: colors.primary },
    { label: isRTL ? "التشبع" : "SpO2", value: "0%", color: colors.textSecondary },
  ];

  return (
    <View style={styles.card}>
      <View style={[styles.content, { backgroundColor: colors.surfaceVariant + "80" }]}>
        <View style={[styles.header, isRTL && styles.rowReverse]}>
          <Ionicons name="time" size={14} color={colors.textSecondary} />
          <AppText style={[styles.title, { color: colors.textPrimary }]}>
            {isRTL ? "مقارنة الأسبوع" : "Weekly Comparison"}
          </AppText>
        </View>

        <View style={styles.grid}>
          {comparisonData.map((item, index) => (
            <View key={index} style={styles.item}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <AppText style={[styles.label, { color: colors.textSecondary }]}>
                {item.label}
              </AppText>
              <AppText style={[styles.value, { color: item.color }]}>{item.value}</AppText>
            </View>
          ))}
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
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  item: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    flex: 1,
    fontSize: 11,
    fontWeight: "500",
  },
  value: {
    fontSize: 12,
    fontWeight: "700",
  },
});