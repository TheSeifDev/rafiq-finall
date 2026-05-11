/**
 * RAFIQ Typed Domain Events
 *
 * Single source of truth for all domain event types and payload schemas.
 * All event emissions should use these types — never emit ad-hoc event objects.
 *
 * Architecture:
 *   EventService → emits typed events → EventBus → Listeners
 *
 * Naming convention:
 *   {source}.{category}.{action}
 *   Examples: wearable.heartRate.detected, health.vitals.recorded, system.bootstrap.phase
 */
import type { Event as RafiqEvent } from '../events/EventBus';

// ─── Wearable Events ────────────────────────────────────────────────────────

export interface WearableConnectedPayload {
  deviceId: string;
  deviceName: string;
  deviceType?: string;
  rssi?: number;
  batteryLevel?: number;
  connectionState: string;
}

export interface WearableDisconnectedPayload {
  deviceId: string;
  reason?: string;
  wasIntentional: boolean;
}

export interface WearableHeartRatePayload {
  bpm: number;
  confidence?: number;
  timestamp: number;
  deviceId?: string;
}

export interface WearableSpO2Payload {
  percentage: number;
  confidence?: number;
  timestamp: number;
}

export interface WearableBloodPressurePayload {
  systolic: number;
  diastolic: number;
  timestamp: number;
}

export interface WearableTemperaturePayload {
  celsius: number;
  method?: 'skin' | 'core' | 'infrared';
  timestamp: number;
}

export interface WearableStepsPayload {
  count: number;
  goal: number;
  timestamp: number;
}

export interface WearableSleepPayload {
  durationMinutes: number;
  quality?: number;
  timestamp: number;
}

export interface WearableFallDetectedPayload {
  confidence: number;
  location?: { lat: number; lng: number };
  timestamp: number;
  deviceId?: string;
}

export interface WearableBatteryLowPayload {
  level: number;
  deviceId: string;
}

// ─── Health Events ─────────────────────────────────────────────────────────

export interface HealthVitalsRecordedPayload {
  patientId: string;
  source: 'wearable' | 'manual' | 'simulator';
  readings: {
    heart_rate?: number;
    oxygen_saturation?: number;
    blood_pressure_systolic?: number;
    blood_pressure_diastolic?: number;
    temperature?: number;
    steps?: number;
    sleep_hours?: number;
  };
  confidence: number;
}

export interface HealthAbnormalReadingPayload {
  patientId: string;
  vital: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  timestamp: number;
}

export interface HealthEmergencyTriggeredPayload {
  patientId: string;
  type: 'hypoxia' | 'tachycardia' | 'hypertensive_crisis' | 'hyperthermia' | 'fall_detected';
  location?: { lat: number; lng: number };
  contactsNotified: string[];
  timestamp: number;
}

// ─── Notification Events ───────────────────────────────────────────────────

export interface NotificationSentPayload {
  notificationId: string;
  category: string;
  severity: string;
  deliveredAt?: number;
}

export interface NotificationReadPayload {
  notificationId: string;
  readAt: number;
}

export interface NotificationDeliveredPayload {
  notificationId: string;
  deviceId?: string;
  deliveredAt: number;
}

export interface NotificationFailedPayload {
  notificationId: string;
  reason: string;
  attempts: number;
  lastAttempt: number;
}

export interface NotificationQueueDepthPayload {
  depth: number;
  oldestAgeMs: number;
  failedCount: number;
}

// ─── Medication Events ─────────────────────────────────────────────────────

export interface MedicationTakenPayload {
  medicationId: string;
  dose: string;
  patientId: string;
  takenAt: number;
}

export interface MedicationMissedPayload {
  medicationId: string;
  patientId: string;
  scheduledTime: string;
  graceExpired: boolean;
}

export interface MedicationLowStockPayload {
  medicationId: string;
  remaining: number;
  refillThreshold: number;
}

export interface MedicationRefillDuePayload {
  medicationId: string;
  patientId: string;
  medicationName: string;
}

// ─── Device / Smart Home Events ─────────────────────────────────────────────

export interface DeviceGasAlertPayload {
  level: 'warning' | 'danger' | 'critical';
  concentration?: number;
  location?: string;
  timestamp: number;
  contactsNotified: boolean;
}

export interface DeviceOfflinePayload {
  deviceId: string;
  deviceType: string;
  lastSeen: number;
}

export interface DeviceOnlinePayload {
  deviceId: string;
  deviceType: string;
  reconnectedAt: number;
}

// ─── Sync Events ────────────────────────────────────────────────────────────

export interface SyncStartedPayload {
  table: string;
  direction: 'push' | 'pull';
  batchSize?: number;
}

export interface SyncCompletedPayload {
  table: string;
  pushed: number;
  pulled: number;
  failed: number;
  durationMs: number;
}

export interface SyncFailedPayload {
  table: string;
  error: string;
  errorCode?: string;
  retryIn?: number;
}

// ─── AI Events ───────────────────────────────────────────────────────────────

export interface AIInsightPayload {
  patientId: string;
  type: 'trend' | 'anomaly' | 'recommendation' | 'forecast';
  title: string;
  body: string;
  confidence: number;
  timestamp: number;
}

export interface AIWarningPayload {
  patientId: string;
  type: string;
  title: string;
  body: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
}

