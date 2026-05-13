/**
 * Reasoning Engine
 * Handles reasoning persistence and continuity for OpenRouter models
 */

export interface ReasoningMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoningDetails?: string;
  timestamp: Date;
}

export interface ReasoningState {
  messages: ReasoningMessage[];
  reasoningHistory: string[];
  lastTopic: string | null;
  activeHealthConcern: string | null;
  maxTokens: number;
  maxReasoningTokens: number;
}

const DEFAULT_MAX_TOKENS = 32000;
const DEFAULT_MAX_REASONING_TOKENS = 8000;

/**
 * Create a new reasoning state
 */
export function createReasoningState(): ReasoningState {
  return {
    messages: [],
    reasoningHistory: [],
    lastTopic: null,
    activeHealthConcern: null,
    maxTokens: DEFAULT_MAX_TOKENS,
    maxReasoningTokens: DEFAULT_MAX_REASONING_TOKENS,
  };
}

/**
 * Calculate token count (approximate)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Add user message to reasoning state
 */
export function addUserMessage(
  state: ReasoningState,
  content: string,
  topic?: string
): ReasoningState {
  const message: ReasoningMessage = {
    id: Date.now().toString() + '_user',
    role: 'user',
    content,
    timestamp: new Date(),
  };

  return {
    ...state,
    messages: [...state.messages, message],
    lastTopic: topic || state.lastTopic,
  };
}

/**
 * Add assistant message with reasoning to state
 */
export function addAssistantMessage(
  state: ReasoningState,
  content: string,
  reasoningDetails?: string
): ReasoningState {
  const message: ReasoningMessage = {
    id: Date.now().toString() + '_assistant',
    role: 'assistant',
    content,
    reasoningDetails,
    timestamp: new Date(),
  };

  const newReasoningHistory = reasoningDetails
    ? [...state.reasoningHistory, reasoningDetails].slice(-5)
    : state.reasoningHistory;

  return {
    ...state,
    messages: [...state.messages, message],
    reasoningHistory: newReasoningHistory,
  };
}

/**
 * Extract topic from user message
 */
export function extractTopic(message: string): string | null {
  const topics = [
    'heart', 'heart rate', 'pulse', 'نبض',
    'blood pressure', 'pressure', 'ضغط',
    'medication', 'medicine', 'دواء', 'دواء',
    'sleep', 'نوم', 'sleeping',
    'food', 'meal', 'طعام', 'أكل',
    'exercise', 'workout', 'رياضة',
    'temperature', 'fever', 'حرارة', 'حمى',
    'oxygen', 'spo2', 'أكسجين',
    'sugar', 'glucose', 'سكر',
    'weight', 'weight', 'وزن',
    'symptom', 'أعراض',
    'emergency', 'طوارئ',
  ];

  const lowerMessage = message.toLowerCase();
  for (const topic of topics) {
    if (lowerMessage.includes(topic)) {
      return topic;
    }
  }
  return null;
}

/**
 * Prune messages to stay within token budget
 */
export function pruneForTokenBudget(
  state: ReasoningState,
  maxTotalTokens: number = 28000
): ReasoningState {
  let totalTokens = 0;
  const prunedMessages: ReasoningMessage[] = [];

  // Work backwards from most recent
  for (let i = state.messages.length - 1; i >= 0; i--) {
    const msg = state.messages[i];
    const msgTokens = estimateTokens(msg.content) + (msg.reasoningDetails ? estimateTokens(msg.reasoningDetails) : 0);

    if (totalTokens + msgTokens > maxTotalTokens) {
      break;
    }

    prunedMessages.unshift(msg);
    totalTokens += msgTokens;
  }

  // Keep at least last 6 messages
  if (prunedMessages.length < 6 && state.messages.length >= 6) {
    const lastSix = state.messages.slice(-6);
    return {
      ...state,
      messages: lastSix,
    };
  }

  return {
    ...state,
    messages: prunedMessages,
  };
}

/**
 * Build OpenRouter messages with reasoning
 */
export function buildOpenRouterMessages(state: ReasoningState): any[] {
  const messages: any[] = [];

  for (const msg of state.messages) {
    if (msg.role === 'assistant' && msg.reasoningDetails) {
      // Include reasoning in assistant message
      messages.push({
        role: 'assistant',
        content: msg.content,
        reasoning: msg.reasoningDetails,
      });
    } else {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  return messages;
}

/**
 * Get context summary for healthcare
 */
export function getContextSummary(
  vitals: any,
  medications: any[],
  recentAlerts: string[]
): string {
  const parts: string[] = [];

  if (vitals) {
    if (vitals.heartRate) parts.push(`❤️ HR: ${vitals.heartRate} bpm`);
    if (vitals.bloodPressureSys && vitals.bloodPressureDia) {
      parts.push(`💗 BP: ${vitals.bloodPressureSys}/${vitals.bloodPressureDia}`);
    }
    if (vitals.oxygenSaturation) parts.push(`🫁 SpO2: ${vitals.oxygenSaturation}%`);
    if (vitals.temperature) parts.push(`🌡️ Temp: ${vitals.temperature}°C`);
  }

  if (medications.length > 0) {
    parts.push(`💊 ${medications.length} meds`);
  }

  if (recentAlerts.length > 0) {
    parts.push(`⚠️ ${recentAlerts.length} alerts`);
  }

  return parts.join(' | ');
}

export default {
  createReasoningState,
  addUserMessage,
  addAssistantMessage,
  extractTopic,
  pruneForTokenBudget,
  buildOpenRouterMessages,
  getContextSummary,
  estimateTokens,
};