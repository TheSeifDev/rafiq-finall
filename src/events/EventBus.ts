/**
 * RAFIQ Event Bus — typed internal event system
 *
 * Architecture:
 *   Sensor Event → Event Bus → [Notification Service, Supabase, Mobile UI]
 *
 * All events are typed. Decoupled. Async-safe propagation.
 * Listeners are identified by key for targeted removal.
 */

export type EventBus = {
  emit(event: Event<Record<string, unknown>>): void;
  on(key: string, handler: (event: Event<Record<string, unknown>>) => void | Promise<void>): () => void;
  once(key: string, handler: (event: Event<Record<string, unknown>>) => void | Promise<void>): () => void;
  off(key: string): void;
  offAll(): void;
  listenerCount(key: string): number;
};

export type Event<T extends Record<string, unknown> = Record<string, unknown>> = {
  type: string;
  source: EventSource;
  timestamp: number;
  payload: T;
  metadata?: EventMetadata;
};

export type EventSource = 'wearable' | 'backend' | 'local' | 'ai' | 'system' | 'manual';

export type EventMetadata = {
  userId?: string;
  patientId?: string;
  deviceId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  correlationId?: string;
};

export type EventHandler<T extends Record<string, unknown> = Record<string, unknown>> = (
  event: Event<T>
) => void | Promise<void>;

// ─── Event type registry ────────────────────────────────────────

export type RafiqEventMap = {
  // Wearable events
  'wearable.connected': { deviceId: string; deviceName: string; rssi?: number; batteryLevel?: number };
  'wearable.disconnected': { deviceId: string; reason?: string };
  'wearable.heartRate': { bpm: number; timestamp: number; confidence?: number };
  'wearable.spo2': { percentage: number; timestamp: number };
  'wearable.bloodPressure': { systolic: number; diastolic: number; timestamp: number };
  'wearable.temperature': { celsius: number; timestamp: number };
  'wearable.steps': { count: number; goal: number; timestamp: number };
  'wearable.sleep': { durationMinutes: number; quality?: number; timestamp: number };
  'wearable.fallDetected': { confidence: number; location?: string; timestamp: number };
  'wearable.batteryLow': { level: number; deviceId: string };

  // Health events
  'health.vitalsRecorded': { patientId: string; source: string; readings: Record<string, number | null> };
  'health.abnormalReading': { patientId: string; vital: string; value: number; threshold: number; severity: 'warning' | 'critical' };
  'health.emergencyTriggered': { patientId: string; type: string; location?: { lat: number; lng: number }; timestamp: number };

  // Notification events
  'notification.sent': { notificationId: string; category: string; severity: string };
  'notification.read': { notificationId: string };
  'notification.delivered': { notificationId: string; deviceId?: string };
  'notification.failed': { notificationId: string; reason: string; attempts: number };

  // Medication events
  'medication.taken': { medicationId: string; dose: string; patientId: string; timestamp: number };
  'medication.missed': { medicationId: string; patientId: string; scheduledTime: string; graceExpired: boolean };
  'medication.lowStock': { medicationId: string; remaining: number; refillThreshold: number };
  'medication.refillDue': { medicationId: string; patientId: string };

  // Device / Smart Home events
  'device.gasAlert': { level: 'warning' | 'danger' | 'critical'; concentration?: number; location?: string; timestamp: number };
  'device.offline': { deviceId: string; deviceType: string; lastSeen: number };
  'device.online': { deviceId: string; deviceType: string };

  // Sync events
  'sync.started': { table: string; direction: 'push' | 'pull' };
  'sync.completed': { table: string; pushed: number; pulled: number; failed: number };
  'sync.failed': { table: string; error: string; retryIn?: number };

  // AI events
  'ai.insight': { patientId: string; type: string; title: string; body: string; confidence: number };
  'ai.warning': { patientId: string; type: string; title: string; body: string; severity: 'low' | 'medium' | 'high' };
  'ai.recommendation': { patientId: string; category: string; recommendation: string; reason: string };
};

// ─── Implementation ─────────────────────────────────────────────

type ListenerEntry = {
  handler: (event: Event<Record<string, unknown>>) => void | Promise<void>;
  once: boolean;
};

const listeners = new Map<string, ListenerEntry[]>();
let warnDuplicateListeners = false;

/**
 * Create a new EventBus instance.
 * Defaults to module-level singleton bus.
 */
