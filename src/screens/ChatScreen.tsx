import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  FlatList,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../components/ui/AppText";
import { Screen } from "../components/ui/Screen";
import { AppInput } from "../components/ui/AppInput";
import { useLocale } from "../hooks/useLocale";
import { sendChat, type ChatMessage } from "../services/chat.service";
import { useTheme } from "../theme/useTheme";
import { spacing, radius } from "../theme";

/* ── Palette ── */
const palette = (dark: boolean) => ({
  bg: dark ? "#0A0F1C" : "#F5F7FA",
  surface: dark ? "#111827" : "#FFFFFF",
  card: dark ? "rgba(26,35,50,0.85)" : "rgba(255,255,255,0.92)",
  cardBorder: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
  primary: "#00C2FF",
  primarySoft: dark ? "rgba(0,194,255,0.12)" : "rgba(0,194,255,0.08)",
  text: dark ? "#F1F5F9" : "#1E293B",
  textMuted: dark ? "#94A3B8" : "#64748B",
  userBubble: "#00C2FF",
  assistantBubble: dark ? "rgba(26,35,50,0.90)" : "rgba(241,245,249,0.95)",
  assistantBorder: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
  success: "#10B981",
  danger: "#FF3B3B",
  warning: "#F59E0B",
  purple: "#A855F7",
  inputBg: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
  inputBorder: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
});

/* ── Typing dots ── */
function TypingDots({ color }: { color: string }) {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);
  return (
    <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
      {dots.map((opacity, i) => (
        <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, opacity }} />
      ))}
    </View>
  );
}

