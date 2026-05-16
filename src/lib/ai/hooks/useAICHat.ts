/**
 * AI Chat Hook
 * Healthcare AI with reasoning persistence and memory.
 *
 * STREAMING REMOVED: Expo SDK 54 React Native fetch does not support
 * ReadableStream. The onChunk callback from aiManager.generate() is
 * called once at completion with the full content.
 *
 * SAVE BUG FIXED: saveState() now receives messages explicitly
 * instead of capturing stale closure state.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aiManager, type AIResponse, type HealthContextData, type StreamChunk } from '../orchestration';

const STORAGE_KEY = '@rafiq_ai_state';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoningDetails?: string;
  timestamp: Date;
  isStreaming?: boolean;
  isReasoning?: boolean;
  suggestedReplies?: string[];
  healthInsights?: any[];
  tokensPerSecond?: number;
}

export interface AIChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  isReasoning: boolean;
  error: string | null;
  provider: string;
  tokensPerSecond: number;
}

interface UseAICHatOptions {
  healthContext: HealthContextData;
  isRTL?: boolean;
  onError?: (error: string) => void;
  onProviderChange?: (provider: string) => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAICHat({
  healthContext,
  isRTL = false,
  onError,
  onProviderChange,
}: UseAICHatOptions) {
  const [state, setState] = useState<AIChatState>({
    messages: [],
    isLoading: false,
    isStreaming: false,
    isReasoning: false,
    error: null,
    provider: 'none',
    tokensPerSecond: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize AI manager with health context
  useEffect(() => {
    aiManager.initialize(healthContext);
  }, [healthContext]);

  // Load persisted state on mount
  useEffect(() => {
    loadPersistedState();
  }, []);

  // ── Persistence helpers ───────────────────────────────────────────────────

  const loadPersistedState = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const messages: ChatMessage[] = (data.messages ?? []).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
          isStreaming: false,
          isReasoning: false,
        }));
        setState(prev => ({ ...prev, messages }));
      }
    } catch (err) {
      console.warn('[AI Chat] Failed to load persisted state:', (err as Error).message);
    }
  };

  /**
   * Persist messages to AsyncStorage.
   * Receives the message list explicitly to avoid stale closures.
   * Failure is isolated — it must never crash a successful generation.
   */
  const persistMessages = async (messages: ChatMessage[]): Promise<void> => {
    try {
      const toSave = messages.slice(-50).map(m => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
        isStreaming: false,
        isReasoning: false,
      }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: toSave }));
    } catch (err) {
      // Isolated: log but do not propagate
      console.error('[AI Chat] Persistence failed (non-fatal):', {
        message: (err as Error).message,
        location: 'persistMessages',
      });
    }
  };

  // ── Clear memory ──────────────────────────────────────────────────────────

  const clearMemory = useCallback(async () => {
    aiManager.clearMemory();
    setState(prev => ({
      ...prev,
      messages: [],
      provider: 'none',
      tokensPerSecond: 0,
    }));
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('[AI Chat] Failed to clear storage:', (err as Error).message);
    }
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string) => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const userMessage: ChatMessage = {
        id: `${Date.now()}_user`,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      const assistantId = `${Date.now()}_assistant`;
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      // Add user message + placeholder immediately
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage, assistantPlaceholder],
        isLoading: true,
        isStreaming: true,
        isReasoning: false,
        error: null,
      }));

      try {
        // aiManager.generate() is non-streaming on Expo SDK 54.
        // The onChunk callback receives the full content once at completion.
        const response: AIResponse = await aiManager.generate(
          content,
          (_chunk: StreamChunk) => {
            // No-op: content is applied from the resolved Promise below.
            // This callback is here for interface compatibility.
          }
        );

        const suggestedReplies = generateSuggestions(content, response.content, isRTL);

        // Build the finalized assistant message
        const finalAssistant: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: response.content,
          reasoningDetails: response.reasoningDetails,
          timestamp: new Date(),
          isStreaming: false,
          isReasoning: false,
          suggestedReplies,
          healthInsights: response.insights,
          tokensPerSecond: response.tokensPerSecond,
        };

        // Update state with finalized messages
        setState(prev => {
          const updatedMessages = prev.messages.map(m =>
            m.id === assistantId ? finalAssistant : m
          );

          // Isolated persistence — must not block or crash UI update
          persistMessages(updatedMessages);

          return {
            ...prev,
            isLoading: false,
            isStreaming: false,
            isReasoning: false,
            provider: response.provider,
            tokensPerSecond: response.tokensPerSecond ?? 0,
            messages: updatedMessages,
          };
        });

        onProviderChange?.(response.provider);
      } catch (err: any) {
        // Aborts are silent
        if (err?.name === 'AbortError' || err?.message?.includes('Aborted')) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            isStreaming: false,
            isReasoning: false,
            messages: prev.messages.map(m =>
              m.id === assistantId ? { ...m, isStreaming: false, content: '...' } : m
            ),
          }));
          return;
        }

        const errorMessage: string = err?.message ?? 'Failed to get response';

        console.error('[AI Chat] Generation failed:', {
          message: errorMessage,
          stack: err?.stack,
        });

        setState(prev => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          isReasoning: false,
          error: errorMessage,
          messages: prev.messages.map(m =>
            m.id === assistantId
              ? {
                  ...m,
                  isStreaming: false,
                  content: isRTL
                    ? 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.'
                    : 'Sorry, there was a connection error. Please try again.',
                }
              : m
          ),
        }));

        onError?.(errorMessage);
      }
    },
    [isRTL, onError, onProviderChange]
  );

  // ── Cancel ────────────────────────────────────────────────────────────────

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;

      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        isReasoning: false,
        messages: prev.messages.map(m =>
          m.isStreaming ? { ...m, isStreaming: false } : m
        ),
      }));
    }
  }, []);

  // ── Quick reply ───────────────────────────────────────────────────────────

  const selectSuggestion = useCallback(
    async (suggestion: string) => {
      await sendMessage(suggestion);
    },
    [sendMessage]
  );

  return {
    ...state,
    sendMessage,
    cancelRequest,
    clearMemory,
    selectSuggestion,
  };
}

