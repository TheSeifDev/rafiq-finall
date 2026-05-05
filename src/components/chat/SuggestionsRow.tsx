/**
 * SuggestionsRow — compact cards shown in the empty state only.
 * Horizontal scroll, each card: icon pill + text, scale micro-interaction.
 */
import React, { useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface Suggestion {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}

interface Props {
  suggestions: Suggestion[];
  onSelect: (label: string) => void;
  title: string;
  isRTL: boolean;
  colors: any;
  cardWidth: number;
}

function SuggestionCard({
  sg,
  onPress,
  width,
  colors,
}: {
  sg: Suggestion;
  onPress: () => void;
  width: number;
  colors: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 100,
      bounciness: 0,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 80,
      bounciness: 5,
    }).start();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.card,
          {
            width,
            backgroundColor: colors.surfaceVariant,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: sg.color + "22" }]}>
          <Ionicons name={sg.icon} size={16} color={sg.color} />
        </View>
        <Text
          style={[styles.cardLabel, { color: colors.textPrimary }]}
          numberOfLines={2}
        >
          {sg.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function SuggestionsRow({
  suggestions,
  onSelect,
  title,
  isRTL,
  colors,
  cardWidth,
}: Props) {
  return (
    <View style={styles.wrapper}>
      {/* Section label */}
      <Text
        style={[
          styles.sectionLabel,
          {
            color: colors.textSecondary,
            textAlign: isRTL ? "right" : "left",
            paddingHorizontal: 16,
          },
        ]}
      >
        {title.toUpperCase()}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollRow,
          isRTL && styles.rowRev,
        ]}
      >
        {suggestions.map((sg, i) => (
          <SuggestionCard
            key={i}
            sg={sg}
            onPress={() => onSelect(sg.label)}
            width={cardWidth}
            colors={colors}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const SHADOW = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  android: { elevation: 1 },
  default: {},
});

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 12,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  scrollRow: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
  },
  rowRev: { flexDirection: "row-reverse" },
  card: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 8,
    ...SHADOW,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 15,
    letterSpacing: 0.1,
  },
});
