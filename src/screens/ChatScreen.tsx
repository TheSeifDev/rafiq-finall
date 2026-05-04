import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  FlatList,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
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

/* ── Palette derived from design system ── */
const palette = (dark: boolean) => ({
  bg: dark ? "#0A0F1C" : "#F5F7FA",
  surface: dark ? "#111827" : "#FFFFFF",
  card: dark ? "#1A2332" : "#FFFFFF",
  cardBorder: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
  primary: "#00C2FF",
  primarySoft: dark ? "rgba(0,194,255,0.12)" : "rgba(0,194,255,0.08)",
  secondary: "#1E3A8A",
  text: dark ? "#F1F5F9" : "#1E293B",
  textMuted: dark ? "#94A3B8" : "#64748B",
  userBubbleStart: "#00C2FF",
  userBubbleEnd: "#1E3A8A",
  assistantBubble: dark ? "rgba(17,24,39,0.85)" : "rgba(241,245,249,0.95)",
  assistantBorder: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
  success: "#10B981",
  danger: "#FF3B3B",
  warning: "#F59E0B",
  purple: "#A855F7",
  inputBg: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
  inputBorder: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
});

/* ── Typing dots animation ── */
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
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
      {dots.map((opacity, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: color,
            opacity,
          }}
        />
      ))}
    </View>
  );
}

