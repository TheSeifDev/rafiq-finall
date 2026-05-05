/**
 * QuickReplies — 3 centered suggestion chips, positioned above the input.
 *
 * Layout: horizontal row, evenly spaced, centered.
 * NOT a ScrollView — 3 fixed chips use flex layout for proper centering.
 * Each chip has a scale spring micro-interaction on press.
 */
import React, { useRef } from "react";
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";

interface Props {
  data: string[];
  onSelect: (text: string) => void;
  isRTL: boolean;
  colors: any;
}

function Chip({
  label,
  onPress,
  colors,
}: {
  label: string;
  onPress: () => void;
  colors: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 100,
      bounciness: 0,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 100,
      bounciness: 4,
    }).start();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={onPress}
      style={styles.chipTouch}
    >
      <Animated.View
        style={[
          styles.chip,
          {
            backgroundColor: colors.surfaceVariant,
            borderColor: colors.border,
            transform: [{ scale }],
          },
        ]}
      >
        <Text
          style={[styles.chipText, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function QuickReplies({ data, onSelect, isRTL, colors }: Props) {
  if (!data.length) return null;

  return (
    <View style={[styles.row, isRTL && styles.rowRev]}>
      {data.map((reply) => (
        <Chip
          key={reply}
          label={reply}
          onPress={() => onSelect(reply)}
          colors={colors}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  rowRev: { flexDirection: "row-reverse" },
  chipTouch: {
    flex: 1,
    maxWidth: "36%",
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});