export function createEventBus(): EventBus {
  return {
    emit(event) {
      const entries = listeners.get(event.type) ?? [];
      // Snapshot to avoid mutation during iteration
      const snapshot = entries.slice();

      for (const entry of snapshot) {
        try {
          const result = entry.handler(event as Event<Record<string, unknown>>);
          // Fire-and-forget async handlers
          if (result instanceof Promise) {
            result.catch((err) =>
              console.warn(`[EventBus] Async handler error for "${event.type}":`, err)
            );
          }
        } catch (err) {
          console.warn(`[EventBus] Handler error for "${event.type}":`, err);
        }

        if (entry.once) {
          const idx = entries.indexOf(entry);
          if (idx !== -1) entries.splice(idx, 1);
        }
      }
    },

    on(key: string, handler: (event: Event<Record<string, unknown>>) => void | Promise<void>): () => void {
      if (!listeners.has(key)) {
        listeners.set(key, []);
      }
      const arr = listeners.get(key)!;

      // Warn about duplicate listeners in dev
      if (__DEV__ && warnDuplicateListeners && arr.length > 0) {
        console.warn(`[EventBus] Multiple listeners for "${key}" — may indicate a memory leak.`);
      }

      const entry: ListenerEntry = { handler, once: false };
      arr.push(entry);

      // Return cleanup function
      return () => {
        const entries = listeners.get(key);
        if (!entries) return;
        const idx = entries.indexOf(entry);
        if (idx !== -1) entries.splice(idx, 1);
        if (entries.length === 0) listeners.delete(key);
      };
    },

    once(key: string, handler: (event: Event<Record<string, unknown>>) => void | Promise<void>): () => void {
      if (!listeners.has(key)) {
        listeners.set(key, []);
      }
      const arr = listeners.get(key)!;
      const entry: ListenerEntry = { handler, once: true };
      arr.push(entry);
      return () => {
        const entries = listeners.get(key);
        if (!entries) return;
        const idx = entries.indexOf(entry);
        if (idx !== -1) entries.splice(idx, 1);
        if (entries.length === 0) listeners.delete(key);
      };
    },

    off(key: string) {
      listeners.delete(key);
    },

    offAll() {
      listeners.clear();
    },

    listenerCount(key: string): number {
      return listeners.get(key)?.length ?? 0;
    },
  };
}

// ─── Module-level singleton ─────────────────────────────────────

export const eventBus = createEventBus();

// ─── Convenience emit helpers ──────────────────────────────────

/**
 * Emit a typed event from the event bus.
 * Type-safe shortcut for common RAFIQ events.
 */
export function emitWearableConnected(params: RafiqEventMap['wearable.connected']): void {
  eventBus.emit({
    type: 'wearable.connected',
    source: 'wearable',
    timestamp: Date.now(),
    payload: params as Record<string, unknown>,
    metadata: { deviceId: params.deviceId },
  });
}

export function emitWearableDisconnected(params: RafiqEventMap['wearable.disconnected']): void {
  eventBus.emit({
    type: 'wearable.disconnected',
    source: 'wearable',
    timestamp: Date.now(),
    payload: params as Record<string, unknown>,
    metadata: { deviceId: params.deviceId },
  });
}

export function emitVitalsRecorded(params: RafiqEventMap['health.vitalsRecorded']): void {
  eventBus.emit({
    type: 'health.vitalsRecorded',
    source: 'wearable',
    timestamp: Date.now(),
    payload: params as Record<string, unknown>,
    metadata: { patientId: params.patientId },
  });
}

export function emitAbnormalReading(params: RafiqEventMap['health.abnormalReading']): void {
  eventBus.emit({
    type: 'health.abnormalReading',
    source: 'system',
    timestamp: Date.now(),
    payload: params as Record<string, unknown>,
    metadata: {
      patientId: params.patientId,
      severity: params.severity === 'critical' ? 'critical' : 'high',
      category: params.vital,
    },
  });
}

export function emitEmergencyTriggered(params: RafiqEventMap['health.emergencyTriggered']): void {
  eventBus.emit({
    type: 'health.emergencyTriggered',
    source: 'system',
    timestamp: Date.now(),
    payload: params as Record<string, unknown>,
    metadata: {
      patientId: params.patientId,
      severity: 'critical',
      category: 'emergency',
    },
  });
}

export function emitFallDetected(params: { deviceId: string; confidence: number; location?: string }): void {
  eventBus.emit({
    type: 'wearable.fallDetected',
    source: 'wearable',
    timestamp: Date.now(),
    payload: params as unknown as RafiqEventMap['wearable.fallDetected'],
    metadata: {
      deviceId: params.deviceId,
      severity: 'critical',
      category: 'emergency',
    },
  });
}

export function emitMedicationTaken(params: RafiqEventMap['medication.taken']): void {
  eventBus.emit({
    type: 'medication.taken',
    source: 'local',
    timestamp: Date.now(),
    payload: params as Record<string, unknown>,
    metadata: { patientId: params.patientId },
  });
}

export function emitMedicationMissed(params: RafiqEventMap['medication.missed']): void {
  eventBus.emit({
    type: 'medication.missed',
    source: 'system',
    timestamp: Date.now(),
    payload: params as Record<string, unknown>,
    metadata: { patientId: params.patientId, severity: 'medium' },
  });
}

export function emitGasAlert(params: RafiqEventMap['device.gasAlert']): void {
  eventBus.emit({
    type: 'device.gasAlert',
    source: 'system',
    timestamp: Date.now(),
    payload: params as Record<string, unknown>,
    metadata: {
      severity: params.level === 'critical' ? 'critical' : params.level === 'danger' ? 'high' : 'medium',
      category: 'device',
    },
  });
}

export function emitNotificationSent(params: RafiqEventMap['notification.sent']): void {
  eventBus.emit({
    type: 'notification.sent',
    source: 'system',
    timestamp: Date.now(),
    payload: params as Record<string, unknown>,
  });
}

export function emitSyncCompleted(params: RafiqEventMap['sync.completed']): void {
  eventBus.emit({
    type: 'sync.completed',
    source: 'system',
    timestamp: Date.now(),
    payload: params as Record<string, unknown>,
  });
}

export function emitAIInsight(params: RafiqEventMap['ai.insight']): void {
  eventBus.emit({
    type: 'ai.insight',
    source: 'ai',
    timestamp: Date.now(),
    payload: params as Record<string, unknown>,
    metadata: { patientId: params.patientId },
  });
}