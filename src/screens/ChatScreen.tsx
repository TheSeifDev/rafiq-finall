/**
 * ChatScreen — Orchestrator.
 *
 * Vertical layout (top → bottom):
 *  ┌─────────────────────────┐
 *  │  ChatHeader (fixed)     │
 *  ├─────────────────────────┤
 *  │  SuggestionsRow         │  ← empty state only
 *  │  FlatList (flex: 1)     │  ← messages
 *  │  TypingBubble           │  ← when AI is replying
 *  │  QuickReplies           │  ← after last AI msg
 *  │  Composer pill          │  ← always visible
 *  └─────────────────────────┘
 *
 * Bottom clearance:
 *   composer.marginBottom = tabBarHeight + safeArea.bottom + 8
 *   FlatList.paddingBottom = same + COMPOSER_H + quickReplies (~56) + spacing
 */
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { Screen } from "../components/ui/Screen";
import { ChatHeader } from "../components/chat/ChatHeader";
import { MessageBubble } from "../components/chat/MessageBubble";
import { TypingBubble } from "../components/chat/TypingBubble";
import { QuickReplies } from "../components/chat/QuickReplies";
import { SuggestionsRow, type Suggestion } from "../components/chat/SuggestionsRow";

import { useLocale } from "../hooks/useLocale";
import { sendChat, type ChatMessage } from "../services/chat.service";
import { useTheme } from "../theme/useTheme";
import { useAuthStore } from "../store/auth.store";
import { patientService } from "../services/patient.service";
import { vitalsService } from "../services/vitals.service";
import { medicationService } from "../services/medication.service";
import { formatMedicationTime, parseMedicationTimes } from "../lib/medications/medicationSchedule";

// ─── Layout constants (8pt system) ───────────────────────────────────────────
const COMPOSER_H = 56;      // pill input bar height
const QUICK_REPLIES_H = 56; // estimated quick replies section height

// ─── Send Button ─────────────────────────────────────────────────────────────

function SendButton({
  onPress,
  disabled,
  isRTL,
  color,
}: {
  onPress: () => void;
  disabled: boolean;
  isRTL: boolean;
  color: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.84,
      useNativeDriver: true,
      speed: 100,
      bounciness: 0,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 80,
      bounciness: 6,
    }).start();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.sendBtn,
          {
            backgroundColor: disabled ? color + "50" : color,
            transform: [{ scale }],
          },
        ]}
      >
        <Ionicons
          name="send"
          size={15}
          color="#fff"
          style={{ transform: [{ rotate: isRTL ? "180deg" : "0deg" }] }}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════

