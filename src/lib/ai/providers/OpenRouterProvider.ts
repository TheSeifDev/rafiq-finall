/**
 * OpenRouter Provider
 * Production-grade native provider with proper streaming
 */

import { AIProvider, AIMessage, HealthContext, StreamingCallback, AIProviderError } from "./types";
import { StreamProcessor, fetchWithRetry, type StreamConfig } from "../streaming";

const DEFAULT_MODEL = "openai/gpt-oss-120b:free";
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Stream config
const STREAM_CONFIG: StreamConfig = {
  throttleMs: 16,
  bufferSize: 5,
  timeoutMs: 60000,
  maxRetries: 3,
  retryDelayMs: 1000,
};

/**
 * Health state for provider
 */
interface ProviderHealth {
  isHealthy: boolean;
  lastError: string | null;
  consecutiveFailures: number;
}

/**
 * OpenRouter Provider - Production-grade without SDK
 */
class OpenRouterProvider implements AIProvider {
  name = "OpenRouter";
  id = "openrouter";

  private apiKey: string;
  private model: string;
  private streamProcessor: StreamProcessor;
  private health: ProviderHealth = {
    isHealthy: true,
    lastError: null,
    consecutiveFailures: 0,
  };

  constructor(apiKey?: string, model: string = DEFAULT_MODEL) {
    // Get and validate API key
    const rawKey = apiKey || process.env.OPENROUTER_API_KEY || "";
    this.apiKey = rawKey.trim().replace(/^["']|["']$/g, "");

    // Validate key format
    if (this.apiKey && !this.apiKey.startsWith("sk-or-v1-")) {
      console.warn("[OpenRouter] API key may be invalid (should start with sk-or-v1-)");
    }

    this.model = model;
    this.streamProcessor = new StreamProcessor(STREAM_CONFIG);
  }

  /**
   * Check provider availability
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    if (!this.apiKey.startsWith("sk-or-v1-")) return false;
    return this.health.isHealthy;
  }

  /**
   * Generate non-streaming response
   */
  async generate(
    messages: AIMessage[],
    context: HealthContext
  ): Promise<AIMessage> {
    const response = await this.makeRequest(messages, context, false);
    const data = await response.json();

    const content = data.choices?.[0]?.message?.content || "";
    return { role: "assistant", content };
  }

  /**
   * Generate streaming response
   */
  async generateStreaming(
    messages: AIMessage[],
    context: HealthContext,
    onChunk: StreamingCallback,
    signal?: AbortSignal
  ): Promise<string> {
    // Create local abort controller
    const localController = new AbortController();

    // Wire external signal
    if (signal) {
      signal.addEventListener("abort", () => {
        localController.abort();
      });
    }

    const response = await this.makeRequest(messages, context, true, localController.signal);

    // Process stream
    const result = await this.streamProcessor.process(response, {
      onChunk: (content, reasoning) => {
        // Emit content
        if (content) {
          onChunk(content);
        }
      },
      onDone: () => {
        this.markSuccess();
      },
      onError: (error) => {
        this.markFailure(error.message);
        throw error;
      },
    });

    return result.content;
  }

  /**
   * Make API request
   */
  private async makeRequest(
    messages: AIMessage[],
    context: HealthContext,
    stream: boolean,
    signal?: AbortSignal
  ): Promise<Response> {
    // Validate key
    if (!this.apiKey) {
      throw new AIProviderError("OpenRouter API key not configured", this.id, 401, false);
    }

    if (!this.apiKey.startsWith("sk-or-v1-")) {
      throw new AIProviderError("Invalid OpenRouter API key format", this.id, 401, false);
    }

    const systemPrompt = this.createSystemPrompt(context);
    const allMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map(m => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      })),
    ];

    try {
      const response = await fetchWithRetry(API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://rafiq-health.app",
          "X-Title": "RAFIQ Health Assistant",
        },
        body: JSON.stringify({
          model: this.model,
          messages: allMessages,
          max_tokens: 2000,
          temperature: 0.7,
          stream,
        }),
        timeout: STREAM_CONFIG.timeoutMs,
      }, STREAM_CONFIG);

      if (!response.ok) {
        const isRetryable = response.status === 429 || response.status >= 500;
        throw new AIProviderError(
          `OpenRouter error: ${response.status}`,
          this.id,
          response.status,
          isRetryable
        );
      }

      this.markSuccess();
      return response;
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }
      this.markFailure((error as Error).message);
      throw new AIProviderError(
        (error as Error).message || "Request failed",
        this.id,
        500,
        true
      );
    }
  }

  /**
   * Create healthcare system prompt
   */
  private createSystemPrompt(context: HealthContext): string {
    const vitals = context.latestVitals;
    const medList = context.medications
      .map(m => `- ${m.name}${m.dosage ? ` (${m.dosage})` : ''}${m.time ? ` at ${m.time}` : ''}`)
      .join('\n');

    const alertsText = context.recentAlerts.length > 0
      ? context.recentAlerts.map(a => `- ${a}`).join('\n')
      : '- No recent alerts';

    return `You are RAFIQ, a compassionate healthcare AI assistant for a medical monitoring app.

CONTEXT:
- Patient: ${context.patientName || 'User'}
- Last Updated: ${context.lastUpdated}

LATEST VITALS:
${vitals.heartRate ? `❤️ Heart Rate: ${vitals.heartRate} bpm` : '❤️ No heart rate data'}
${vitals.bloodPressureSys && vitals.bloodPressureDia ? `💗 Blood Pressure: ${vitals.bloodPressureSys}/${vitals.bloodPressureDia} mmHg` : '💗 No blood pressure data'}
${vitals.oxygenSaturation ? `🫁 SpO2: ${vitals.oxygenSaturation}%` : '🫁 No SpO2 data'}
${vitals.temperature ? `🌡️ Temperature: ${vitals.temperature}°C` : '🌡️ No temperature data'}

CURRENT MEDICATIONS:
${medList || '- No medications recorded'}

RECENT ALERTS:
${alertsText}

GUIDELINES:
1. Be empathetic, clear, and concise
2. Use medical terms accurately but explain them simply
3. Focus on actionable health advice
4. Never provide definitive diagnoses - always suggest consulting a doctor
5. For emergencies, direct users to emergency services immediately
6. Keep responses short and practical (2-4 sentences for quick answers)
7. Use markdown for formatting when helpful

Remember: You are a health assistant, not a doctor. Always encourage professional medical advice for serious concerns.`;
  }

  /**
   * Mark successful request
   */
  private markSuccess(): void {
    this.health.consecutiveFailures = 0;
    this.health.isHealthy = true;
    this.health.lastError = null;
  }

  /**
   * Mark failed request
   */
  private markFailure(error: string): void {
    this.health.consecutiveFailures++;
    this.health.lastError = error;

    // Mark unhealthy after 3 consecutive failures
    if (this.health.consecutiveFailures >= 3) {
      this.health.isHealthy = false;
    }
  }

  /**
   * Get health status
   */
  getHealth(): ProviderHealth {
    return { ...this.health };
  }

  /**
   * Reset health state
   */
  resetHealth(): void {
    this.health = {
      isHealthy: true,
      lastError: null,
      consecutiveFailures: 0,
    };
  }
}

// Export singleton
export const openRouterProvider = new OpenRouterProvider();
export { OpenRouterProvider };

export default openRouterProvider;