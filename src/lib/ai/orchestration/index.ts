/**
 * AI Orchestration Layer
 * Complete AI system with reasoning, streaming, memory, and health context
 */

export { aiManager, AIManager, type AIConfig, type AIResponse } from './AIManager';
export {
  createReasoningState,
  addUserMessage,
  addAssistantMessage,
  extractTopic,
  pruneForTokenBudget,
  buildOpenRouterMessages,
  getContextSummary,
  type ReasoningState,
  type ReasoningMessage,
} from './ReasoningEngine';
export {
  parseSSEChunk,
  parseSSEStream,
  withRetry,
  createTimeoutController,
  createStreamStats,
  updateStreamStats,
  type StreamChunk,
  type StreamingConfig,
  type StreamStats,
} from './StreamingEngine';
export {
  buildHealthContext,
  formatContextForPrompt,
  analyzeVitals,
  analyzeMedications,
  analyzeAlerts,
  analyzeFood,
  analyzeSleep,
  type HealthContextData,
  type HealthInsight,
  type VitalsReading,
  type MedicationInfo,
  type AlertInfo,
  type FoodLogEntry,
  type SleepRecord,
} from './HealthContextEngine';