/* ── Message entrance animation wrapper ── */
function AnimatedMessage({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

type QuickAction = { icon: string; label: string; color: string };
type Suggestion = { icon: string; label: string; color: string };
type Service = { icon: string; label: string; color: string };

export function ChatScreen(): React.JSX.Element {
  const { t, isRTL } = useLocale();
  const { darkMode } = useTheme();
  const C = palette(darkMode);
  const { width: screenW } = useWindowDimensions();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const quickActions: QuickAction[] = [
    { icon: "chatbubble-ellipses", label: t("aiChat"), color: C.primary },
    { icon: "search", label: t("diseases"), color: C.textMuted },
    { icon: "help-circle", label: t("faq"), color: C.textMuted },
    { icon: "medical", label: t("emergency"), color: C.danger },
  ];

  const suggestions: Suggestion[] = [
    { icon: "medical", label: t("forgotMeds"), color: C.purple },
    { icon: "heart", label: t("chestPain"), color: C.danger },
    { icon: "thermometer", label: t("haveFever"), color: C.warning },
    { icon: "bandage", label: t("haveWound"), color: C.primary },
    { icon: "call", label: t("callEmergency"), color: C.success },
  ];

  const services: Service[] = [
    { icon: "person", label: t("doctorConsult"), color: C.success },
    { icon: "call", label: t("callAmbulance"), color: C.purple },
    { icon: "location", label: t("shareLocation"), color: C.primary },
    { icon: "medical", label: t("firstAid"), color: C.danger },
  ];

  const quickReplies = [
    t("drankLittleWater"),
    t("headachePersistent"),
    t("yesHaveFever"),
  ];

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
        setMessages((current) => [
          ...current,
          { role: "assistant", content: reply },
        ]);
      } catch {
        setMessages((current) => [
          ...current,
          { role: "assistant", content: t("aiError") },
        ]);
      } finally {
        setTyping(false);
      }
    },
    [messages, text, t],
  );

  const suggestionW = Math.max(100, (screenW - 64) / 3.2);

  const renderMessage = ({
    item,
    index,
  }: {
    item: ChatMessage;
    index: number;
  }) => {
    const isUser = item.role === "user";
    const showQuickReplies =
      !isUser && index === messages.length - 1 && !typing;

    return (
      <AnimatedMessage>
        <View style={{ marginBottom: 14 }}>
          <View
            style={[
              styles.messageRow,
              isRTL ? styles.rowReverse : styles.row,
              !isUser && styles.assistantRow,
            ]}
          >
            {!isUser && (
              <View style={[styles.avatar, { backgroundColor: C.primarySoft }]}>
                <Image
                  source={{
                    uri: "https://cdn-icons-png.flaticon.com/512/4712/4712035.png",
                  }}
                  style={styles.avatarImg}
                />
              </View>
            )}
            <View
              style={[
                styles.bubble,
                isUser
                  ? [styles.userBubble, { backgroundColor: C.userBubbleStart }]
                  : [
                      styles.assistantBubble,
                      {
                        backgroundColor: C.assistantBubble,
                        borderColor: C.assistantBorder,
                      },
                    ],
                isRTL && isUser
                  ? { borderTopRightRadius: 4 }
                  : isRTL && !isUser
                    ? { borderTopLeftRadius: 4 }
                    : isUser
                      ? { borderTopRightRadius: 4 }
                      : { borderTopLeftRadius: 4 },
              ]}
            >
              <AppText
                style={[
                  styles.bubbleText,
                  isUser ? styles.userText : { color: C.text },
                ]}
              >
                {item.content}
              </AppText>
            </View>
          </View>

          {showQuickReplies && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.quickReplies,
                isRTL && styles.rowReverse,
              ]}
            >
              {quickReplies.map((reply) => (
                <TouchableOpacity
                  key={reply}
                  activeOpacity={0.7}
                  onPress={() => handleSend(reply)}
                  style={[
                    styles.quickReplyBtn,
                    {
                      backgroundColor: C.primarySoft,
                      borderColor: C.primary + "30",
                    },
                  ]}
                >
                  <AppText
                    style={[styles.quickReplyText, { color: C.primary }]}
                  >
                    {reply}
                  </AppText>
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
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* ── Header ── */}
        <View
          style={[
            styles.header,
            { backgroundColor: C.surface, borderBottomColor: C.cardBorder },
            isRTL && styles.rowReverse,
          ]}
        >
          <View style={[styles.headerLeft, isRTL && styles.rowReverse]}>
            <View
              style={[styles.avatarLarge, { borderColor: C.primary + "40" }]}
            >
              <View
                style={[
                  styles.avatarLargeInner,
                  { backgroundColor: C.primarySoft },
                ]}
              >
                <Image
                  source={{
                    uri: "https://cdn-icons-png.flaticon.com/512/4712/4712035.png",
                  }}
                  style={styles.avatarLargeImg}
                />
              </View>
            </View>
            <View style={styles.headerText}>
              <AppText
                style={[
                  styles.headerTitle,
                  { color: C.text },
                  isRTL && styles.textRight,
                ]}
              >
                {t("healthAssistant")}
              </AppText>
              <View style={[styles.statusRow, isRTL && styles.rowReverse]}>
                <View
                  style={[styles.statusDot, { backgroundColor: C.success }]}
                />
                <AppText style={[styles.statusText, { color: C.success }]}>
                  {t("availableNow")}
                </AppText>
              </View>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.bellBtn,
              { backgroundColor: C.card, borderColor: C.cardBorder },
            ]}
          >
            <Ionicons name="notifications-outline" size={20} color={C.text} />
          </TouchableOpacity>
        </View>

        {/* ── Quick Actions ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.quickActions,
            isRTL && styles.rowReverse,
          ]}
        >
          {quickActions.map((action, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              style={[
                styles.actionChip,
                {
                  backgroundColor: idx === 0 ? C.primarySoft : C.card,
                  borderColor: idx === 0 ? C.primary + "40" : C.cardBorder,
                },
              ]}
            >
              <Ionicons
                name={action.icon as any}
                size={16}
                color={idx === 0 ? C.primary : action.color}
              />
              <AppText
                style={[
                  styles.actionChipText,
                  { color: idx === 0 ? C.primary : C.textMuted },
                ]}
              >
                {action.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Suggestions (empty state) ── */}
        {messages.length === 0 && (
          <>
            <View
              style={[styles.suggestionsHeader, isRTL && styles.rowReverse]}
            >
              <AppText style={[styles.suggestionsTitle, { color: C.text }]}>
                {t("quickSuggestions")}
              </AppText>
              <TouchableOpacity activeOpacity={0.7}>
                <AppText style={[styles.seeAll, { color: C.primary }]}>
                  {t("showAll")}
                </AppText>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.suggestions,
                isRTL && styles.rowReverse,
              ]}
            >
              {suggestions.map((s, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  onPress={() => handleSend(s.label)}
                  style={[
                    styles.suggestionCard,
                    {
                      width: suggestionW,
                      backgroundColor: s.color + "0D",
                      borderColor: s.color + "20",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.suggestionIcon,
                      { backgroundColor: s.color + "18" },
                    ]}
                  >
                    <Ionicons name={s.icon as any} size={22} color={s.color} />
                  </View>
                  <AppText
                    style={[styles.suggestionText, { color: C.text }]}
                    numberOfLines={2}
                  >
                    {s.label}
                  </AppText>
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
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          renderItem={renderMessage}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View
                style={[styles.emptyIcon, { backgroundColor: C.primarySoft }]}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={32}
                  color={C.primary}
                />
              </View>
              <AppText style={[styles.emptyTitle, { color: C.text }]}>
                {t("startChat")}
              </AppText>
              <AppText style={[styles.emptySubtext, { color: C.textMuted }]}>
                {t("howCanIHelp")}
              </AppText>
            </View>
          }
        />

        {/* ── Typing Indicator ── */}
        {typing && (
          <View style={[styles.typingRow, isRTL && styles.rowReverse]}>
            <View
              style={[styles.avatarSmall, { backgroundColor: C.primarySoft }]}
            >
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/4712/4712035.png",
                }}
                style={styles.avatarSmallImg}
              />
            </View>
            <View
              style={[
                styles.typingBubble,
                {
                  backgroundColor: C.assistantBubble,
                  borderColor: C.assistantBorder,
                },
              ]}
            >
              <TypingDots color={C.primary} />
              <AppText style={[styles.typingText, { color: C.textMuted }]}>
                {t("rafeeqTyping")}
              </AppText>
            </View>
          </View>
        )}

        {/* ── Input Composer ── */}
        <View
          style={[
            styles.inputBar,
            { backgroundColor: C.surface, borderTopColor: C.cardBorder },
            isRTL && styles.rowReverse,
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.inputIconBtn,
              { backgroundColor: C.inputBg, borderColor: C.inputBorder },
            ]}
          >
            <Ionicons name="add" size={22} color={C.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.inputIconBtn,
              { backgroundColor: C.inputBg, borderColor: C.inputBorder },
            ]}
          >
            <Ionicons name="mic-outline" size={20} color={C.textMuted} />
          </TouchableOpacity>
          <View style={styles.inputWrap}>
            <AppInput
              value={text}
              onChangeText={setText}
              placeholder={t("typeMessage")}
              placeholderTextColor={C.textMuted}
            />
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSend()}
            disabled={!text.trim()}
            style={[
              styles.sendBtn,
              { backgroundColor: C.primary, opacity: text.trim() ? 1 : 0.4 },
              text.trim() ? styles.sendBtnGlow : null,
            ]}
          >
            <Ionicons
              name="send"
              size={18}
              color="#fff"
              style={{ transform: [{ rotate: isRTL ? "180deg" : "0deg" }] }}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  row: { flexDirection: "row" },
  textRight: { textAlign: "right" },

  /* ── Header ── */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLargeInner: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLargeImg: { width: 30, height: 30, resizeMode: "contain" },
  headerText: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: "600" },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Quick Actions ── */
  quickActions: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
  },
  actionChipText: { fontSize: 13, fontWeight: "600" },

  /* ── Suggestions ── */
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  suggestionsTitle: { fontSize: 15, fontWeight: "700" },
  seeAll: { fontSize: 13, fontWeight: "600" },
  suggestions: { paddingHorizontal: 16, gap: 10, paddingBottom: 8 },
  suggestionCard: {
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
  },
  suggestionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },

  /* ── Messages ── */
  messagesList: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  emptyChat: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySubtext: { fontSize: 13, fontWeight: "500" },

  messageRow: { alignItems: "flex-end", gap: 8 },
  assistantRow: { alignItems: "flex-start" },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 22, height: 22, resizeMode: "contain" },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: { borderTopRightRadius: 4 },
  assistantBubble: { borderTopLeftRadius: 4, borderWidth: 1 },
  bubbleText: { fontSize: 14, lineHeight: 22 },
  userText: { color: "#fff", fontWeight: "500" },

  /* ── Quick Replies ── */
  quickReplies: { paddingHorizontal: 48, paddingTop: 8, gap: 8 },
  quickReplyBtn: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  quickReplyText: { fontSize: 13, fontWeight: "600" },

  /* ── Typing ── */
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  avatarSmall: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmallImg: { width: 18, height: 18, resizeMode: "contain" },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  typingText: { fontSize: 12, fontWeight: "600" },

  /* ── Input Composer ── */
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  inputIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: { flex: 1 },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnGlow: {
    shadowColor: "#00C2FF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },

  /* ── Services (2×2) ── */
  servicesSection: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  servicesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  servicesTitle: { fontSize: 14, fontWeight: "700" },
  servicesGrid: { gap: 8 },
  servicesRow: { flexDirection: "row", gap: 8 },
  serviceCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 17,
  },
});
