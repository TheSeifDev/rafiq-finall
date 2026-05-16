/**
 * RAFIQ Reconnect State Machines — with Circuit Breakers
 *
 * Manages reconnection lifecycle for:
 *   - BLE wearable devices
 *   - Supabase realtime channels
 *   - Expo push notifications
 *
 * States:
 *   DISCONNECTED → CONNECTING → RECONNECTING → RESYNCING → ACTIVE → FAILED
 *
 * Circuit breaker integration:
 *   - Exponential suppression after repeated failures
 *   - Half-open probe after cooldown
 *   - Rolling failure window tracking
 */
import * as wearable from '../services/wearable/ble.service';
import { supabase } from '../services/supabase';
import { eventBus } from '../events/EventBus';
import { CircuitBreaker, getCircuitBreaker, CircuitOpenError } from './circuitBreaker';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Shared Types ────────────────────────────────────────────────────────────

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'reconnecting'
  | 'resyncing'
  | 'active'
  | 'failed';

export interface ReconnectConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  onStateChange?: (state: ConnectionState, attempt: number) => void;
  circuitBreaker?: CircuitBreaker;
}

// ─── Base machine ──────────────────────────────────────────────────────────

abstract class BaseReconnectMachine {
  protected state: ConnectionState = 'disconnected';
  protected attempts = 0;
  protected config: ReconnectConfig;
  protected reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  protected circuit: CircuitBreaker;

  protected constructor(config: ReconnectConfig, circuitName: string) {
    this.config = config;
    this.circuit = config.circuitBreaker ?? getCircuitBreaker(circuitName);
  }

  getState(): ConnectionState { return this.state; }
  getAttempts(): number { return this.attempts; }
  getCircuitState(): string { return this.circuit.getState(); }

  protected transitionTo(next: ConnectionState): void {
    const prev = this.state;
    this.state = next;
    this.config.onStateChange?.(next, this.attempts);
    if (next === 'active') this.attempts = 0;
  }

  protected scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.attempts >= this.config.maxAttempts) {
      this.transitionTo('failed');
      return;
    }

    this.transitionTo('reconnecting');
    this.attempts++;

    // Use circuit breaker backoff
    const delay = this.circuit.getBackoffDelay();

    this.reconnectTimer = setTimeout(() => {
      this.safeReconnect();
    }, delay);
  }

  protected async safeReconnect(): Promise<void> {
    try {
      await this.reconnect();
    } catch (err) {
      if (err instanceof CircuitOpenError) {
        console.warn(`[${this.getName()}] Circuit open, skipping reconnect`);
        this.transitionTo('failed');
        return;
      }
      this.scheduleReconnect();
    }
  }

  protected abstract getName(): string;
  protected abstract reconnect(): Promise<void>;

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.transitionTo('disconnected');
    this.attempts = 0;
    this.circuit.recordSuccess();
  }

  destroy(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.state = 'disconnected';
    this.attempts = 0;
  }
}

// ─── BLE Reconnect State Machine ────────────────────────────────────────────

export class BLEReconnectMachine extends BaseReconnectMachine {
  private deviceId: string | null = null;

  constructor(config: ReconnectConfig) {
    super(config, 'ble');
  }

  protected getName(): string { return 'BLE'; }

  setDevice(deviceId: string): void {
    this.deviceId = deviceId;
    this.transitionTo('disconnected');
  }

  protected async reconnect(): Promise<void> {
    if (!this.deviceId) return;
    this.transitionTo('connecting');

    await this.circuit.execute(async () => {
      await wearable.connect(this.deviceId!);
      this.transitionTo('resyncing');
      await wearable.readVitals(''); // TODO: pass proper userId from auth
      this.transitionTo('active');
      this.circuit.recordSuccess();
    });
  }

  connect(): Promise<void> {
    return this.circuit.execute(() => this.reconnect());
  }
}

// ─── Supabase Realtime Reconnect State Machine ────────────────────────────────

export class SupabaseReconnectMachine extends BaseReconnectMachine {
  private channels = new Map<string, RealtimeChannel>();

  constructor(config: ReconnectConfig) {
    super(config, 'supabase');
  }

  protected getName(): string { return 'Supabase'; }

  protected transitionTo(next: ConnectionState): void {
    super.transitionTo(next);
    eventBus.emit({
      type: 'supabase.connectionStateChanged',
      source: 'system',
      timestamp: Date.now(),
      payload: { previous: this.state, current: next, attempt: this.attempts, channels: Array.from(this.channels.keys()) },
    });
  }

  registerChannel(name: string, channel: RealtimeChannel): void {
    this.channels.set(name, channel);
    channel.on('system', { event: '*' }, (payload) => {
      if (payload.type === 'system' && payload.event === 'disconnected') {
        this.circuit.recordFailure();
        this.handleDisconnect();
      }
    });
  }

  unregisterChannel(name: string): void {
    const channel = this.channels.get(name);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(name);
    }
  }

  private handleDisconnect(): void {
    if (this.state === 'disconnected') return;
    this.transitionTo('reconnecting');
    this.scheduleReconnect();
  }

  protected async reconnect(): Promise<void> {
    this.transitionTo('resyncing');
    const failed: string[] = [];

    await this.circuit.execute(async () => {
      for (const [name, channel] of this.channels) {
        try {
          await channel.subscribe();
        } catch {
          failed.push(name);
        }
      }

      if (failed.length === 0) {
        this.transitionTo('active');
        this.circuit.recordSuccess();
      } else {
        this.circuit.recordFailure();
        this.transitionTo('failed');
      }
    });
  }

  async manualReconnect(): Promise<void> {
    this.circuit.reset();
    await this.reconnect();
  }

  override async disconnect(): Promise<void> {
    super.disconnect();
    for (const channel of this.channels.values()) {
      supabase.removeChannel(channel);
    }
    this.channels.clear();
  }
}

// ─── Notification Reconnect State Machine ────────────────────────────────────

export class NotificationReconnectMachine extends BaseReconnectMachine {

  constructor(config: ReconnectConfig) {
    super(config, 'notifications');
  }

  protected getName(): string { return 'Notifications'; }

  protected async reconnect(): Promise<void> {
    this.transitionTo('connecting');

    await this.circuit.execute(async () => {
      const { default: Notifications } = await import('expo-notifications');
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        this.transitionTo('resyncing');
        this.transitionTo('active');
        this.circuit.recordSuccess();
      } else {
        this.circuit.recordFailure();
        this.transitionTo('failed');
      }
    });
  }

  connect(): Promise<void> {
    return this.circuit.execute(() => this.reconnect());
  }

  handlePermissionChange(granted: boolean): void {
    if (granted && this.state !== 'active') {
      this.circuit.reset();
      this.transitionTo('active');
    } else if (!granted) {
      this.circuit.recordFailure();
      this.transitionTo('failed');
    }
  }
}

// ─── Shared Reconnect Config Defaults ─────────────────────────────────────

export const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60_000,
};