export interface AIRecommendationPayload {
  patientId: string;
  category: 'activity' | 'sleep' | 'medication' | 'nutrition' | 'general';
  recommendation: string;
  reason: string;
  priority: number;
}

// ─── System Events ─────────────────────────────────────────────────────────

export interface AppBootstrapStartPayload {
  fallbackLanguage: string;
  isColdStart: boolean;
}

export interface AppBootstrapPhasePayload {
  phase: string;
  status: 'done' | 'failed';
  durationMs?: number;
  error?: string;
  result?: Record<string, unknown>;
}

export interface AppBootstrapCompletePayload {
  totalDurationMs: number;
  failedPhases: Array<{ phase: string; error?: string }>;
  hasFailures: boolean;
}

export interface SystemErrorPayload {
  errorMessage: string;
  errorStack?: string;
  componentName?: string;
  timestamp: number;
  sessionId?: string;
  userId?: string;
}

export interface CircuitBreakerStateChangePayload {
  name: string;
  previous: string;
  current: string;
  failures: number;
}

// ─── Monitoring Events ────────────────────────────────────────────────────────

export interface MonitoringStartupPayload {
  startupTimeMs: number;
  sessionId?: string;
  historyCount?: number;
}

export interface MonitoringFramesPayload {
  droppedFrames: number;
  avgFrameTimeMs: number;
}

export interface MonitoringSyncSlowPayload {
  table: string;
  latencyMs: number;
  success: boolean;
}

export interface MonitoringBLEUnstablePayload {
  recentDisconnects: number;
  deviceId?: string;
}

export interface MonitoringRealtimeHealthPayload {
  health: 'healthy' | 'degraded' | 'down';
  previous: 'healthy' | 'degraded' | 'down';
}

// ─── Event Registry ───────────────────────────────────────────────────────

export type RafiqDomainEvent =
  // Wearable
  | RafiqEvent<'wearable.connected', WearableConnectedPayload>
  | RafiqEvent<'wearable.disconnected', WearableDisconnectedPayload>
  | RafiqEvent<'wearable.heartRate', WearableHeartRatePayload>
  | RafiqEvent<'wearable.spo2', WearableSpO2Payload>
  | RafiqEvent<'wearable.bloodPressure', WearableBloodPressurePayload>
  | RafiqEvent<'wearable.temperature', WearableTemperaturePayload>
  | RafiqEvent<'wearable.steps', WearableStepsPayload>
  | RafiqEvent<'wearable.sleep', WearableSleepPayload>
  | RafiqEvent<'wearable.fallDetected', WearableFallDetectedPayload>
  | RafiqEvent<'wearable.batteryLow', WearableBatteryLowPayload>
  | RafiqEvent<'wearable.connectionStateChanged', { deviceId?: string; previous: string; current: string; attempt: number }>

  // Health
  | RafiqEvent<'health.vitalsRecorded', HealthVitalsRecordedPayload>
  | RafiqEvent<'health.abnormalReading', HealthAbnormalReadingPayload>
  | RafiqEvent<'health.emergencyTriggered', HealthEmergencyTriggeredPayload>

  // Notifications
  | RafiqEvent<'notification.sent', NotificationSentPayload>
  | RafiqEvent<'notification.read', NotificationReadPayload>
  | RafiqEvent<'notification.delivered', NotificationDeliveredPayload>
  | RafiqEvent<'notification.failed', NotificationFailedPayload>
  | RafiqEvent<'notification.queueDepth', NotificationQueueDepthPayload>

  // Medication
  | RafiqEvent<'medication.taken', MedicationTakenPayload>
  | RafiqEvent<'medication.missed', MedicationMissedPayload>
  | RafiqEvent<'medication.lowStock', MedicationLowStockPayload>
  | RafiqEvent<'medication.refillDue', MedicationRefillDuePayload>

  // Device
  | RafiqEvent<'device.gasAlert', DeviceGasAlertPayload>
  | RafiqEvent<'device.offline', DeviceOfflinePayload>
  | RafiqEvent<'device.online', DeviceOnlinePayload>

  // Sync
  | RafiqEvent<'sync.started', SyncStartedPayload>
  | RafiqEvent<'sync.completed', SyncCompletedPayload>
  | RafiqEvent<'sync.failed', SyncFailedPayload>

  // AI
  | RafiqEvent<'ai.insight', AIInsightPayload>
  | RafiqEvent<'ai.warning', AIWarningPayload>
  | RafiqEvent<'ai.recommendation', AIRecommendationPayload>

  // System
  | RafiqEvent<'app.bootstrapStart', AppBootstrapStartPayload>
  | RafiqEvent<'app.bootstrapPhase', AppBootstrapPhasePayload>
  | RafiqEvent<'app.bootstrapComplete', AppBootstrapCompletePayload>
  | RafiqEvent<'system.error', SystemErrorPayload>
  | RafiqEvent<'circuitBreaker.stateChange', CircuitBreakerStateChangePayload>

  // Monitoring
  | RafiqEvent<'monitoring.startup', MonitoringStartupPayload>
  | RafiqEvent<'monitoring.frames', MonitoringFramesPayload>
  | RafiqEvent<'monitoring.syncSlow', MonitoringSyncSlowPayload>
  | RafiqEvent<'monitoring.bleUnstable', MonitoringBLEUnstablePayload>
  | RafiqEvent<'monitoring.realtimeHealth', MonitoringRealtimeHealthPayload>;