// ── Suggestion generator ──────────────────────────────────────────────────────

function generateSuggestions(
  userMessage: string,
  _response: string,
  isRTL: boolean
): string[] {
  const lower = userMessage.toLowerCase();

  if (lower.includes('heart') || lower.includes('نبض') || lower.includes('pulse')) {
    return isRTL
      ? ['ما هو المعدل الطبيعي؟', 'كيف أقيس نبضي؟', 'متى أقلق؟']
      : ['What is normal rate?', 'How do I measure?', 'When to worry?'];
  }
  if (lower.includes('medication') || lower.includes('دواء') || lower.includes('medicine')) {
    return isRTL
      ? ['تذكير بالأدوية', 'الآثار الجانبية', 'هل يمكنني التوقف؟']
      : ['Remind me', 'Side effects?', 'Can I stop?'];
  }
  if (lower.includes('blood pressure') || lower.includes('ضغط')) {
    return isRTL
      ? ['ما هو الضغط الطبيعي؟', 'كيف أتحكم بالضغط؟', 'هل أحتاج دواء؟']
      : ['What is normal?', 'How to manage?', 'Do I need medicine?'];
  }
  if (lower.includes('sleep') || lower.includes('نوم')) {
    return isRTL
      ? ['نصائح للنوم', 'كم ساعة أنام؟', 'ما أسباب الأرق؟']
      : ['Sleep tips', 'Hours needed?', 'Causes of insomnia?'];
  }
  if (lower.includes('food') || lower.includes('طعام')) {
    return isRTL
      ? ['وجبات صحية', 'أطعمة يجب تجنبها', 'نصائح غذائية']
      : ['Healthy meals', 'Foods to avoid', 'Nutrition tips'];
  }
  if (lower.includes('fever') || lower.includes('حرارة') || lower.includes('حمى')) {
    return isRTL
      ? ['ماذا أفعل؟', 'متى أذهب للطبيب؟', 'كيف أخفض الحرارة؟']
      : ['What to do?', 'When to see doctor?', 'How to reduce fever?'];
  }

  return isRTL
    ? ['أخبرني أكثر', 'نصائح صحية', 'أدويتي؟']
    : ['Tell me more', 'Health tips', 'My medications?'];
}

export default useAICHat;