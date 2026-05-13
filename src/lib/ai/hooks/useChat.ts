/**
 * Chat Hook
 * Manages chat state, persistence, and AI interactions
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { providerManager } from '../providers/manager';
import { AIMessage, HealthContext } from '../providers/types';

const STORAGE_KEY = '@rafiq_chat_history';
const MAX_MESSAGES = 50;

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  suggestedReplies?: string[];
}

interface UseChatOptions {
  healthContext: HealthContext;
  isRTL?: boolean;
  onError?: (error: string) => void;
}

export function useChat({ healthContext, isRTL = false, onError }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingContentRef = useRef('');

  // Load persisted messages on mount
  useEffect(() => {
    loadMessages();
  }, []);

  // Persist messages on change
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const restored = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(restored);
      }
    } catch (err) {
      console.log('[Chat] Failed to load messages:', err);
    }
  };

  const saveMessages = async (msgs: ChatMessage[]) => {
    try {
      const toSave = msgs.slice(-MAX_MESSAGES).map(m => ({
        ...m,
        timestamp: m.timestamp.toISOString(),
      }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (err) {
      console.log('[Chat] Failed to save messages:', err);
    }
  };

  const clearHistory = useCallback(async () => {
    setMessages([]);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.log('[Chat] Failed to clear history:', err);
    }
  }, []);

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

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Create placeholder for streaming response
    const assistantMessage: ChatMessage = {
      id: Date.now().toString() + '_assistant',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, assistantMessage]);
    streamingContentRef.current = '';

    // Prepare messages for AI
    const aiMessages: AIMessage[] = messages
      .filter(m => !m.isStreaming)
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    abortControllerRef.current = new AbortController();

    try {
      const response = await providerManager.generateStreaming(
        aiMessages,
        healthContext,
        (chunk) => {
          streamingContentRef.current += chunk;
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMessage.id
                ? { ...m, content: streamingContentRef.current }
                : m
            )
          );
        },
        abortControllerRef.current.signal
      );

      // Update final message with suggested replies
      const suggestedReplies = generateSuggestedReplies(content, response.content, isRTL);

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessage.id
            ? {
                ...m,
                isStreaming: false,
                suggestedReplies,
                content: response.content,
              }
            : m
        )
      );

      console.log('[Chat] Response from:', response.provider, response.model);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // User cancelled
      }

      const errorMessage = err.message || 'Failed to get response';
      setError(errorMessage);
      onError?.(errorMessage);

      // Update message with error
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessage.id
            ? {
                ...m,
                isStreaming: false,
                content: isRTL
                  ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
                  : 'Sorry, something went wrong. Please try again.',
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, healthContext, isRTL, onError]);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;

      // Mark streaming as complete
      setMessages(prev =>
        prev.map(m =>
          m.isStreaming ? { ...m, isStreaming: false } : m
        )
      );
      setIsLoading(false);
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    cancelRequest,
    clearHistory,
  };
}

/**
 * Generate contextual suggested replies based on conversation
 */
function generateSuggestedReplies(
  userMessage: string,
  response: string,
  isRTL: boolean
): string[] {
  const lowerUser = userMessage.toLowerCase();
  const lowerResponse = response.toLowerCase();

  const suggestions: string[] = [];

  // Context-based suggestions
  if (lowerUser.includes('heart') || lowerUser.includes('نبض') || lowerUser.includes('heart rate')) {
    suggestions.push(
      isRTL ? 'ما هو المعدل الطبيعي للنبض؟' : 'What is a normal heart rate?',
      isRTL ? 'كيف أخفض معدل نبضاتي؟' : 'How can I lower my heart rate?'
    );
  } else if (lowerUser.includes('medication') || lowerUser.includes('دواء')) {
    suggestions.push(
      isRTL ? 'Remind me to take my meds' : 'Remind me to take my meds',
      isRTL ? 'ما هي آثار جانبية؟' : 'What are the side effects?'
    );
  } else if (lowerUser.includes('blood pressure') || lowerUser.includes('ضغط')) {
    suggestions.push(
      isRTL ? 'ما هو الضغط الطبيعي؟' : 'What is normal blood pressure?',
      isRTL ? 'كيف أتحكم بضغط الدم؟' : 'How to manage blood pressure?'
    );
  } else if (lowerUser.includes('sleep') || lowerUser.includes('نوم')) {
    suggestions.push(
      isRTL ? 'نصائح للنوم أفضل' : 'Tips for better sleep',
      isRTL ? 'كم ساعة أنام؟' : 'How many hours should I sleep?'
    );
  } else if (lowerUser.includes('food') || lowerUser.includes('طعام')) {
    suggestions.push(
      isRTL ? 'وجبات صحية' : 'Healthy meal plans',
      isRTL ? 'ما Foods to avoid' : 'Foods to avoid'
    );
  } else if (lowerUser.includes('exercise') || lowerUser.includes('رياضة')) {
    suggestions.push(
      isRTL ? 'تمارين مناسبة' : 'Suitable exercises',
      isRTL ? 'كم مرة أسبوعياً؟' : 'How often per week?'
    );
  } else {
    // Default suggestions
    if (isRTL) {
      suggestions.push(
        'Explain more',
        'Give me health tips',
        'What about my medications?',
        'Help me track vitals'
      );
    } else {
      suggestions.push(
        'Tell me more',
        'Give me health tips',
        'What about my medications?',
        'Help me track vitals'
      );
    }
  }

  return suggestions.slice(0, 3);
}

export default useChat;