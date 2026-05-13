/**
 * TrendCard - Production-grade health trend visualization
 * No infinite animations, premium medical UI
 */
import React, { memo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../ui/AppText";
import { spacing, radius } from "../../theme";
import { MiniSparkline } from "./MiniSparkline";

interface TrendCardProps {
  title: string;
  icon: string;
  iconColor: string;
  value: string;
  unit: string;
  trend: "up" | "down" | "stable";
  trendLabel: string;
  data: number[];
  backgroundColor: string;
  isRTL: boolean;
  colors: {
    textPrimary: string;
    textSecondary: string;
    success: string;
    danger: string;
    warning: string;
  };
}

export const TrendCard = memo(function TrendCard({
  title,
  icon,
  iconColor,
  value,
  unit,
  trend,
  trendLabel,
  data,
  backgroundColor,
  isRTL,
  colors,
}: TrendCardProps): React.JSX.Element {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - spacing.lg * 2 - spacing.sm) / 2;

  const trendIcon = trend === "up" ? "trending-up" : trend === "down" ? "trending-down" : "remove";
  const trendColor = trend === "up" ? colors.success : trend === "down" ? colors.danger : colors.textSecondary;

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <View style={[styles.cardContent, { backgroundColor }]}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: iconColor + "18" }]}>
            <Ionicons name={icon as any} size={14} color={iconColor} />
          </View>
          <View style={[styles.badge, { backgroundColor: trendColor + "14" }]}>
            <Ionicons name={trendIcon as any} size={10} color={trendColor} />
            <AppText style={[styles.badgeText, { color: trendColor }]}>{trendLabel}</AppText>
          </View>
        </View>

        <AppText style={[styles.title, { color: colors.textSecondary }]}>{title}</AppText>

        <View style={[styles.valueRow, isRTL && styles.rowReverse]}>
          <AppText style={[styles.value, { color: colors.textPrimary }]}>{value}</AppText>
          <AppText style={[styles.unit, { color: colors.textSecondary }]}>{unit}</AppText>
        </View>

        <MiniSparkline
          data={data}
          color={iconColor}
          width={cardWidth - spacing.md * 2}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  cardContent: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  title: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    marginBottom: spacing.xs,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
  },
  unit: {
    fontSize: 11,
    fontWeight: "600",
  },
});