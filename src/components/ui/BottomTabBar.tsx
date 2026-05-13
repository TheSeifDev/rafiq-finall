import React, { useEffect, useRef, memo } from "react";
import { View, Pressable, StyleSheet, Platform, Dimensions, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { AppText } from "./AppText";
import { useTheme } from "../../theme/useTheme";
import { useAppStore } from "../../store/app.store";
import { translations } from "../../constants/translations";
import { radius } from "../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

/* ═══════════════════════════════════════════════════════════════
   PREMIUM TAB BUTTON COMPONENT
   Animated active state with scale and glow effects
═══════════════════════════════════════════════════════════════ */
const TabButton = memo(function TabButton({
  route,
  isFocused,
  label,
  tab,
  onPress,
  colors,
}: {
  route: any;
  isFocused: boolean;
  label: string;
  tab: typeof TABS[string];
  onPress: () => void;
  colors: any;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isFocused) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isFocused, scaleAnim, glowAnim]);

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabButton}
      android_ripple={{ color: colors.primarySoft, borderless: true }}
    >
      {/* Animated active indicator */}
      {isFocused && (
        <Animated.View
          style={[
            styles.activeIndicator,
            {
              backgroundColor: colors.primary,
              transform: [{ scale: scaleAnim }],
              opacity: glowAnim,
            },
          ]}
        />
      )}

      {/* Icon */}
      <View style={styles.iconContainer}>
        <Animated.View
          style={{
            transform: [{ scale: isFocused ? 1.15 : 1 }],
          }}
        >
          <Ionicons
            name={isFocused ? tab.active : tab.inactive}
            size={22}
            color={isFocused ? colors.primary : colors.textSecondary}
          />
        </Animated.View>

        {/* Active dot indicator */}
        {isFocused && (
          <Animated.View
            style={[
              styles.activeDot,
              { backgroundColor: colors.primary },
            ]}
          />
        )}
      </View>

      {/* Label */}
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
    </Pressable>
  );
});

/* ═══════════════════════════════════════════════════════════════
   PREMIUM BOTTOM TAB BAR
   Glass morphism, animated indicators, haptic-friendly spacing
═══════════════════════════════════════════════════════════════ */
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
        {
          paddingBottom: Platform.OS === "ios" ? 28 : 16,
        },
      ]}
    >
      {/* Premium floating glass bar */}
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.surface + "F5",
            borderColor: colors.border + "60",
          },
        ]}
      >
        {/* Gradient overlay for glass effect */}
        <View
          style={[
            styles.glassOverlay,
            {
              backgroundColor: colors.primary + "08",
            },
          ]}
        />

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const tab = TABS[route.name];
          if (!tab) return null;

          const label = (t as any)[tab.labelKey] ?? route.name;

          return (
            <TabButton
              key={route.key}
              route={route}
              isFocused={isFocused}
              label={label}
              tab={tab}
              onPress={() => {
                if (!isFocused) navigation.navigate(route.name);
              }}
              colors={colors}
            />
          );
        })}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
   Premium glass morphism and animations
═══════════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "transparent",
    zIndex: 100,
    pointerEvents: "box-none",
  },

  bar: {
    flexDirection: "row",
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
    position: "relative",
    overflow: "hidden",
  },

  glassOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    pointerEvents: "none",
  },

  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    position: "relative",
  },

  activeIndicator: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 44,
    height: 44,
    marginTop: -22,
    marginLeft: -22,
    borderRadius: 14,
    zIndex: -1,
  },

  iconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },

  activeDot: {
    position: "absolute",
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  label: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
});