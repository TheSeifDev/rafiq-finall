/**
 * AI Manager - Core orchestration with reasoning persistence
 * Implements provider fallback, streaming, memory, and health context
 */

import { providerManager } from '../providers/manager';
import { AIProvider } from '../providers/types';
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
  parseSSEStream,
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

// Response type
export interface AIResponse {
  content: string;
  reasoningDetails?: string;
  provider: string;
  model: string;
  finishReason: string;
  insights?: HealthInsight[];
  tokensPerSecond?: number;
}

// Configuration
export interface AIConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  reasoningEnabled: boolean;
  streamingEnabled: boolean;
  fallbackEnabled: boolean;
  maxRetries: number;
  timeoutMs: number;
}

// Default config for OpenRouter with reasoning
const DEFAULT_CONFIG: AIConfig = {
  model: 'openai/gpt-oss-120b:free',
  maxTokens: 2000,
  temperature: 0.7,
  reasoningEnabled: true,
  streamingEnabled: true,
  fallbackEnabled: true,
  maxRetries: 3,
  timeoutMs: 60000,
};

// Streaming config
const STREAMING_CONFIG: StreamingConfig = {
  throttleMs: 16,
  bufferSize: 3,
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 60000,
};

/**
 * AI Manager Class
 */
class AIManager {
  private config: AIConfig;
  private reasoningState: ReasoningState;
  private healthContext: HealthContextData | null = null;
  private isInitialized = false;

  constructor(config: Partial<AIConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.reasoningState = createReasoningState();
  }

  /**
   * Initialize with health context
   */
  initialize(healthContext: HealthContextData) {
    this.healthContext = healthContext;
    this.isInitialized = true;
  }

  /**
   * Update health context
   */
  updateHealthContext(context: HealthContextData) {
    this.healthContext = context;
  }

  /**
   * Get current reasoning state
   */
  getReasoningState(): ReasoningState {
    return this.reasoningState;
  }

  /**
   * Load saved reasoning state
   */
  loadReasoningState(state: ReasoningState) {
    this.reasoningState = state;
  }

  /**
   * Clear conversation memory
   */
  clearMemory() {
    this.reasoningState = createReasoningState();
  }

