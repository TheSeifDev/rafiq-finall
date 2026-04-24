import React, { useState, useRef, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { AppInput } from '../components/ui/AppInput';
import { useLocale } from '../hooks/useLocale';
import { sendChat, type ChatMessage } from '../services/chat.service';

const C = {
  bg: '#0B1120',
  card: '#151E2E',
  cardBorder: '#1E293B',
  primary: '#06B6D4',
  primarySoft: 'rgba(6,182,212,0.15)',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  userBubble: '#06B6D4',
  assistantBubble: '#1E293B',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  purple: '#8B5CF6',
};

type QuickAction = { icon: string; label: string; color: string; bg: string };
type Suggestion = { icon: string; label: string; color: string; bg: string };
type Service = { icon: string; label: string; color: string; bg: string; borderColor: string };

export function ChatScreen(): React.JSX.Element {
  const { t, isRTL } = useLocale();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const quickActions: QuickAction[] = [
    { icon: 'chatbubble-ellipses', label: t('aiChat'), color: C.primary, bg: C.primarySoft },
    { icon: 'search', label: t('diseases'), color: C.textMuted, bg: 'rgba(148,163,184,0.1)' },
    { icon: 'help-circle', label: t('faq'), color: C.textMuted, bg: 'rgba(148,163,184,0.1)' },
    { icon: 'medical', label: t('emergency'), color: C.danger, bg: 'rgba(239,68,68,0.1)' },
  ];

  const suggestions: Suggestion[] = [
    { icon: 'medical', label: t('forgotMeds'), color: C.purple, bg: 'rgba(139,92,246,0.12)' },
    { icon: 'heart', label: t('chestPain'), color: C.danger, bg: 'rgba(239,68,68,0.12)' },
    { icon: 'thermometer', label: t('haveFever'), color: C.warning, bg: 'rgba(245,158,11,0.12)' },
    { icon: 'bandage', label: t('haveWound'), color: C.primary, bg: C.primarySoft },
    { icon: 'call', label: t('callEmergency'), color: C.success, bg: 'rgba(16,185,129,0.12)' },
  ];

  const services: Service[] = [
    { icon: 'person', label: t('doctorConsult'), color: C.success, bg: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' },
    { icon: 'call', label: t('callAmbulance'), color: C.purple, bg: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.2)' },
    { icon: 'location', label: t('shareLocation'), color: C.primary, bg: C.primarySoft, borderColor: 'rgba(6,182,212,0.2)' },
    { icon: 'medical', label: t('firstAid'), color: C.danger, bg: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' },
  ];

  const quickReplies = [
    t('drankLittleWater'),
    t('headachePersistent'),
    t('yesHaveFever'),
  ];

  const handleSend = useCallback(async (overrideText?: string) => {
    const messageText = overrideText || text.trim();
    if (!messageText) return;

    const userMessage: ChatMessage = { role: 'user', content: messageText };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setText('');
    setTyping(true);

    try {
      const reply = await sendChat(nextMessages, t('noVitals'));
      setMessages((current) => [...current, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((current) => [...current, { role: 'assistant', content: t('aiError') }]);
    } finally {
      setTyping(false);
    }
  }, [messages, text, t]);

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.role === 'user';
    const showQuickReplies = !isUser && index === messages.length - 1 && !typing;

    return (
      <View style={{ marginBottom: 12 }}>
        <View style={[styles.messageRow, isRTL ? styles.rowReverse : styles.row, !isUser && styles.assistantRow]}>
          {!isUser && (
            <View style={styles.avatar}>
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png' }}
                style={styles.avatarImg}
              />
            </View>
          )}
          <View style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.assistantBubble,
            isRTL && isUser ? { borderTopRightRadius: 4 } : isRTL ? { borderTopLeftRadius: 4 } : isUser ? { borderTopLeftRadius: 4 } : { borderTopRightRadius: 4 }
          ]}>
            <AppText style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}>
              {item.content}
            </AppText>
          </View>
        </View>

        {showQuickReplies && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.quickReplies, isRTL && styles.quickRepliesRTL]}
          >
            {quickReplies.map((reply) => (
              <TouchableOpacity
                key={reply}
                activeOpacity={0.85}
                onPress={() => handleSend(reply)}
                style={styles.quickReplyBtn}
              >
                <AppText style={styles.quickReplyText}>{reply}</AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  return (
    <Screen style={{ backgroundColor: C.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={[styles.header, isRTL && styles.rowReverse]}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarLarge}>
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png' }}
                style={styles.avatarLargeImg}
              />
            </View>
            <View style={styles.headerText}>
              <AppText variant="h2" style={[styles.headerTitle, isRTL && styles.textRight]}>{t('healthAssistant')}</AppText>
              <AppText style={[styles.headerSubtitle, isRTL && styles.textRight]}>{t('howCanIHelp')}</AppText>
              <View style={[styles.statusRow, isRTL && styles.rowReverse]}>
                <View style={[styles.statusDot, { backgroundColor: C.success }]} />
                <AppText style={styles.statusText}>{t('availableNow')}</AppText>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={C.text} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.quickActions, isRTL && styles.quickActionsRTL]}
        >
          {quickActions.map((action, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.85}
              style={[
                styles.actionChip,
                idx === 0 && { backgroundColor: C.primarySoft, borderColor: C.primary }
              ]}
            >
              <Ionicons name={action.icon as any} size={18} color={idx === 0 ? C.primary : action.color} />
              <AppText style={[styles.actionChipText, idx === 0 && { color: C.primary }]}>{action.label}</AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Suggestions Header */}
        {messages.length === 0 && (
          <View style={[styles.suggestionsHeader, isRTL && styles.rowReverse]}>
            <AppText style={styles.suggestionsTitle}>{t('quickSuggestions')}</AppText>
            <TouchableOpacity>
              <AppText style={styles.seeAll}>{t('showAll')}</AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* Suggestions */}
        {messages.length === 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.suggestions, isRTL && styles.suggestionsRTL]}
          >
            {suggestions.map((s, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.85}
                onPress={() => handleSend(s.label)}
                style={[styles.suggestionCard, { backgroundColor: s.bg, borderColor: s.color + '20' }]}
              >
                <View style={[styles.suggestionIcon, { backgroundColor: s.color + '18' }]}>
                  <Ionicons name={s.icon as any} size={22} color={s.color} />
                </View>
                <AppText style={[styles.suggestionText, { color: C.text }]}>{s.label}</AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={renderMessage}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <AppText style={styles.emptyText}>{t('startChat')}</AppText>
            </View>
          }
        />

        {/* Typing Indicator */}
        {typing && (
          <View style={[styles.typingRow, isRTL && styles.rowReverse]}>
            <View style={styles.avatarSmall}>
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png' }}
                style={styles.avatarSmallImg}
              />
            </View>
            <View style={styles.typingBubble}>
              <ActivityIndicator color={C.primary} size="small" />
              <AppText style={styles.typingText}>{t('rafeeqTyping')}</AppText>
            </View>
          </View>
        )}

        {/* Input Bar */}
        <View style={[styles.inputBar, isRTL && styles.rowReverse]}>
          <TouchableOpacity style={styles.inputIconBtn}>
            <Ionicons name="add" size={24} color={C.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.inputIconBtn}>
            <Ionicons name="mic-outline" size={22} color={C.textMuted} />
          </TouchableOpacity>
          <View style={styles.inputWrap}>
            <AppInput
              value={text}
              onChangeText={setText}
              placeholder={t('typeMessage')}
              placeholderTextColor={C.textMuted}
            />
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleSend()}
            disabled={!text.trim()}
            style={[styles.sendBtn, { opacity: text.trim() ? 1 : 0.5 }]}
          >
            <Ionicons name="send" size={20} color="#fff" style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
          </TouchableOpacity>
        </View>

        {/* Quick Services */}
        <View style={styles.servicesSection}>
          <View style={[styles.servicesHeader, isRTL && styles.rowReverse]}>
            <AppText style={styles.servicesTitle}>{t('quickServices')}</AppText>
            <TouchableOpacity>
              <AppText style={styles.seeAll}>{t('showAll')}</AppText>
            </TouchableOpacity>
          </View>
          <View style={[styles.servicesGrid, isRTL && styles.rowReverse]}>
            {services.map((service, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.85}
                style={[styles.serviceCard, { backgroundColor: service.bg, borderColor: service.borderColor }]}
              >
                <View style={[styles.serviceIcon, { backgroundColor: service.color + '18' }]}>
                  <Ionicons name={service.icon as any} size={20} color={service.color} />
                </View>
                <AppText style={[styles.serviceText, { color: C.text }]}>{service.label}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowReverse: { flexDirection: 'row-reverse' },
  row: { flexDirection: 'row' },
  textRight: { textAlign: 'right' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.primary + '30',
  },
  avatarLargeImg: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: C.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: C.textMuted,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: C.success,
    fontWeight: '700',
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickActions: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  quickActionsRTL: {
    flexDirection: 'row-reverse',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  actionChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textMuted,
  },

  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  suggestionsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.text,
  },
  seeAll: {
    fontSize: 13,
    color: C.primary,
    fontWeight: '700',
  },
  suggestions: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 8,
  },
  suggestionsRTL: {
    flexDirection: 'row-reverse',
  },
  suggestionCard: {
    width: 100,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  suggestionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },

  messagesList: {
    padding: 16,
    paddingBottom: 8,
    gap: 4,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: C.textMuted,
    fontSize: 14,
  },

  messageRow: {
    alignItems: 'flex-end',
    gap: 8,
  },
  assistantRow: {
    alignItems: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  bubble: {
    maxWidth: '78%',
    padding: 14,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: C.userBubble,
    borderTopRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: C.assistantBubble,
    borderTopLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
    fontWeight: '600',
  },
  assistantText: {
    color: C.text,
    fontWeight: '500',
  },

  quickReplies: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  quickRepliesRTL: {
    flexDirection: 'row-reverse',
  },
  quickReplyBtn: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickReplyText: {
    fontSize: 13,
    color: C.text,
    fontWeight: '600',
  },

  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmallImg: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.assistantBubble,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  typingText: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: '600',
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  inputIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    height: 44,
    paddingHorizontal: 14,
    color: C.text,
    fontSize: 14,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  servicesSection: {
    padding: 12,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  servicesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  servicesTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.text,
  },
  servicesGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  serviceCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
});