/* ── Message entrance ── */
function AnimatedMessage({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

/* ── Send button with press scale ── */
function SendButton({ onPress, disabled, isRTL }: { onPress: () => void; disabled: boolean; isRTL: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn = () => Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, speed: 50 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  return (
    <TouchableOpacity activeOpacity={1} onPressIn={onIn} onPressOut={onOut} onPress={onPress} disabled={disabled}>
      <Animated.View style={[st.sendBtn, { backgroundColor: "#00C2FF", opacity: disabled ? 0.4 : 1, transform: [{ scale }] }]}>
        <Ionicons name="send" size={18} color="#fff" style={{ transform: [{ rotate: isRTL ? "180deg" : "0deg" }] }} />
      </Animated.View>
    </TouchableOpacity>
  );
}

type Suggestion = { icon: string; label: string; color: string };

/* ════════ MAIN CHAT SCREEN ════════ */
export function ChatScreen(): React.JSX.Element {
  const { t, isRTL } = useLocale();
  const { darkMode } = useTheme();
  const C = palette(darkMode);
  const { width: screenW } = useWindowDimensions();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const suggestions: Suggestion[] = [
    { icon: "medical", label: t("forgotMeds"), color: C.purple },
    { icon: "heart", label: t("chestPain"), color: C.danger },
    { icon: "thermometer", label: t("haveFever"), color: C.warning },
    { icon: "bandage", label: t("haveWound"), color: C.primary },
    { icon: "call", label: t("callEmergency"), color: C.success },
  ];

  const quickReplies = [t("drankLittleWater"), t("headachePersistent"), t("yesHaveFever")];

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const messageText = overrideText || text.trim();
      if (!messageText) return;
      const userMessage: ChatMessage = { role: "user", content: messageText };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setText("");
      setTyping(true);
      try {
        const reply = await sendChat(nextMessages, t("noVitals"));
        setMessages((current) => [...current, { role: "assistant", content: reply }]);
      } catch {
        setMessages((current) => [...current, { role: "assistant", content: t("aiError") }]);
      } finally {
        setTyping(false);
      }
    },
    [messages, text, t],
  );

  const suggestionW = Math.max(110, (screenW - 56) / 3);

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.role === "user";
    const showQuickReplies = !isUser && index === messages.length - 1 && !typing;

    return (
      <AnimatedMessage>
        <View style={{ marginBottom: 16 }}>
          <View style={[st.messageRow, isRTL ? st.rowReverse : st.row, !isUser && st.assistantRow]}>
            {!isUser && (
              <View style={[st.avatarSmall, { backgroundColor: C.primarySoft }]}>
                <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/4712/4712035.png" }} style={st.avatarSmallImg} />
              </View>
            )}
            <View
              style={[
                st.bubble,
                isUser
                  ? [st.userBubble, { backgroundColor: C.userBubble }]
                  : [st.assistantBubble, { backgroundColor: C.assistantBubble, borderColor: C.assistantBorder }],
                isRTL && isUser ? { borderTopRightRadius: 4 }
                  : isRTL && !isUser ? { borderTopLeftRadius: 4 }
                  : isUser ? { borderTopRightRadius: 4 }
                  : { borderTopLeftRadius: 4 },
              ]}
            >
              <AppText style={[st.bubbleText, isUser ? st.userText : { color: C.text }]}>
                {item.content}
              </AppText>
            </View>
          </View>

          {showQuickReplies && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={[st.quickReplies, isRTL && st.rowReverse]}>
              {quickReplies.map((reply) => (
                <TouchableOpacity key={reply} activeOpacity={0.7} onPress={() => handleSend(reply)}
                  style={[st.quickReplyBtn, { backgroundColor: C.primarySoft, borderColor: C.primary + "30" }]}>
                  <AppText style={[st.quickReplyText, { color: C.primary }]}>{reply}</AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </AnimatedMessage>
    );
  };

  return (
    <Screen style={{ backgroundColor: C.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={st.flex}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* ── Header ── */}
        <View style={[st.header, { backgroundColor: C.surface, borderBottomColor: C.cardBorder }, isRTL && st.rowReverse]}>
          <View style={[st.headerLeft, isRTL && st.rowReverse]}>
            <View style={[st.avatarLarge, { borderColor: C.primary + "40" }]}>
              <View style={[st.avatarLargeInner, { backgroundColor: C.primarySoft }]}>
                <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/4712/4712035.png" }} style={st.avatarLargeImg} />
              </View>
            </View>
            <View style={st.headerText}>
              <AppText style={[st.headerTitle, { color: C.text }, isRTL && st.textRight]}>{t("healthAssistant")}</AppText>
              <View style={[st.statusRow, isRTL && st.rowReverse]}>
                <View style={[st.statusDot, { backgroundColor: C.success }]} />
                <AppText style={[st.statusLabel, { color: C.success }]}>{t("availableNow")}</AppText>
              </View>
            </View>
          </View>
        </View>

        {/* ── Suggestions (empty state) ── */}
        {messages.length === 0 && (
          <>
            <View style={[st.suggestionsHeader, isRTL && st.rowReverse]}>
              <AppText style={[st.suggestionsTitle, { color: C.text }]}>{t("quickSuggestions")}</AppText>
              <TouchableOpacity activeOpacity={0.7}>
                <AppText style={[st.seeAll, { color: C.primary }]}>{t("showAll")}</AppText>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={[st.suggestions, isRTL && st.rowReverse]}>
              {suggestions.map((s, idx) => (
                <TouchableOpacity key={idx} activeOpacity={0.7} onPress={() => handleSend(s.label)}
                  style={[st.suggestionCard, { width: suggestionW, backgroundColor: s.color + "0D", borderColor: s.color + "20" }]}>
                  <View style={[st.suggestionIcon, { backgroundColor: s.color + "18" }]}>
                    <Ionicons name={s.icon as any} size={22} color={s.color} />
                  </View>
                  <AppText style={[st.suggestionText, { color: C.text }]} numberOfLines={2}>{s.label}</AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Messages ── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={st.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={renderMessage}
          ListEmptyComponent={
            <View style={st.emptyChat}>
              <View style={[st.emptyIcon, { backgroundColor: C.primarySoft }]}>
                <Ionicons name="chatbubbles-outline" size={36} color={C.primary} />
              </View>
              <AppText style={[st.emptyTitle, { color: C.text }]}>{t("startChat")}</AppText>
              <AppText style={[st.emptySubtext, { color: C.textMuted }]}>{t("howCanIHelp")}</AppText>
            </View>
          }
        />

        {/* ── Typing Indicator ── */}
        {typing && (
          <View style={[st.typingRow, isRTL && st.rowReverse]}>
            <View style={[st.typingAvatar, { backgroundColor: C.primarySoft }]}>
              <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/4712/4712035.png" }} style={st.typingAvatarImg} />
            </View>
            <View style={[st.typingBubble, { backgroundColor: C.assistantBubble, borderColor: C.assistantBorder }]}>
              <TypingDots color={C.primary} />
              <AppText style={[st.typingText, { color: C.textMuted }]}>{t("rafeeqTyping")}</AppText>
            </View>
          </View>
        )}

        {/* ── Input Composer ── */}
        <View style={[st.inputBar, { backgroundColor: C.surface, borderTopColor: C.cardBorder }, isRTL && st.rowReverse]}>
          <View style={st.inputWrap}>
            <AppInput
              value={text}
              onChangeText={setText}
              placeholder={t("typeMessage")}
              placeholderTextColor={C.textMuted}
            />
          </View>
          <SendButton onPress={() => handleSend()} disabled={!text.trim()} isRTL={isRTL} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/* ────────── STYLES ────────── */
const st = StyleSheet.create({
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  row: { flexDirection: "row" },
  textRight: { textAlign: "right" },

  /* Header */
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatarLarge: { width: 48, height: 48, borderRadius: 16, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatarLargeInner: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  avatarLargeImg: { width: 30, height: 30, resizeMode: "contain" },
  headerText: { flex: 1, gap: 3 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 11, fontWeight: "600" },

  /* Suggestions */
  suggestionsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 8, marginBottom: 12 },
  suggestionsTitle: { fontSize: 15, fontWeight: "700" },
  seeAll: { fontSize: 13, fontWeight: "600" },
  suggestions: { paddingHorizontal: 16, gap: 10, paddingBottom: 8 },
  suggestionCard: { borderRadius: radius.lg, padding: 14, alignItems: "center", gap: 10, borderWidth: 1 },
  suggestionIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  suggestionText: { fontSize: 12, fontWeight: "600", textAlign: "center", lineHeight: 18 },

  /* Messages */
  messagesList: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  emptyChat: { alignItems: "center", justifyContent: "center", paddingVertical: 56, gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: radius.xl, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptySubtext: { fontSize: 14, fontWeight: "500" },

  messageRow: { alignItems: "flex-end", gap: 8 },
  assistantRow: { alignItems: "flex-start" },
  avatarSmall: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  avatarSmallImg: { width: 22, height: 22, resizeMode: "contain" },
  bubble: { maxWidth: "78%", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 22 },
  userBubble: { borderTopRightRadius: 4 },
  assistantBubble: { borderTopLeftRadius: 4, borderWidth: 1 },
  bubbleText: { fontSize: 15, lineHeight: 23 },
  userText: { color: "#fff", fontWeight: "500" },

  /* Quick Replies */
  quickReplies: { paddingHorizontal: 48, paddingTop: 10, gap: 8 },
  quickReplyBtn: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 9 },
  quickReplyText: { fontSize: 13, fontWeight: "600" },

  /* Typing */
  typingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  typingAvatar: { width: 26, height: 26, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  typingAvatarImg: { width: 18, height: 18, resizeMode: "contain" },
  typingBubble: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderWidth: 1 },
  typingText: { fontSize: 12, fontWeight: "600" },

  /* Input Composer */
  inputBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  inputWrap: { flex: 1 },
  sendBtn: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", shadowColor: "#00C2FF", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
});
