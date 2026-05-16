/**
 * AI Manager — Core orchestration with reasoning persistence.
 *
 * STREAMING REMOVED: Expo SDK 54 React Native fetch does NOT support
 * response.body / ReadableStream / getReader(). All requests are made
 * non-streaming (stream: false) and parsed with response.text() → JSON.
 *
 * Architecture:
 *  - Single non-streaming request path
 *  - Provider fallback via providerManager
 *  - Reasoning state persistence in memory + AsyncStorage
 *  - Isolated persistence: generation success never crashes on save failure
 */

import { providerManager } from '../providers/manager';
import { AIProvider } from '../providers/types';
import { env } from '../../../config/env';
import {
  createReasoningState,
  addUserMessage,
  addAssistantMessage,
  extractTopic,
  pruneForTokenBudget,
  buildOpenRouterMessages,
  getContextSummary,
  type ReasoningState,
} from './ReasoningEngine';
import {
  parseJSONResponse,
  withRetry,
  createTimeoutController,
  type StreamChunk,
  type StreamingConfig,
} from './StreamingEngine';
import {
  buildHealthContext,
  formatContextForPrompt,
  type HealthContextData,
  type HealthInsight,
} from './HealthContextEngine';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AIResponse {
  content: string;
  reasoningDetails?: string;
  provider: string;
  model: string;
  finishReason: string;
  insights?: HealthInsight[];
  tokensPerSecond?: number;
}

export interface AIConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  reasoningEnabled: boolean;
  /** @deprecated Streaming is not supported on Expo SDK 54 React Native. Always false. */
  streamingEnabled: boolean;
  fallbackEnabled: boolean;
  maxRetries: number;
  timeoutMs: number;
}

// ── Default configuration ─────────────────────────────────────────────────────

const DEFAULT_CONFIG: AIConfig = {
  model: 'openai/gpt-oss-120b:free',
  maxTokens: 2000,
  temperature: 0.7,
  reasoningEnabled: true,
  streamingEnabled: false, // Must remain false — RN fetch has no ReadableStream
  fallbackEnabled: true,
  maxRetries: 3,
  timeoutMs: 60000,
};

// ── Streaming config (kept for interface compatibility only) ──────────────────

const STREAMING_CONFIG: StreamingConfig = {
  throttleMs: 16,
  bufferSize: 3,
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 60000,
};

// ── AIManager ─────────────────────────────────────────────────────────────────

class AIManager {
  private config: AIConfig;
  private reasoningState: ReasoningState;
  private healthContext: HealthContextData | null = null;
  private isInitialized = false;

  constructor(config: Partial<AIConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      streamingEnabled: false, // Always false — enforce no streaming
    };
    this.reasoningState = createReasoningState();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  initialize(healthContext: HealthContextData): void {
    this.healthContext = healthContext;
    this.isInitialized = true;
  }

  updateHealthContext(context: HealthContextData): void {
    this.healthContext = context;
  }

  getReasoningState(): ReasoningState {
    return this.reasoningState;
  }

  loadReasoningState(state: ReasoningState): void {
    this.reasoningState = state;
  }

  clearMemory(): void {
    this.reasoningState = createReasoningState();
  }

