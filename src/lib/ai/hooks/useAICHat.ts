/**
 * AI Chat Hook
 * Modern healthcare AI with reasoning persistence, streaming, and memory
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aiManager, type AIResponse, type HealthContextData, type StreamChunk } from '../orchestration';

const STORAGE_KEY = '@rafiq_ai_state';
const REASONING_KEY = '@rafiq_reasoning_state';

// Message types
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

// UI State
export interface AIChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  isReasoning: boolean;
  error: string | null;
  provider: string;
  tokensPerSecond: number;
}

// Options
interface UseAICHatOptions {
  healthContext: HealthContextData;
  isRTL?: boolean;
  onError?: (error: string) => void;
  onProviderChange?: (provider: string) => void;
}

export function useAICHat({ healthContext, isRTL = false, onError, onProviderChange }: UseAICHatOptions) {
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
  const streamBufferRef = useRef<string>('');
  const reasoningBufferRef = useRef<string>('');

  // Initialize AI manager with health context
  useEffect(() => {
    aiManager.initialize(healthContext);
  }, [healthContext]);

  // Load persisted state
  useEffect(() => {
    loadPersistedState();
  }, []);

  const loadPersistedState = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const messages = data.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setState(prev => ({ ...prev, messages }));
      }
    } catch (err) {
      console.log('[AI Chat] Failed to load state:', err);
    }
  };

  // Save state
  const saveState = async (messages: ChatMessage[]) => {
    try {
      const toSave = messages.slice(-50).map(m => ({
        ...m,
        timestamp: m.timestamp.toISOString(),
      }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: toSave }));
    } catch (err) {
      console.log('[AI Chat] Failed to save state:', err);
    }
  };

  // Clear all memory
  const clearMemory = useCallback(async () => {
    aiManager.clearMemory();
    setState(prev => ({
      ...prev,
      messages: [],
      provider: 'none',
      tokensPerSecond: 0,
    }));
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  // Send message with streaming
  const sendMessage = useCallback(async (content: string) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString() + '_user',
      role: 'user',
      content,
      timestamp: new Date(),
    };

    // Add user message
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      isStreaming: true,
      isReasoning: true,
      error: null,
    }));

    // Create placeholder for AI response
    const assistantMessage: ChatMessage = {
      id: Date.now().toString() + '_assistant',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, assistantMessage],
    }));

    streamBufferRef.current = '';
    reasoningBufferRef.current = '';

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      const response = await aiManager.generate(
        content,
        (chunk: StreamChunk) => {
          if (chunk.type === 'reasoning' && chunk.reasoning) {
            reasoningBufferRef.current = chunk.reasoning;
            setState(prev => ({
              ...prev,
              isReasoning: true,
              messages: prev.messages.map(m =>
                m.id === assistantMessage.id
                  ? { ...m, isReasoning: true, reasoningDetails: reasoningBufferRef.current }
                  : m
              ),
            }));
          }

          if (chunk.type === 'content') {
            streamBufferRef.current = chunk.content;
            setState(prev => ({
              ...prev,
              isReasoning: false,
              isStreaming: !chunk.done,
              messages: prev.messages.map(m =>
                m.id === assistantMessage.id
                  ? { ...m, content: streamBufferRef.current }
                  : m
              ),
            }));
          }
        }
      );

      // Finalize message
      const suggestedReplies = generateSuggestions(content, response.content, isRTL);
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        isReasoning: false,
        provider: response.provider,
        tokensPerSecond: response.tokensPerSecond || 0,
        messages: prev.messages.map(m =>
          m.id === assistantMessage.id
            ? {
                ...m,
                isStreaming: false,
                content: response.content,
                reasoningDetails: response.reasoningDetails,
                suggestedReplies,
                healthInsights: response.insights,
                tokensPerSecond: response.tokensPerSecond,
              }
            : m
        ),
      }));

      // Notify provider change
      onProviderChange?.(response.provider);

      // Save state
      const newMessages = [...state.messages, userMessage, {
        ...assistantMessage,
        isStreaming: false,
        content: response.content,
        reasoningDetails: response.reasoningDetails,
        suggestedReplies,
        healthInsights: response.insights,
      }];
      saveState(newMessages);

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          isReasoning: false,
        }));
        return;
      }

      const errorMessage = err.message || 'Failed to get response';
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        isReasoning: false,
        error: errorMessage,
      }));
      onError?.(errorMessage);

      // Show error message
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(m =>
          m.id === assistantMessage.id
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
    }
  }, [state.messages, isRTL, onError, onProviderChange]);

  // Cancel ongoing request
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

  // Quick reply selection
  const selectSuggestion = useCallback(async (suggestion: string) => {
    await sendMessage(suggestion);
  }, [sendMessage]);

  return {
    ...state,
    sendMessage,
    cancelRequest,
    clearMemory,
    selectSuggestion,
  };
}

/**
 * Generate contextual suggestions
 */
function generateSuggestions(userMessage: string, response: string, isRTL: boolean): string[] {
  const lower = userMessage.toLowerCase();
  const suggestions: string[] = [];

  if (lower.includes('heart') || lower.includes('نبض') || lower.includes('pulse')) {
    suggestions.push(
      isRTL ? 'ما هو المعدل الطبيعي؟' : 'What is normal rate?',
      isRTL ? 'كيف أقيس نبضي؟' : 'How do I measure?'
    );
  } else if (lower.includes('medication') || lower.includes('دواء') || lower.includes('medicine')) {
    suggestions.push(
      isRTL ? 'تذكير بالأدوية' : 'Remind me',
      isRTL ? 'الآثار الجانبية' : 'Side effects?'
    );
  } else if (lower.includes('blood pressure') || lower.includes('ضغط')) {
    suggestions.push(
      isRTL ? 'ما هو الضغط الطبيعي؟' : 'What is normal?',
      isRTL ? 'كيف أتحكم بالضغط؟' : 'How to manage?'
    );
  } else if (lower.includes('sleep') || lower.includes('نوم')) {
    suggestions.push(
      isRTL ? 'نصائح للنوم' : 'Sleep tips',
      isRTL ? 'كم ساعة أنام؟' : 'Hours needed?'
    );
  } else if (lower.includes('food') || lower.includes('طعام')) {
    suggestions.push(
      isRTL ? 'وجبات صحية' : 'Healthy meals',
      isRTL ? 'أطعمه避免' : 'Foods to avoid'
    );
  } else if (lower.includes('fever') || lower.includes('حرارة') || lower.includes('حمى')) {
    suggestions.push(
      isRTL ? 'ماذا أفعل؟' : 'What to do?',
      isRTL ? 'متى أذهب للطبيب؟' : 'When to see doctor?'
    );
  } else {
    if (isRTL) {
      suggestions.push('أخبرني أكثر', 'نصائح صحية', 'أدويتي؟');
    } else {
      suggestions.push('Tell me more', 'Health tips', 'My medications?');
    }
  }

  return suggestions.slice(0, 3);
}

export default useAICHat;