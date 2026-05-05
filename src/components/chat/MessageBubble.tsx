/**
 * MessageBubble — 2025-level minimal chat bubble.
 *
 * Rules:
 *  - NO avatar, NO icon, NO label beside any message
 *  - User → right via alignSelf: 'flex-end'
 *  - AI   → left  via alignSelf: 'flex-start'
 *  - Entrance: fade + translateY
 *  - Press: scale 0.98 micro-feedback
 */
import React, { useRef, useEffect } from "react";
import {
  Text,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";

interface Props {
  role: "user" | "assistant";
  content: string;
  isRTL?: boolean;
  colors: {
    primary: string;
    surfaceVariant: string;
    textPrimary: string;
    border: string;
  };
}

function AnimatedEntry({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(ty, {
        toValue: 0,
        speed: 22,
        bounciness: 2,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: ty }] }}>
      {children}
    </Animated.View>
  );
}

export function MessageBubble({ role, content, isRTL = false, colors }: Props) {
  const isUser = role === "user";
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 120,
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
    <AnimatedEntry>
      <Animated.View
        style={[
          styles.wrapper,
          isUser ? styles.wrapperUser : styles.wrapperAI,
          { transform: [{ scale }] },
        ]}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={pressIn}
          onPressOut={pressOut}
          delayPressIn={0}
        >
          <Animated.View
            style={[
              styles.bubble,
              isUser
                ? [styles.userBubble, { backgroundColor: colors.primary }]
                : [
                    styles.aiBubble,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: colors.border,
                    },
                  ],
            ]}
          >
            <Text
              style={[
                styles.text,
                {
                  color: isUser ? "#FFFFFF" : colors.textPrimary,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
            >
              {content}
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </AnimatedEntry>
  );
}

// ─── Platform shadow ──────────────────────────────────────────────────────────

const userShadow = Platform.select({
  ios: {
    shadowColor: "#00C2FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  android: { elevation: 3 },
  default: {},
});

const aiShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  android: { elevation: 1 },
  default: {},
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  /* Wrapper: alignSelf drives the left/right positioning */
  wrapper: {
    marginVertical: 4,
    maxWidth: "75%",
  },
  wrapperUser: {
    alignSelf: "flex-end",
  },
  wrapperAI: {
    alignSelf: "flex-start",
  },

  /* Shared bubble */
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  /* User: primary bg, tail bottom-right */
  userBubble: {
    borderRadius: 20,
    borderBottomRightRadius: 5,
    ...userShadow,
  },

  /* AI: dark card bg, tail bottom-left */
  aiBubble: {
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    ...aiShadow,
  },

  text: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
});
