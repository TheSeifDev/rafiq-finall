/**
 * RAFIQ Health Monitor — Device & Sensor State Tracking
 *
 * Monitors:
 * - Device heartbeat (last seen from wearable)
 * - Wearable online/offline state
 * - Connection quality (RSSI trends)
 * - Stale sensor detection (no data for too long)
 * - Sync timeout detection
 * - Emergency escalation readiness
 */
import { eventBus } from '../events/EventBus';

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

export interface DeviceHealthState {
  deviceId: string | null;
  deviceName: string | null;
  status: HealthStatus;
  lastSeen: number | null;
  lastSync: number | null;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  staleSeconds: number | null;
  staleThreshold: number;
  alerts: HealthAlert[];
  isEmergencyReady: boolean;
}

export interface HealthAlert {
  id: string;
  level: 'warning' | 'critical';
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

// Thresholds (configurable)
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes without data = stale
const CRITICAL_STALE_MS = 15 * 60 * 1000; // 15 minutes = critical
const SYNC_TIMEOUT_MS = 10 * 60 * 1000;   // 10 minutes without sync = sync timeout

class HealthMonitor {
  private _state: DeviceHealthState = {
    deviceId: null,
    deviceName: null,
    status: 'unknown',
    lastSeen: null,
    lastSync: null,
    connectionQuality: 'unknown',
    staleSeconds: null,
    staleThreshold: STALE_THRESHOLD_MS,
    alerts: [],
    isEmergencyReady: false,
  };

  private _healthTimer: ReturnType<typeof setInterval> | null = null;
  private _subscribers: ((state: DeviceHealthState) => void)[] = [];
  private _initialized = false;

  get state(): DeviceHealthState {
    return { ...this._state };
  }

  /**
   * Start health monitoring. Call once on app boot.
   */
  start(): void {
    if (this._initialized) return;
    this._initialized = true;

    this._healthTimer = setInterval(() => {
      this._evaluateHealth();
    }, 30_000); // Check every 30 seconds

    // Subscribe to event bus events
    eventBus.on('wearable.connected', this._handleConnected.bind(this));
    eventBus.on('wearable.disconnected', this._handleDisconnected.bind(this));
    eventBus.on('wearable.heartRate', this._handleVitals.bind(this));
    eventBus.on('wearable.spo2', this._handleVitals.bind(this));
    eventBus.on('wearable.bloodPressure', this._handleVitals.bind(this));
    eventBus.on('wearable.temperature', this._handleVitals.bind(this));
    eventBus.on('sync.completed', this._handleSync.bind(this));

    this._notifySubscribers();
  }

  /**
   * Stop monitoring and cleanup.
   */
  stop(): void {
    if (this._healthTimer) {
      clearInterval(this._healthTimer);
      this._healthTimer = null;
    }
    eventBus.off('wearable.connected');
    eventBus.off('wearable.disconnected');
    eventBus.off('wearable.heartRate');
    eventBus.off('wearable.spo2');
    eventBus.off('wearable.bloodPressure');
    eventBus.off('sync.completed');
    this._initialized = false;
    this._notifySubscribers();
  }

  /**
   * Subscribe to health state changes.
   */
  subscribe(callback: (state: DeviceHealthState) => void): () => void {
    this._subscribers.push(callback);
    // Immediately send current state
    callback(this._state);
    return () => {
      const idx = this._subscribers.indexOf(callback);
      if (idx !== -1) this._subscribers.splice(idx, 1);
    };
  }

  /**
   * Update device connection info.
   */
  setDevice(deviceId: string, deviceName: string): void {
    this._state.deviceId = deviceId;
    this._state.deviceName = deviceName;
    this._state.isEmergencyReady = true;
    this._state.status = this._state.lastSeen ? 'healthy' : 'degraded';
    this._addAlert('warning', `Wearable connected: ${deviceName}`);
    this._notifySubscribers();
  }

