import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, AppText, Spacer } from '../../components/ui';
import { useTheme } from '../../store/ThemeContext';
import { useAuth } from '../../store/AuthContext';
import { chatService } from '../../services/chat.service';
import { spacing, radius, shadows, typography } from '../../theme';
import type { ChatMessage } from '../../types/database';

// ─── Greeting shown the first time ───────────────────────────────────────────
const GREETING: Omit<ChatMessage, 'user_id'> = {
  id: '__greeting__',
  role: 'assistant',
  content: 'مرحباً! أنا رفيق، مساعدك الصحي الذكي 🌿\nيمكنني مساعدتك في أسئلة تتعلق بالضغط، النبض، السكر، الأدوية، والعادات الصحية.\nبماذا يمكنني مساعدتك اليوم؟',
  created_at: new Date().toISOString(),
};

// ─── Typing indicator (animated dots) ─────────────────────────────────────────
function TypingIndicator({ colors }: { colors: ReturnType<typeof useTheme>['colors'] }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: colors.card }]}>
      <View style={styles.dotsRow}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { backgroundColor: colors.textSecondary, opacity: dot }]}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Single Message Bubble ────────────────────────────────────────────────────
function MessageBubble({
  message,
  colors,
}: {
  message: ChatMessage | typeof GREETING;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
      {!isUser && (
        <View style={[styles.avatarMini, { backgroundColor: colors.primary + '20' }]}>
          <MaterialCommunityIcons name="robot-outline" size={16} color={colors.primary} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: colors.primary }]
            : [styles.assistantBubble, { backgroundColor: colors.card, ...shadows.sm }],
          { maxWidth: '78%' },
        ]}
      >
        <AppText
          variant="bodySmall"
          color={isUser ? '#FFFFFF' : colors.text}
          style={styles.bubbleText}
        >
          {message.content}
        </AppText>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();

  const [messages, setMessages] = useState<(ChatMessage | typeof GREETING)[]>([GREETING]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const listRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // Load persisted chat history on mount
  useEffect(() => {
    if (!user || historyLoaded) return;

    const loadHistory = async () => {
      try {
        const history = await chatService.getHistory(user.id);
        if (history.length > 0) {
          setMessages([GREETING, ...history]);
        }
        setHistoryLoaded(true);
      } catch {
        setHistoryLoaded(true);
      }
    };

    loadHistory();
  }, [user, historyLoaded]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isSending || !user) return;

    setInputText('');
    setIsSending(true);

    // Optimistic user message
    const optimisticUserMsg: ChatMessage = {
      id: `opt_${Date.now()}`,
      user_id: user.id,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    scrollToBottom();

    // Show typing indicator
    setIsTyping(true);

    try {
      // Save user message to DB
      await chatService.saveMessage({
        user_id: user.id,
        role: 'user',
        content: text,
      });

      // Get current messages for context (skip greeting, last 10)
      const currentHistory = messages
        .filter((m) => m.id !== '__greeting__')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      // Get AI reply
      const { reply } = await chatService.getAIReply(text, currentHistory);

      // Save assistant reply to DB
      const { data: savedReply } = await chatService.saveMessage({
        user_id: user.id,
        role: 'assistant',
        content: reply,
      });

      const assistantMsg: ChatMessage = savedReply ?? {
        id: `asst_${Date.now()}`,
        user_id: user.id,
        role: 'assistant',
        content: reply,
        created_at: new Date().toISOString(),
      };

      setIsTyping(false);
      setMessages((prev) => [...prev, assistantMsg]);
      scrollToBottom();
    } catch {
      setIsTyping(false);
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        user_id: user.id,
        role: 'assistant',
        content: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, user, messages, scrollToBottom]);

  const handleClearHistory = () => {
    Alert.alert(
      'مسح المحادثة',
      'هل تريد مسح تاريخ المحادثة بالكامل؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'مسح',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            await chatService.clearHistory(user.id);
            setMessages([GREETING]);
          },
        },
      ]
    );
  };

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage | typeof GREETING }) => (
      <MessageBubble message={item} colors={colors} />
    ),
    [colors]
  );

  return (
    <Screen padded={false} backgroundColor={isDarkMode ? colors.background : '#F7F9FC'}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {/* ── Header ─────────────────────────────────── */}
          <View style={[styles.header, { backgroundColor: isDarkMode ? colors.surface : '#FFFFFF', ...shadows.sm }]}>
            <TouchableOpacity onPress={handleClearHistory} style={styles.clearBtn}>
              <MaterialCommunityIcons name="delete-sweep-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <View style={[styles.headerAvatar, { backgroundColor: colors.primary + '18' }]}>
                <MaterialCommunityIcons name="robot-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ marginRight: spacing.sm }}>
                <AppText variant="label">رفيق الذكي</AppText>
                <AppText variant="caption" color={colors.accentGreen}>
                  ● متصل
                </AppText>
              </View>
            </View>
          </View>

          {/* ── Message List ───────────────────────────── */}
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
            ListFooterComponent={
              isTyping ? <TypingIndicator colors={colors} /> : null
            }
          />

          {/* ── Input Bar ──────────────────────────────── */}
          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
                borderTopColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: inputText.trim() ? colors.primary : colors.border,
                  opacity: isSending ? 0.6 : 1,
                },
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: isDarkMode ? colors.background : '#F3F4F6',
                },
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="اكتب رسالتك..."
              placeholderTextColor={colors.textSecondary}
              textAlign="right"
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  clearBtn: {
    padding: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-start',
  },
  assistantRow: {
    justifyContent: 'flex-end',
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
    flexShrink: 0,
  },
  bubble: {
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userBubble: {
    borderBottomLeftRadius: radius.sm,
  },
  assistantBubble: {
    borderBottomRightRadius: radius.sm,
  },
  bubbleText: {
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inputBar: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    padding: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 120,
    ...typography.bodySmall,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
