/**
 * StreamingEngine — Non-streaming utilities for Expo SDK 54 React Native.
 *
 * IMPORTANT: React Native's fetch runtime does NOT support response.body /
 * ReadableStream / getReader(). All streaming code has been removed.
 * Use parseJSONResponse() for safe, non-streaming AI response parsing.
 */

// ── Types re-exported for backward compatibility ──────────────────────────────

export interface StreamChunk {
  type: 'content' | 'reasoning' | 'done' | 'error';
  content: string;
  reasoning?: string;
  done?: boolean;
  error?: string;
}

export interface StreamingConfig {
  throttleMs: number;
  bufferSize: number;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
}

export interface StreamStats {
  tokensPerSecond: number;
  totalTokens: number;
  durationMs: number;
  startTime: number;
}

const DEFAULT_CONFIG: StreamingConfig = {
  throttleMs: 16,
  bufferSize: 5,
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 60000,
};

// ── Safe JSON response parser (replaces parseSSEStream) ───────────────────────

/**
 * Safely parse an AI API JSON response.
 * Returns the content string and optional reasoning string.
 * Never throws "No response body" — uses response.text() which is
 * universally supported in React Native / Expo SDK 54.
 */
export async function parseJSONResponse(response: Response): Promise<{
  content: string;
  reasoning?: string;
  finishReason: string;
}> {
  if (!response.ok) {
    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch {
      errorBody = '(could not read error body)';
    }
    throw new Error(
      `[AI] HTTP ${response.status}: ${errorBody.slice(0, 300)}`
    );
  }

  let raw = '';
  try {
    raw = await response.text();
  } catch (err) {
    throw new Error(`[AI] Failed to read response text: ${(err as Error).message}`);
  }

  if (!raw || !raw.trim()) {
    throw new Error('[AI] Empty response body from provider');
  }

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `[AI] Failed to parse JSON response: ${(err as Error).message} — raw: ${raw.slice(0, 200)}`
    );
  }

  const choice = data?.choices?.[0];
  if (!choice) {
    throw new Error(
      `[AI] No choices in response payload: ${raw.slice(0, 300)}`
    );
  }

  const content: string = choice?.message?.content ?? '';
  const reasoning: string | undefined = choice?.message?.reasoning ?? undefined;
  const finishReason: string = choice?.finish_reason ?? 'stop';

  return { content, reasoning, finishReason };
}

/**
 * REMOVED — parseSSEStream used response.body.getReader() which is
 * unsupported in React Native / Expo SDK 54.
 *
 * Kept as a stub to prevent import errors in files that reference it.
 * Always throws a clear, actionable error.
 *
 * @deprecated Use parseJSONResponse() instead.
 */
export async function parseSSEStream(
  _response: Response,
  _onChunk: (chunk: StreamChunk) => void,
  _config?: StreamingConfig,
  _signal?: AbortSignal
): Promise<string> {
  throw new Error(
    '[AI] parseSSEStream() is not supported on Expo SDK 54 React Native. ' +
    'Use parseJSONResponse() with stream:false.'
  );
}

/**
 * REMOVED — SSE chunk parser for legacy SSE streams.
 * Kept as stub for import compatibility.
 * @deprecated
 */
export function parseSSEChunk(_line: string): StreamChunk | null {
  return null;
}

// ── Retry helper ──────────────────────────────────────────────────────────────

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
        console.log(`[AI] Retry ${attempt + 1} after ${Math.round(delay + jitter)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }
  }

  throw lastError;
}

// ── Timeout controller ────────────────────────────────────────────────────────

export function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}

// ── Stream stats (kept for TS compat, no streaming occurs) ───────────────────

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
  parseJSONResponse,
  parseSSEChunk,
  parseSSEStream,
  withRetry,
  createTimeoutController,
  DEFAULT_CONFIG,
  createStreamStats,
  updateStreamStats,
};