  /**
   * Generate response with reasoning persistence
   */
  async generate(
    userMessage: string,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<AIResponse> {
    if (!this.isInitialized || !this.healthContext) {
      throw new Error('AI Manager not initialized with health context');
    }

    // Extract topic from message
    const topic = extractTopic(userMessage);

    // Prune messages for token budget
    this.reasoningState = pruneForTokenBudget(this.reasoningState);

    // Build health context and insights
    const { insights } = buildHealthContext(this.healthContext);

    // Format system prompt with health context
    const systemPrompt = formatContextForPrompt(this.healthContext, insights);

    // Add user message to state
    this.reasoningState = addUserMessage(this.reasoningState, userMessage, topic ?? undefined);

    // Build messages for API
    const messages = this.buildMessagesWithContext(systemPrompt);

    try {
      // Generate with streaming or non-streaming
      if (this.config.streamingEnabled && onChunk) {
        return await this.generateStreaming(messages, onChunk, insights);
      } else {
        return await this.generateNonStreaming(messages, insights);
      }
    } catch (error) {
      console.error('[AI Manager] Generation error:', error);

      // Try fallback provider
      if (this.config.fallbackEnabled) {
        console.log('[AI Manager] Trying fallback provider');
        return await this.generateWithFallback(userMessage, insights);
      }

      throw error;
    }
  }

  /**
   * Generate with streaming
   */
  private async generateStreaming(
    messages: any[],
    onChunk: (chunk: StreamChunk) => void,
    insights: HealthInsight[]
  ): Promise<AIResponse> {
    const provider = this.getProvider();
    let fullContent = '';
    let fullReasoning = '';
    const startTime = Date.now();

    const response = await this.makeRequest(provider, messages, true);

    const content = await parseSSEStream(
      response,
      (chunk) => {
        if (chunk.type === 'content') {
          fullContent = chunk.content;
        }
        if (chunk.type === 'reasoning') {
          fullReasoning = chunk.reasoning || '';
        }
        onChunk(chunk);
      },
      STREAMING_CONFIG
    );

    // Add assistant message with reasoning to state
    this.reasoningState = addAssistantMessage(
      this.reasoningState,
      content,
      fullReasoning || undefined
    );

    const duration = (Date.now() - startTime) / 1000;
    const tokensPerSecond = Math.round(content.length / 4 / duration);

    return {
      content,
      reasoningDetails: fullReasoning || undefined,
      provider: provider.name,
      model: provider.id,
      finishReason: 'stop',
      insights,
      tokensPerSecond,
    };
  }

  /**
   * Generate without streaming
   */
  private async generateNonStreaming(
    messages: any[],
    insights: HealthInsight[]
  ): Promise<AIResponse> {
    const provider = this.getProvider();

    const response = await this.makeRequest(provider, messages, false);
    const data = await response.json();

    const content = data.choices?.[0]?.message?.content || '';
    const reasoningDetails = data.choices?.[0]?.message?.reasoning;

    // Add to reasoning state
    this.reasoningState = addAssistantMessage(
      this.reasoningState,
      content,
      reasoningDetails
    );

    return {
      content,
      reasoningDetails,
      provider: provider.name,
      model: provider.id,
      finishReason: data.choices?.[0]?.finish_reason || 'stop',
      insights,
    };
  }

  /**
   * Generate with fallback provider
   */
  private async generateWithFallback(
    userMessage: string,
    insights: HealthInsight[]
  ): Promise<AIResponse> {
    // Use the fallback provider from manager
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

    // Add to reasoning state
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
   * Build messages with health context
   */
  private buildMessagesWithContext(systemPrompt: string): any[] {
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add reasoning history for context
    if (this.reasoningState.reasoningHistory.length > 0) {
      const recentReasoning = this.reasoningState.reasoningHistory.slice(-2).join('\n\n');
      messages.push({
        role: 'system',
        content: `Recent AI reasoning:\n${recentReasoning}`,
      });
    }

    // Add conversation messages
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

  /**
   * Get current provider
   */
  private getProvider(): AIProvider {
    return providerManager.getProvider();
  }

  /**
   * Make API request
   */
  private async makeRequest(
    provider: AIProvider,
    messages: any[],
    stream: boolean
  ): Promise<Response> {
    const url = this.getApiUrl(provider.id);
    const headers = this.getHeaders(provider.id);

    const body: any = {
      model: this.config.model,
      messages,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
    };

    // Enable reasoning
    if (this.config.reasoningEnabled) {
      body.reasoning = {
        effort: 'high',
      };
    }

    if (stream) {
      body.stream = true;
    }

    const controller = createTimeoutController(this.config.timeoutMs);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    return response;
  }

  /**
   * Get API URL based on model
   */
  private getApiUrl(modelId: string): string {
    // OpenRouter
    if (modelId.includes('openrouter') || modelId.includes('gpt-oss')) {
      return 'https://openrouter.ai/api/v1/chat/completions';
    }

    // Default to OpenRouter
    return 'https://openrouter.ai/api/v1/chat/completions';
  }

  /**
   * Get API headers
   */
  private getHeaders(modelId: string): HeadersInit {
    const apiKey = this.getApiKey(modelId);

    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://rafiq-health.app',
      'X-Title': 'RAFIQ Health Assistant',
    };
  }

  /**
   * Get API key
   */
  private getApiKey(modelId: string): string {
    // Check environment variables
    if (modelId.includes('openrouter') || modelId.includes('gpt-oss')) {
      return process.env.EXPO_PUBLIC_OPENROUTER_KEY || '';
    }

    return process.env.EXPO_PUBLIC_OPENROUTER_KEY || '';
  }
}

// Export singleton instance
export const aiManager = new AIManager();

export { AIManager };

export default aiManager;