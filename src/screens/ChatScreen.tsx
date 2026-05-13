/**
 * ChatScreen — Premium Healthcare AI Assistant
 * Uses official OpenRouter SDK with modern premium UI
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { Screen } from "../components/ui/Screen";
import { useLocale } from "../hooks/useLocale";
import { useTheme } from "../theme/useTheme";
import { useAuthStore } from "../store/auth.store";
import { useAICHat, type ChatMessage } from "../lib/ai/hooks/useAICHat";
import { patientService } from "../services/patient.service";
import { vitalsService } from "../services/vitals.service";
import { medicationService } from "../services/medication.service";
import { parseMedicationTimes, formatMedicationTime } from "../lib/medications/medicationSchedule";
import {
  AIMessageBubble,
  UserMessageBubble,
  AIInputBar,
  ThinkingIndicator,
  AIHeader,
  SuggestionChips,
  ChatEmptyState,
} from "../components/chat/premium";
import { HealthContextData } from "../lib/ai/orchestration";

// ═══════════════════════════════════════════════════════════════════════════
// Initial Suggestions
// ═══════════════════════════════════════════════════════════════════════════

function InitialSuggestions({
  onSelect,
  isRTL,
  colors,
}: {
  onSelect: (msg: string) => void;
  isRTL: boolean;
  colors: any;
}) {
  const suggestions = isRTL
    ? [
        { icon: 'medical', label: 'تذكير بالأدوية' },
        { icon: 'heart', label: 'نبض القلب' },
        { icon: 'thermometer', label: 'قياس الحرارة' },
        { icon: 'bandage', label: 'جرح؟' },
        { icon: 'call', label: 'طوارئ' },
      ]
    : [
        { icon: 'medical', label: 'Med reminder' },
        { icon: 'heart', label: 'Heart rate' },
        { icon: 'thermometer', label: 'Check fever' },
        { icon: 'bandage', label: 'Have wound?' },
        { icon: 'call', label: 'Emergency' },
      ];

  const getIcon = (icon: string) => {
    const map: Record<string, string> = {
      medical: 'medical',
      heart: 'heart',
      thermometer: 'thermometer',
      bandage: 'bandage',
      call: 'call',
    };
    return map[icon] || 'help';
  };

  return (
    <View style={[styles.suggestionsContainer, isRTL && styles.suggestionsContainerRTL]}>
      <Text style={[styles.suggestionsTitle, { color: colors.textSecondary }]}>
        {isRTL ? 'ابدأ بسؤال:' : 'Start with a question:'}
      </Text>
      <View style={[styles.suggestionChips, isRTL && styles.suggestionChipsRTL]}>
        {suggestions.map((item, index) => (
          <Pressable
            key={index}
            style={[
              styles.suggestionChip,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => onSelect(item.label)}
          >
            <Ionicons
              name={getIcon(item.icon) as any}
              size={16}
              color={colors.primary}
              style={isRTL ? { marginLeft: 6, marginRight: 0 } : { marginRight: 6 }}
            />
            <Text style={[styles.suggestionLabel, { color: colors.textPrimary }]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════════════════════════════════

export function ChatScreen(): React.JSX.Element {
  const { t, isRTL } = useLocale();
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session);
  const insets = useSafeAreaInsets();

  // Tab bar clearance
  let tabH = 0;
  try {
    tabH = useBottomTabBarHeight();
  } catch {
    tabH = Platform.OS === "ios" ? 83 : 62;
  }
  const bottomOffset = tabH + insets.bottom;

  // Health context state
  const [healthContext, setHealthContext] = useState<HealthContextData>({
    patientName: "User",
    latestVitals: {},
    medications: [],
    recentAlerts: [],
    foodLogs: [],
    sleepRecords: [],
    lastUpdated: new Date().toISOString(),
  });

  const listRef = useRef<FlatList>(null);

  // Load health context
  useEffect(() => {
    let alive = true;

    async function loadHealthContext() {
      if (!session?.user.id) return;

      try {
        const profile = await patientService.getProfile(session.user.id);
        if (!profile || !alive) return;

        const [latestVitals, meds] = await Promise.all([
          vitalsService.getLatestVitals(profile.id),
          medicationService.getMedications(profile.id),
        ]);

        const medications = meds
          .filter((m) => (m.active ?? m.is_active) !== false)
          .map((m) => {
            const firstTime = parseMedicationTimes(m.times, m.time_of_day).find((dose) => dose.kind === "time");
            const time = firstTime?.kind === "time" ? formatMedicationTime(firstTime.time) : undefined;
            return {
              name: m.name,
              dosage: m.dosage,
              time,
              active: true,
            };
          });

        if (alive) {
          setHealthContext({
            patientName: profile.full_name || "User",
            latestVitals: {
              heartRate: latestVitals?.heart_rate ?? undefined,
              bloodPressureSys: latestVitals?.blood_pressure_systolic ?? undefined,
              bloodPressureDia: latestVitals?.blood_pressure_diastolic ?? undefined,
              oxygenSaturation: latestVitals?.oxygen_saturation ?? undefined,
              temperature: latestVitals?.temperature ?? undefined,
            },
            medications,
            recentAlerts: [],
            foodLogs: [],
            sleepRecords: [],
            lastUpdated: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.log("[Chat] Failed to load health context:", err);
      }
    }

    loadHealthContext();
    return () => {
      alive = false;
    };
  }, [session?.user.id]);

  // AI Chat hook
  const {
    messages,
    isLoading,
    isStreaming,
    isReasoning,
    provider,
    sendMessage,
    selectSuggestion,
  } = useAICHat({
    healthContext,
    isRTL,
    onError: (err) => console.log("[Chat] Error:", err),
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, messages[messages.length - 1]?.content]);

  // Render message item
  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      if (item.role === 'user') {
        return <UserMessageBubble content={item.content} isRTL={isRTL} />;
      }

      return (
        <AIMessageBubble
          content={item.content}
          isStreaming={item.isStreaming}
          isThinking={item.isReasoning}
          isRTL={isRTL}
        />
      );
    },
    [isRTL]
  );

  // Get latest suggestions
  const suggestions = useMemo(() => {
    const lastMessage = messages.filter(m => m.role === 'assistant' && !m.isStreaming).pop();
    return lastMessage?.suggestedReplies || [];
  }, [messages]);

  // Has messages
  const hasMessages = messages.length > 0;

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <AIHeader isRTL={isRTL} colors={colors} />

        {/* Content */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: bottomOffset + 80,
            },
          ]}
          ListEmptyComponent={
            <ChatEmptyState isRTL={isRTL} onSelectSuggestion={sendMessage} />
          }
          ListHeaderComponent={
            !hasMessages ? (
              <InitialSuggestions
                onSelect={sendMessage}
                isRTL={isRTL}
                colors={colors}
              />
            ) : null
          }
        />

        {/* Thinking indicator */}
        {(isLoading || isStreaming) && hasMessages && (
          <View style={[styles.thinkingContainer, { bottom: bottomOffset + 80 }]}>
            <ThinkingIndicator isRTL={isRTL} />
          </View>
        )}

        {/* Suggestions */}
        {hasMessages && !isLoading && suggestions.length > 0 && (
          <View style={[styles.suggestionsBottom, { bottom: bottomOffset + 70 }]}>
            <SuggestionChips
              suggestions={suggestions}
              onSelect={selectSuggestion}
              isRTL={isRTL}
            />
          </View>
        )}

        {/* Input */}
        <View style={{ paddingBottom: bottomOffset }}>
          <AIInputBar
            onSend={sendMessage}
            isRTL={isRTL}
            disabled={isLoading}
            placeholder={isRTL ? 'اسأل عن صحتك...' : 'Ask about your health...'}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  // List
  listContent: {
    paddingHorizontal: 0,
    paddingTop: 16,
    flexGrow: 1,
  },

  // Initial suggestions
  suggestionsContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  suggestionsContainerRTL: {
    alignItems: 'flex-end',
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChipsRTL: {
    flexDirection: 'row-reverse',
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  suggestionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Thinking
  thinkingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },

  // Suggestions bottom
  suggestionsBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
});

export default ChatScreen;