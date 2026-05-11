/**
 * Circuit Breaker — Exponential Suppression with Cooldown
 *
 * Provides fault-tolerance for reconnect machines:
 *   - Failure counting with rolling window
 *   - Exponential delay with max cap
 *   - Open/half-open/closed states
 *   - Cooldown window before half-open
 *   - Automatic recovery after cooldown
 */
import { eventBus } from '../events/EventBus';

export type CircuitState = 'closed' | 'open' | 'halfOpen';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Failures to trip the circuit (e.g. 5)
  successThreshold: number;       // Successes to close from half-open (e.g. 3)
  cooldownMs: number;            // Time in open state before half-open (e.g. 60_000)
  windowMs: number;              // Rolling failure window (e.g. 300_000 = 5 min)
  maxDelayMs: number;            // Maximum backoff delay
  baseDelayMs: number;           // Base backoff delay
  name: string;                   // Identifier for logging
}

export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  cooldownMs: 60_000,
  windowMs: 300_000,
  maxDelayMs: 120_000,
  baseDelayMs: 1000,
  name: 'default',
};

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures: number[] = [];
  private successes: number[] = [];
  private lastFailureAt: number | null = null;
  private config: CircuitBreakerConfig;
  private halfOpenTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
  }

  getState(): CircuitState {
    return this.state;
  }

  isOpen(): boolean {
    return this.state === 'open';
  }

  isClosed(): boolean {
    return this.state === 'closed';
  }

  private pruneOldEvents(now: number): void {
    const cutoff = now - this.config.windowMs;
    this.failures = this.failures.filter(t => t > cutoff);
    this.successes = this.successes.filter(t => t > cutoff);
  }

  private getFailureCount(): number {
    this.pruneOldEvents(Date.now());
    return this.failures.length;
  }

  private getSuccessCount(): number {
    this.pruneOldEvents(Date.now());
    return this.successes.length;
  }

  private transitionTo(next: CircuitState): void {
    const prev = this.state;
    this.state = next;

    eventBus.emit({
      type: 'circuitBreaker.stateChange',
      source: 'system',
      timestamp: Date.now(),
      payload: { name: this.config.name, previous: prev, current: next, failures: this.getFailureCount() },
    });

    if (next === 'halfOpen') {
      console.info(`[CircuitBreaker:${this.config.name}] Half-open — allowing probe`);
    }
  }

  recordFailure(): void {
    const now = Date.now();
    this.pruneOldEvents(now);
    this.failures.push(now);
    this.lastFailureAt = now;
    this.successes = []; // Reset success streak

    if (this.state === 'halfOpen') {
      // Immediately reopen on failure in half-open
      this.transitionTo('open');
      this.scheduleCooldown();
      return;
    }

    if (this.getFailureCount() >= this.config.failureThreshold) {
      this.transitionTo('open');
      this.scheduleCooldown();
    }
  }

  recordSuccess(): void {
    const now = Date.now();
    this.pruneOldEvents(now);
    this.successes.push(now);

    if (this.state === 'halfOpen') {
      if (this.getSuccessCount() >= this.config.successThreshold) {
        this.transitionTo('closed');
        this.failures = [];
        console.info(`[CircuitBreaker:${this.config.name}] Closed after ${this.getSuccessCount()} successes`);
      }
    }
  }

  private scheduleCooldown(): void {
    if (this.halfOpenTimer) clearTimeout(this.halfOpenTimer);
    this.halfOpenTimer = setTimeout(() => {
      if (this.state === 'open') {
        this.transitionTo('halfOpen');
      }
    }, this.config.cooldownMs);
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const elapsed = Date.now() - (this.lastFailureAt ?? 0);
      if (elapsed < this.config.cooldownMs) {
        throw new CircuitOpenError(this.config.name, this.config.cooldownMs - elapsed);
      }
      this.transitionTo('halfOpen');
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  getBackoffDelay(): number {
    const failures = this.getFailureCount();
    if (failures === 0) return this.config.baseDelayMs;
    return Math.min(this.config.baseDelayMs * Math.pow(2, failures), this.config.maxDelayMs);
  }

  getStats(): {
    state: CircuitState;
    failures: number;
    successes: number;
    backoffDelay: number;
    timeSinceLastFailure: number | null;
  } {
    return {
      state: this.state,
      failures: this.getFailureCount(),
      successes: this.getSuccessCount(),
      backoffDelay: this.getBackoffDelay(),
      timeSinceLastFailure: this.lastFailureAt ? Date.now() - this.lastFailureAt : null,
    };
  }

  reset(): void {
    if (this.halfOpenTimer) clearTimeout(this.halfOpenTimer);
    this.failures = [];
    this.successes = [];
    this.lastFailureAt = null;
    this.transitionTo('closed');
  }

  destroy(): void {
    if (this.halfOpenTimer) clearTimeout(this.halfOpenTimer);
  }
}

export class CircuitOpenError extends Error {
  readonly circuit: string;
  readonly retryAfterMs: number;

  constructor(circuit: string, retryAfterMs: number) {
    super(`[CircuitBreaker:${circuit}] Open — retry after ${Math.round(retryAfterMs / 1000)}s`);
    this.name = 'CircuitOpenError';
    this.circuit = circuit;
    this.retryAfterMs = retryAfterMs;
  }
}

// ─── Registry of named circuit breakers ───────────────────────────────────

const registry = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
  if (!registry.has(name)) {
    registry.set(name, new CircuitBreaker(config ?? { ...DEFAULT_CIRCUIT_CONFIG, name }));
  }
  return registry.get(name)!;
}

export function resetAllCircuitBreakers(): void {
  for (const cb of registry.values()) cb.reset();
}

export function getAllCircuitStats(): Record<string, ReturnType<CircuitBreaker['getStats']>> {
  const stats: Record<string, ReturnType<CircuitBreaker['getStats']>> = {};
  for (const [name, cb] of registry) {
    stats[name] = cb.getStats();
  }
  return stats;
}