  /**
   * Generate an AI response.
   *
   * The `onChunk` callback is accepted for interface compatibility but is
   * called only once at completion — there is no token-by-token streaming
   * because React Native's fetch runtime does not support ReadableStream.
   *
   * Persistence failures are isolated: if the AI response is generated
   * successfully, the hook receives it regardless of any save errors.
   */
  async generate(
    userMessage: string,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<AIResponse> {
    if (!this.isInitialized || !this.healthContext) {
      throw new Error('[AI Manager] Not initialized. Call initialize() with health context first.');
    }

    // Build context
    const topic = extractTopic(userMessage);
    this.reasoningState = pruneForTokenBudget(this.reasoningState);
    const { insights } = buildHealthContext(this.healthContext);
    const systemPrompt = formatContextForPrompt(this.healthContext, insights);

    // Record user message in reasoning state
    this.reasoningState = addUserMessage(this.reasoningState, userMessage, topic ?? undefined);

    const messages = this.buildMessagesWithContext(systemPrompt);

    // ── Generation ────────────────────────────────────────────────────────────
    let aiResponse: AIResponse;

    try {
      aiResponse = await this.generateNonStreaming(messages, insights);
    } catch (generationError: any) {
      const errMsg: string = generationError?.message ?? String(generationError);
      const errStack: string = generationError?.stack ?? '';

      console.error('[AI Manager] Generation error:', {
        message: errMsg,
        stack: errStack,
        provider: this.getProvider().name,
        model: this.config.model,
      });

      // Try fallback provider
      if (this.config.fallbackEnabled) {
        console.log('[AI Manager] Attempting fallback provider after primary failure');
        try {
          aiResponse = await this.generateWithFallback(userMessage, insights);
        } catch (fallbackError: any) {
          console.error('[AI Manager] Fallback also failed:', {
            message: fallbackError?.message ?? String(fallbackError),
          });
          throw generationError; // Re-throw original for caller context
        }
      } else {
        throw generationError;
      }
    }

    // ── Emit single "done" chunk for UI compatibility ─────────────────────────
    if (onChunk && aiResponse.content) {
      try {
        onChunk({ type: 'content', content: aiResponse.content, done: true });
      } catch (chunkErr) {
        console.warn('[AI Manager] onChunk callback threw:', (chunkErr as Error).message);
      }
    }

    return aiResponse;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Non-streaming request — the only supported path on Expo SDK 54.
   */
  private async generateNonStreaming(
    messages: any[],
    insights: HealthInsight[]
  ): Promise<AIResponse> {
    const provider = this.getProvider();
    const startTime = Date.now();

    const response = await this.makeRequest(provider, messages);

    // Safe parsing — never throws "No response body"
    const { content, reasoning: reasoningDetails, finishReason } = await parseJSONResponse(response);

    if (!content && !reasoningDetails) {
      console.warn('[AI Manager] Provider returned empty content', {
        provider: provider.name,
        model: provider.id,
        finishReason,
      });
    }

    // Persist to reasoning state
    this.reasoningState = addAssistantMessage(
      this.reasoningState,
      content,
      reasoningDetails
    );

    const durationSec = (Date.now() - startTime) / 1000;
    const tokensPerSecond =
      durationSec > 0 ? Math.round((content.length / 4) / durationSec) : 0;

    return {
      content,
      reasoningDetails,
      provider: provider.name,
      model: provider.id,
      finishReason,
      insights,
      tokensPerSecond,
    };
  }

  /**
   * Fallback via providerManager (also non-streaming).
   */
  private async generateWithFallback(
    userMessage: string,
    insights: HealthInsight[]
  ): Promise<AIResponse> {
    const result = await providerManager.generate(
      this.reasoningState.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      {
        patientName: this.healthContext?.patientName || 'User',
        latestVitals: this.healthContext?.latestVitals || {},
        medications: this.healthContext?.medications || [],
        recentAlerts: this.healthContext?.recentAlerts?.map(a => a.message) || [],
        lastUpdated: this.healthContext?.lastUpdated || new Date().toISOString(),
      }
    );

    this.reasoningState = addAssistantMessage(
      this.reasoningState,
      result.content
    );

    return {
      content: result.content,
      provider: result.provider,
      model: result.model,
      finishReason: result.finishReason,
      insights,
    };
  }

  /**
   * Build messages array including system prompt and reasoning history.
   */
  private buildMessagesWithContext(systemPrompt: string): any[] {
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (this.reasoningState.reasoningHistory.length > 0) {
      const recentReasoning = this.reasoningState.reasoningHistory.slice(-2).join('\n\n');
      messages.push({
        role: 'system',
        content: `Recent AI reasoning:\n${recentReasoning}`,
      });
    }

    for (const msg of this.reasoningState.messages) {
      if (msg.role === 'assistant' && msg.reasoningDetails) {
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

  private getProvider(): AIProvider {
    return providerManager.getProvider();
  }

  /**
   * Make a non-streaming POST request to the AI provider.
   * stream is always false — React Native fetch does not support ReadableStream.
   */
  private async makeRequest(
    provider: AIProvider,
    messages: any[]
  ): Promise<Response> {
    const url = this.getApiUrl(provider.id);
    const headers = this.getHeaders(provider.id);

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      stream: false, // Always false — RN fetch has no ReadableStream
    };

    if (this.config.reasoningEnabled) {
      body.reasoning = { effort: 'high' };
    }

    const controller = createTimeoutController(this.config.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      throw new Error(
        `[AI Manager] Network request failed: ${fetchError?.message ?? String(fetchError)}`
      );
    }

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        errorBody = '(could not read error body)';
      }
      throw new Error(
        `[AI Manager] API error ${response.status}: ${errorBody.slice(0, 400)}`
      );
    }

    return response;
  }

  private getApiUrl(_modelId: string): string {
    return 'https://openrouter.ai/api/v1/chat/completions';
  }

  private getHeaders(_modelId: string): HeadersInit {
    return {
      Authorization: `Bearer ${env.openRouterApiKey || ''}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://rafiq-health.app',
      'X-Title': 'RAFIQ Health Assistant',
    };
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const aiManager = new AIManager();
export { AIManager };
export default aiManager;