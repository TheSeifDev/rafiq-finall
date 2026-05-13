/**
 * AI Provider Manager
 * Uses official OpenRouter SDK with proper fallback
 */

import { AIProvider, AIMessage, HealthContext, StreamingCallback, AIResponse, AIProviderError } from "./types";
import { openRouterProvider } from "./OpenRouterProvider";

const MAX_RETRIES = 2;

/**
 * Simple Fallback - Only shows outage message, no fake responses
 */
class MinimalFallbackProvider implements AIProvider {
  name = "Unavailable";
  id = "fallback";

  async isAvailable(): Promise<boolean> {
    return true; // Always available as last resort
  }

  async generate(_messages: AIMessage[], _context: HealthContext): Promise<AIMessage> {
    // No fake responses - just explain the outage
    throw new AIProviderError(
      "AI service temporarily unavailable. Please try again.",
      this.id,
      503,
      true // Retryable - user might try again and API works
    );
  }

  async generateStreaming(
    _messages: AIMessage[],
    _context: HealthContext,
    onChunk: StreamingCallback,
    _signal?: AbortSignal
  ): Promise<string> {
    // Single message explaining the outage
    const message = "AI service temporarily unavailable. Please try again.";
    onChunk(message);
    return message;
  }
}

/**
 * Provider Manager - Single primary provider with minimal fallback
 */
class ProviderManager {
  private primary: AIProvider;
  private fallback: MinimalFallbackProvider;

  constructor() {
    // Use official SDK provider as primary
    this.primary = openRouterProvider;
    this.fallback = new MinimalFallbackProvider();
  }

  getProvider(): AIProvider {
    return this.primary;
  }

  /**
   * Generate response (non-streaming)
   */
  async generate(
    messages: AIMessage[],
    context: HealthContext,
    retries: number = MAX_RETRIES
  ): Promise<AIResponse> {
    let lastError: Error | null = null;

    // Try primary provider
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const isAvailable = await this.primary.isAvailable();
        if (!isAvailable) {
          throw new AIProviderError("Provider not available", this.primary.id, 503, true);
        }

        const response = await this.primary.generate(messages, context);

        return {
          content: response.content,
          provider: this.primary.name,
          model: this.primary.id,
          finishReason: "stop",
        };
      } catch (error) {
        lastError = error as Error;

        // Check if retryable
        if (error instanceof AIProviderError && !error.isRetryable) {
          break;
        }

        console.log(`[Provider] Attempt ${attempt + 1} failed:`, (error as Error).message);

        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    // Try minimal fallback
    try {
      const response = await this.fallback.generate(messages, context);
      return {
        content: response.content,
        provider: this.fallback.name,
        model: this.fallback.id,
        finishReason: "stop",
      };
    } catch {
      // Fallback also failed, return error message
      return {
        content: "AI service temporarily unavailable. Please try again.",
        provider: this.fallback.name,
        model: this.fallback.id,
        finishReason: "error",
      };
    }
  }

  /**
   * Generate with streaming
   */
  async generateStreaming(
    messages: AIMessage[],
    context: HealthContext,
    onChunk: StreamingCallback,
    signal?: AbortSignal,
    retries: number = MAX_RETRIES
  ): Promise<AIResponse> {
    let lastError: Error | null = null;

    // Try primary provider with streaming
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const isAvailable = await this.primary.isAvailable();
        if (!isAvailable) {
          throw new AIProviderError("Provider not available", this.primary.id, 503, true);
        }

        const content = await this.primary.generateStreaming(messages, context, onChunk, signal);

        return {
          content,
          provider: this.primary.name,
          model: this.primary.id,
          finishReason: "stop",
        };
      } catch (error) {
        lastError = error as Error;

        if (error instanceof AIProviderError && !error.isRetryable) {
          break;
        }

        console.log(`[Provider] Stream attempt ${attempt + 1} failed:`, (error as Error).message);

        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    // Fallback to minimal error message
    try {
      const content = await this.fallback.generateStreaming(messages, context, onChunk, signal);
      return {
        content,
        provider: this.fallback.name,
        model: this.fallback.id,
        finishReason: "stop",
      };
    } catch {
      const message = "AI service temporarily unavailable. Please try again.";
      onChunk(message);
      return {
        content: message,
        provider: this.fallback.name,
        model: this.fallback.id,
        finishReason: "error",
      };
    }
  }
}

// Export singleton
export const providerManager = new ProviderManager();
export default providerManager;