  /**
   * Acknowledge a health alert.
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this._state.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this._notifySubscribers();
    }
  }

  /**
   * Clear all acknowledged alerts.
   */
  clearAcknowledgedAlerts(): void {
    this._state.alerts = this._state.alerts.filter(a => !a.acknowledged);
    this._notifySubscribers();
  }

  // ── Private ────────────────────────────────────────────────

  private _handleConnected(event: any): void {
    this.setDevice(event.payload.deviceId, event.payload.deviceName);
  }

  private _handleDisconnected(event: any): void {
    this._state.isEmergencyReady = false;
    this._state.status = 'degraded';
    this._addAlert('warning', event.payload.reason ?? 'Wearable disconnected');
    this._notifySubscribers();
  }

  private _handleVitals(event: any): void {
    const now = Date.now();
    this._state.lastSeen = now;
    this._state.staleSeconds = null;

    // Quality based on signal if available
    if (event.payload.rssi) {
      this._state.connectionQuality = this._rssiToQuality(event.payload.rssi);
    }

    this._state.status = 'healthy';
    this._pruneStaleAlerts();
    this._notifySubscribers();
  }

  private _handleSync(event: any): void {
    const now = Date.now();
    this._state.lastSync = now;

    if (event.payload?.failed > 0) {
      this._addAlert('warning', `Sync had ${event.payload.failed} failures`);
    }

    this._notifySubscribers();
  }

  private _evaluateHealth(): void {
    const now = Date.now();

    if (!this._state.lastSeen) {
      this._state.status = this._state.deviceId ? 'degraded' : 'unknown';
      return;
    }

    const staleMs = now - this._state.lastSeen;
    this._state.staleSeconds = Math.floor(staleMs / 1000);

    if (staleMs >= CRITICAL_STALE_MS) {
      if (this._state.status !== 'critical') {
        this._state.status = 'critical';
        this._addAlert('critical', 'Wearable data is critically stale (> 15 minutes)');
        this._emitEmergencyIfNeeded();
      }
    } else if (staleMs >= STALE_THRESHOLD_MS) {
      if (this._state.status !== 'degraded') {
        this._state.status = 'degraded';
        this._addAlert('warning', 'Wearable data is stale (> 5 minutes)');
      }
    } else {
      this._state.status = 'healthy';
      this._pruneStaleAlerts();
    }

    // Sync timeout check
    if (this._state.lastSync && now - this._state.lastSync > SYNC_TIMEOUT_MS) {
      const syncStale = this._state.alerts.find(a => a.message.includes('Sync timeout'));
      if (!syncStale) {
        this._addAlert('warning', 'Data sync is delayed');
      }
    }

    this._notifySubscribers();
  }

  private _addAlert(level: 'warning' | 'critical', message: string): void {
    // Avoid duplicate alerts
    if (this._state.alerts.some(a => a.message === message && !a.acknowledged)) return;

    const alert: HealthAlert = {
      id: `health_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      level,
      message,
      timestamp: Date.now(),
      acknowledged: false,
    };

    this._state.alerts = [alert, ...this._state.alerts].slice(0, 10);
  }

  private _pruneStaleAlerts(): void {
    // Remove acknowledged alerts older than 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this._state.alerts = this._state.alerts.filter(
      a => !a.acknowledged || a.timestamp > oneHourAgo
    );
  }

  private _emitEmergencyIfNeeded(): void {
    eventBus.emit({
      type: 'health.abnormalReading',
      source: 'system',
      timestamp: Date.now(),
      payload: {
        patientId: '',
        vital: 'wearable_stale',
        value: 0,
        threshold: STALE_THRESHOLD_MS,
        severity: 'critical',
      },
      metadata: { severity: 'critical', category: 'health' },
    });
  }

  private _notifySubscribers(): void {
    const state = this._state;
    for (const cb of this._subscribers) {
      try { cb(state); } catch { /* ignore */ }
    }
  }

  private _rssiToQuality(rssi: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (rssi >= -50) return 'excellent';
    if (rssi >= -60) return 'good';
    if (rssi >= -70) return 'fair';
    return 'poor';
  }
}

export const healthMonitor = new HealthMonitor();