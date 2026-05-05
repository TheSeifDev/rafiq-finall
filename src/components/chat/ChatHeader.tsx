/**
 * ChatHeader — minimal app bar for the health assistant chat.
 * No heavy border — just a subtle separator via borderBottomWidth + transparent border color.
 */
import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  title: string;
  statusLabel: string;
  isRTL: boolean;
  colors: any;
}

export function ChatHeader({ title, statusLabel, isRTL, colors }: Props) {
  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
        isRTL && styles.rowRev,
      ]}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="medical" size={20} color={colors.primary} />
      </View>

      {/* Info */}
      <View style={[styles.info, isRTL && styles.infoRTL]}>
        <Text
          style={[
            styles.title,
            { color: colors.textPrimary, textAlign: isRTL ? "right" : "left" },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View style={[styles.statusRow, isRTL && styles.rowRev]}>
          <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.statusText, { color: colors.success }]}>
            {statusLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    // Elevate slightly above content
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  rowRev: { flexDirection: "row-reverse" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  infoRTL: {
    alignItems: "flex-end",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
