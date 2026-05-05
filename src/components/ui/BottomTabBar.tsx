import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { AppText } from "./AppText";
import { useTheme } from "../../theme/useTheme";
import { useAppStore } from "../../store/app.store";
import { translations } from "../../constants/translations";

const TABS: Record<
  string,
  {
    active: keyof typeof Ionicons.glyphMap;
    inactive: keyof typeof Ionicons.glyphMap;
    labelKey: keyof (typeof translations)["en"];
  }
> = {
  Home: { active: "home", inactive: "home-outline", labelKey: "home" },
  Vitals: { active: "pulse", inactive: "pulse-outline", labelKey: "vitals" },
  Medications: {
    active: "medical",
    inactive: "medical-outline",
    labelKey: "medications",
  },
  Chat: {
    active: "chatbubbles",
    inactive: "chatbubbles-outline",
    labelKey: "chat",
  },
  Profile: {
    active: "person-circle",
    inactive: "person-circle-outline",
    labelKey: "profile",
  },
};

export function BottomTabBar({
  state,
  navigation,
}: BottomTabBarProps): React.JSX.Element {
  const { colors } = useTheme();
  const language = useAppStore((s) => s.language);
  const t = translations[language];

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: Platform.OS === "ios" ? 28 : 12 },
      ]}
    >
      <View
        style={[
          styles.bar,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const tab = TABS[route.name];
          if (!tab) return null;

          const label = (t as any)[tab.labelKey] ?? route.name;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                if (!isFocused) navigation.navigate(route.name);
              }}
              style={styles.tab}
              android_ripple={{ color: colors.primarySoft, borderless: true }}
            >
              {/* Active pill highlight - FIXED: zIndex behind content */}
              {isFocused && (
                <View
                  style={[
                    styles.activePill,
                    { backgroundColor: colors.primarySoft },
                  ]}
                />
              )}

              {/* Content wrapper with zIndex above pill */}
              <View style={styles.tabContent}>
                <Ionicons
                  name={isFocused ? tab.active : tab.inactive}
                  size={22}
                  color={isFocused ? colors.primary : colors.textSecondary}
                />
                <AppText
                  style={[
                    styles.label,
                    {
                      color: isFocused ? colors.primary : colors.textSecondary,
                      fontWeight: isFocused ? "700" : "500",
                    },
                  ]}
                >
                  {label}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: "transparent",
    zIndex: 10, // Keep above screen content
    pointerEvents: "box-none", // Let touches pass through transparent areas
  },
  bar: {
    flexDirection: "row",
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
    backgroundColor: "transparent",
    pointerEvents: "auto", // Re-enable touches on the bar itself
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    position: "relative",
    overflow: "hidden", // Prevent pill from bleeding
    borderRadius: 16, // Match pill radius for clean clip
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    zIndex: 2, // Above the pill
  },
  activePill: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 48,
    height: 48,
    marginTop: -24, // Center vertically
    marginLeft: -24, // Center horizontally
    borderRadius: 14,
    zIndex: 1, // Behind content
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