export function ChatScreen(): React.JSX.Element {
  const { t, isRTL } = useLocale();
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session);
  const { width: screenW } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // ── Tab bar clearance ─────────────────────────────────────────────────────
  let tabH = 0;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    tabH = useBottomTabBarHeight();
  } catch {
    tabH = Platform.OS === "ios" ? 83 : 62;
  }
  const bottomOffset = tabH + insets.bottom;

  // ── State ─────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [vitalsSummary, setVitalsSummary] = useState(t("noVitals"));
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    let alive = true;

    async function loadChatContext() {
      if (!session?.user.id) {
        setVitalsSummary(t("noVitals"));
        return;
      }

      try {
        const profile = await patientService.getProfile(session.user.id);
        if (!profile) {
          if (alive) setVitalsSummary(t("noVitals"));
          return;
        }

        const [latestVitals, meds] = await Promise.all([
          vitalsService.getLatestVitals(profile.id),
          medicationService.getMedications(profile.id),
        ]);

        const activeMeds = meds
          .filter((m) => (m.active ?? m.is_active) !== false)
          .slice(0, 5)
          .map((m) => {
            const firstTime = parseMedicationTimes(m.times, m.time_of_day).find((dose) => dose.kind === "time");
            const displayTime = firstTime?.kind === "time" ? formatMedicationTime(firstTime.time) : undefined;
            return `${m.name}${m.dosage ? ` (${m.dosage})` : ""}${displayTime ? ` at ${displayTime}` : ""}`;
          });

        const parts = [
          `Patient: ${profile.full_name || "Unknown"}`,
          latestVitals
            ? `Latest vitals: HR ${latestVitals.heart_rate ?? "unknown"} bpm, BP ${latestVitals.blood_pressure_systolic ?? "--"}/${latestVitals.blood_pressure_diastolic ?? "--"} mmHg, SpO2 ${latestVitals.oxygen_saturation ?? "unknown"}%, Temp ${latestVitals.temperature ?? "unknown"} C.`
            : "Latest vitals: no saved readings.",
          activeMeds.length ? `Active medications: ${activeMeds.join("; ")}.` : "Active medications: none saved.",
        ];

        if (alive) setVitalsSummary(parts.join("\n"));
      } catch {
        if (alive) setVitalsSummary(t("noVitals"));
      }
    }

    loadChatContext();
    return () => {
      alive = false;
    };
  }, [session?.user.id, t]);

  // ── Static data (memoized) ────────────────────────────────────────────────
  const SUGGESTIONS = useMemo<Suggestion[]>(
    () => [
      { icon: "medical",     label: t("forgotMeds"),    color: colors.warning },
      { icon: "heart",       label: t("chestPain"),     color: colors.danger  },
      { icon: "thermometer", label: t("haveFever"),     color: colors.warning },
      { icon: "bandage",     label: t("haveWound"),     color: colors.primary },
      { icon: "call",        label: t("callEmergency"), color: colors.success },
    ],
    [t, colors],
  );

  const QUICK_REPLIES = useMemo(
    () => [t("drankLittleWater"), t("headachePersistent"), t("yesHaveFever")],
    [t],
  );

  const showQuickReplies =
    !typing &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant";

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (override?: string) => {
      const msg = (override ?? text).trim();
      if (!msg) return;

      const next: ChatMessage[] = [...messages, { role: "user", content: msg }];
      setMessages(next);
      setText("");
      setTyping(true);

      try {
        const reply = await sendChat(next, vitalsSummary);
        setMessages((cur) => [...cur, { role: "assistant", content: reply }]);
      } catch {
        setMessages((cur) => [...cur, { role: "assistant", content: t("aiError") }]);
      } finally {
        setTyping(false);
      }
    },
    [messages, text, t, vitalsSummary],
  );

  const scrollToEnd = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble
        role={item.role}
        content={item.content}
        isRTL={isRTL}
        colors={colors}
      />
    ),
    [isRTL, colors],
  );

  const cardW = Math.max(96, (screenW - 52) / 3.4);

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <Screen style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* 1 ── Header */}
        <ChatHeader
          title={t("healthAssistant")}
          statusLabel={t("availableNow")}
          isRTL={isRTL}
          colors={colors}
        />

        {/* 2 ── Empty-state suggestions */}
        {messages.length === 0 && (
          <SuggestionsRow
            suggestions={SUGGESTIONS}
            onSelect={handleSend}
            title={t("quickSuggestions")}
            isRTL={isRTL}
            colors={colors}
            cardWidth={cardW}
          />
        )}

        {/* 3 ── Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderMessage}
          onContentSizeChange={scrollToEnd}
          onLayout={scrollToEnd}
          removeClippedSubviews={Platform.OS === "android"}
          contentContainerStyle={[
            styles.list,
            {
              paddingBottom:
                bottomOffset + COMPOSER_H + QUICK_REPLIES_H + 16,
            },
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="chatbubbles-outline" size={30} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {t("startChat")}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                {t("howCanIHelp")}
              </Text>
            </View>
          }
        />

        {/* 4 ── Typing indicator */}
        {typing && (
          <TypingBubble
            isRTL={isRTL}
            colors={colors}
            label={t("rafeeqTyping")}
          />
        )}

        {/* 5 ── Quick replies (above composer) */}
        {showQuickReplies && (
          <QuickReplies
            data={QUICK_REPLIES}
            onSelect={handleSend}
            isRTL={isRTL}
            colors={colors}
          />
        )}

        {/* 6 ── Input composer */}
        <View
          style={[
            styles.composer,
            {
              marginBottom: bottomOffset + 8,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            isRTL && styles.rowRev,
          ]}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t("typeMessage")}
            placeholderTextColor={colors.textSecondary}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
            blurOnSubmit={false}
            multiline
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                textAlign: isRTL ? "right" : "left",
              },
            ]}
          />
          <SendButton
            onPress={() => handleSend()}
            disabled={!text.trim()}
            isRTL={isRTL}
            color={colors.primary}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ─── Styles (8pt system) ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowRev: { flexDirection: "row-reverse" },

  /* FlatList */
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexGrow: 1,
  },

  /* Empty state */
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptySub: {
    fontSize: 14,
    fontWeight: "500",
  },

  /* Composer — pill, 90% wide, centered */
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "90%",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: COMPOSER_H,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 0,
    maxHeight: 100,
    letterSpacing: 0.1,
  },

  /* Send button — circular */
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
