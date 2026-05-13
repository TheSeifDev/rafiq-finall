/**
 * Streaming Engine
 * Handles SSE parsing, chunk processing, and streaming UI updates
 */

export interface StreamChunk {
  type: 'content' | 'reasoning' | 'done' | 'error';
  content: string;
  reasoning?: string;
  done?: boolean;
  error?: string;
}

export interface StreamingConfig {
  throttleMs: number;        // Minimum time between UI updates
  bufferSize: number;         // Buffer chunks before yielding
  maxRetries: number;         // Max reconnection attempts
  retryDelayMs: number;       // Base delay for exponential backoff
  timeoutMs: number;          // Request timeout
}

const DEFAULT_CONFIG: StreamingConfig = {
  throttleMs: 16,             // ~60fps
  bufferSize: 5,              // Buffer 5 chunks before update
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000,
};

/**
 * Parse SSE chunk from OpenRouter
 */
export function parseSSEChunk(line: string): StreamChunk | null {
  if (!line.trim() || !line.startsWith('data:')) {
    return null;
  }

  const data = line.slice(5).trim();
  if (data === '[DONE]') {
    return { type: 'done', content: '', done: true };
  }

  try {
    const parsed = JSON.parse(data);

    // Handle OpenRouter reasoning format
    if (parsed.choices?.[0]?.delta) {
      const delta = parsed.choices[0].delta;

      // Reasoning content
      if (delta.reasoning) {
        return {
          type: 'reasoning',
          content: '',
          reasoning: delta.reasoning,
        };
      }

      // Regular content
      if (delta.content) {
        return {
          type: 'content',
          content: delta.content,
        };
      }
    }

    // Handle openai format
    if (parsed.choices?.[0]?.delta?.content) {
      return {
        type: 'content',
        content: parsed.choices[0].delta.content,
      };
    }

    return null;
  } catch {
    return { type: 'error', content: '', error: 'Failed to parse chunk' };
  }
}

/**
 * Parse full SSE response stream
 */
export async function parseSSEStream(
  response: Response,
  onChunk: (chunk: StreamChunk) => void,
  config: StreamingConfig = DEFAULT_CONFIG,
  signal?: AbortSignal
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let fullReasoning = '';
  let lastUpdate = 0;
  let bufferCount = 0;

  // Create timeout handler
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Stream timeout')), config.timeoutMs);
  });

  // Create abort handler
  const abortPromise = new Promise<never>((_, reject) => {
    signal?.addEventListener('abort', () => {
      reader.cancel();
      reject(new Error('Aborted'));
    });
  });

  try {
    while (true) {
      // Race between read, timeout, and abort
      const { done, value } = await Promise.race([
        reader.read(),
        timeoutPromise,
        abortPromise,
      ]);

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const chunk = parseSSEChunk(line);
        if (!chunk) continue;

        if (chunk.type === 'error') {
          console.log('[Stream] Parse error:', chunk.error);
          continue;
        }

        if (chunk.type === 'done') {
          onChunk({ type: 'done', content: '', done: true });
          return fullContent;
        }

        if (chunk.type === 'content') {
          fullContent += chunk.content;
          bufferCount++;

          // Throttle UI updates
          const now = Date.now();
          if (bufferCount >= config.bufferSize || now - lastUpdate >= config.throttleMs) {
            onChunk({ type: 'content', content: fullContent });
            lastUpdate = now;
            bufferCount = 0;
          }
        }

        if (chunk.type === 'reasoning') {
          fullReasoning += chunk.reasoning || '';
          onChunk({ type: 'reasoning', content: fullContent, reasoning: fullReasoning });
        }
      }
    }

    // Final update
    if (fullContent) {
      onChunk({ type: 'content', content: fullContent });
    }

    return fullContent;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Retry with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: StreamingConfig = DEFAULT_CONFIG,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < config.maxRetries) {
        const delay = config.retryDelayMs * Math.pow(2, attempt);
        const jitter = Math.random() * 0.3 * delay;

        onRetry?.(attempt + 1, lastError);
        console.log(`[Stream] Retry ${attempt + 1} after ${Math.round(delay + jitter)}ms`);

        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }
  }

  throw lastError;
}

/**
 * Create abort controller with timeout
 */
export function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();

  setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return controller;
}

/**
 * Calculate streaming stats
 */
export interface StreamStats {
  tokensPerSecond: number;
  totalTokens: number;
  durationMs: number;
  startTime: number;
}

export function createStreamStats(): StreamStats {
  return {
    tokensPerSecond: 0,
    totalTokens: 0,
    durationMs: 0,
    startTime: Date.now(),
  };
}

export function updateStreamStats(stats: StreamStats, contentLength: number): StreamStats {
  const now = Date.now();
  const elapsed = (now - stats.startTime) / 1000;

  return {
    ...stats,
    totalTokens: Math.ceil(contentLength / 4),
    durationMs: now - stats.startTime,
    tokensPerSecond: elapsed > 0 ? Math.ceil(stats.totalTokens / elapsed) : 0,
  };
}

export default {
  parseSSEChunk,
  parseSSEStream,
  withRetry,
  createTimeoutController,
  DEFAULT_CONFIG,
  createStreamStats,
  updateStreamStats,
};