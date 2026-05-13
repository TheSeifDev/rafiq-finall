/**
 * Stream Processor
 * Production-grade stream handling with throttling, buffering, and memory management
 */

import { SSEParser, type SSEEvent } from './SSEParser';

export interface StreamConfig {
  throttleMs: number;
  bufferSize: number;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface StreamCallbacks {
  onChunk: (content: string, reasoning?: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export interface StreamResult {
  content: string;
  reasoning: string;
  chunks: number;
}

const DEFAULT_CONFIG: StreamConfig = {
  throttleMs: 16,        // ~60fps
  bufferSize: 10,       // Buffer chunks before flush
  timeoutMs: 60000,     // 60s timeout
  maxRetries: 3,
  retryDelayMs: 1000,
};

/**
 * Stream Processor - handles fetch, parsing, throttling, and cleanup
 */
export class StreamProcessor {
  private config: StreamConfig;
  private parser: SSEParser;
  private abortController: AbortController | null = null;
  private timeoutId: NodeJS.Timeout | null = null;
  private isActive: boolean = false;
  private lastChunkTime: number = 0;
  private chunkBuffer: string = '';
  private reasoningBuffer: string = '';
  private totalChunks: number = 0;

  constructor(config: Partial<StreamConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.parser = new SSEParser();
  }

  /**
   * Process streaming fetch response
   */
  async process(
    response: Response,
    callbacks: StreamCallbacks
  ): Promise<StreamResult> {
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    // Reset state
    this.parser.reset();
    this.chunkBuffer = '';
    this.reasoningBuffer = '';
    this.totalChunks = 0;
    this.isActive = true;

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: false });

    try {
      while (this.isActive) {
        // Check for abort
        if (this.abortController?.signal.aborted) {
          throw new Error('Stream aborted');
        }

        // Read with timeout
        const readPromise = reader.read();
        const timeoutPromise = new Promise<{ done: boolean; value?: Uint8Array }>(
          (_, reject) => {
            this.timeoutId = setTimeout(() => {
              reject(new Error('Read timeout'));
            }, this.config.timeoutMs);
          }
        );

        let readResult: { done: boolean; value?: Uint8Array };
        try {
          readResult = await Promise.race([readPromise, timeoutPromise]);
        } finally {
          if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
          }
        }

        if (readResult.done) {
          break;
        }

        // Decode chunk
        const chunk = decoder.decode(readResult.value, { stream: true });
        this.totalChunks++;

        // Parse events
        const events = this.parser.feed(chunk);

        // Process events
        for (const event of events) {
          this.processEvent(event, callbacks);
        }

        // Throttled flush
        this.flushIfNeeded(callbacks);
      }

      // Final flush
      const finalEvent = this.parser.flush();
      if (finalEvent) {
        this.processEvent(finalEvent, callbacks);
      }

      callbacks.onDone();

      return {
        content: this.chunkBuffer,
        reasoning: this.reasoningBuffer,
        chunks: this.totalChunks,
      };
    } finally {
      // Cleanup
      this.isActive = false;
      try {
        reader.releaseLock();
      } catch { /* ignore */ }
    }
  }

  /**
   * Process single SSE event
   */
  private processEvent(event: SSEEvent, callbacks: StreamCallbacks): void {
    switch (event.type) {
      case 'reasoning':
        this.reasoningBuffer += event.data;
        callbacks.onChunk(this.chunkBuffer, this.reasoningBuffer);
        break;

      case 'content':
        this.chunkBuffer += event.data;
        callbacks.onChunk(this.chunkBuffer, this.reasoningBuffer);
        break;

      case 'done':
        this.isActive = false;
        break;

      case 'error':
        callbacks.onError(new Error(event.data));
        break;
    }
  }

  /**
   * Flush buffer if throttling threshold reached
   */
  private flushIfNeeded(callbacks: StreamCallbacks): void {
    const now = Date.now();
    const timeSinceLastFlush = now - this.lastChunkTime;

    if (timeSinceLastFlush >= this.config.throttleMs) {
      this.lastChunkTime = now;
      callbacks.onChunk(this.chunkBuffer, this.reasoningBuffer);
    }
  }

  /**
   * Abort ongoing stream
   */
  abort(): void {
    this.isActive = false;
    this.abortController?.abort();

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Create abort signal for fetch
   */
  createSignal(): AbortSignal {
    this.abortController = new AbortController();
    return this.abortController.signal;
  }

  /**
   * Get current state
   */
  getStats(): { chunks: number; contentLength: number; reasoningLength: number } {
    return {
      chunks: this.totalChunks,
      contentLength: this.chunkBuffer.length,
      reasoningLength: this.reasoningBuffer.length,
    };
  }
}

/**
 * Execute fetch with retry and timeout
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit & { timeout?: number },
  config: StreamConfig = DEFAULT_CONFIG
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || config.timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Retry on server errors
      if (!response.ok && response.status >= 500 && attempt < config.maxRetries) {
        const delay = config.retryDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      if (attempt < config.maxRetries) {
        const delay = config.retryDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Fetch failed');
}

/**
 * Create configured stream processor
 */
export function createStreamProcessor(config?: Partial<StreamConfig>): StreamProcessor {
  return new StreamProcessor(config);
}

export default StreamProcessor;