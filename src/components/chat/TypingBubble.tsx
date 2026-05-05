import React, { useRef, useEffect } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../ui/AppText";
import { TypingIndicator } from "./TypingIndicator";
import { spacing } from "../../theme";

interface Props {
  isRTL: boolean;
  colors: any;
  label: string;
}

export function TypingBubble({ isRTL, colors, label }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 22,
        bounciness: 3,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.row,
        isRTL && styles.rowRev,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="medical" size={13} color={colors.primary} />
      </View>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: colors.surfaceVariant,
            borderColor: colors.border,
          },
        ]}
      >
        <TypingIndicator color={colors.primary} />
        <AppText style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  rowRev: { flexDirection: "row-reverse" },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
});
