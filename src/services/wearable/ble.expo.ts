/**
 * BLE Service — Expo Go safe mock
 *
 * Provides a medically-coherent simulation that is consistent
 * with a fixed persona across all readings in a session.
 * Zero native module imports — will NEVER crash in Expo Go.
 */
import type {
  WearableDevice,
  VitalsReading,
  WearableStatus,
  SignalQuality,
} from './ble.types';

function rssiToQuality(rssi: number): SignalQuality {
  if (rssi >= -50) return 'excellent';
  if (rssi >= -60) return 'good';
  if (rssi >= -70) return 'fair';
  return 'poor';
}

// ─── Persona-based simulator ──────────────────────────────────

interface Persona {
  baseHR: number;
  baseSystolic: number;
  baseDiastolic: number;
  baseSpo2: number;
  baseTemp: number;
}

function createPersona(): Persona {
  const profiles: Persona[] = [
    { baseHR: 72, baseSystolic: 118, baseDiastolic: 76, baseSpo2: 98, baseTemp: 36.6 },
    { baseHR: 68, baseSystolic: 122, baseDiastolic: 80, baseSpo2: 97, baseTemp: 36.5 },
    { baseHR: 76, baseSystolic: 115, baseDiastolic: 74, baseSpo2: 99, baseTemp: 36.7 },
    { baseHR: 80, baseSystolic: 125, baseDiastolic: 82, baseSpo2: 97, baseTemp: 36.4 },
    { baseHR: 74, baseSystolic: 120, baseDiastolic: 78, baseSpo2: 98, baseTemp: 36.8 },
  ];
  return profiles[Math.floor(Math.random() * profiles.length)];
}

function drift(base: number, range: number): number {
  return Math.round(base + (Math.random() - 0.5) * 2 * range);
}

// ─── BLE Expo Service ──────────────────────────────────────────

export class BLEExpoService {
  private _persona: Persona;
  private _connectedDevice: WearableDevice | null = null;
  private _sessionStart: number | null = null;
  private _readingCount = 0;
  private _lastReading: number | null = null;
  private _error: string | null = null;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _onVitalsCallback: ((v: VitalsReading) => void) | null = null;

  constructor() {
    this._persona = createPersona();
  }

  get isSimulated(): boolean {
    return true;
  }

  get isAvailable(): boolean {
    return false; // No real BLE in Expo Go
  }

  get status(): WearableStatus {
    return {
      device: this._connectedDevice,
      connectionState: this._connectedDevice ? 'connected' : 'idle',
      lastSync: this._lastReading,
      batteryLevel: this._connectedDevice?.batteryLevel ?? null,
      signalQuality: this._connectedDevice
        ? rssiToQuality(this._connectedDevice.rssi ?? -60)
        : 'unknown',
      error: this._error,
    };
  }

  async scanForDevices(): Promise<WearableDevice[]> {
    this._error = null;
    await sleep(1800);
    return [
      {
        id: 'hband-gt5-001',
        name: 'HBand GT5 Pro',
        rssi: -42,
        signalQuality: 'excellent',
        batteryLevel: 78,
        lastSeen: Date.now(),
        isConnected: false,
      },
    ];
  }

  async connect(deviceId: string): Promise<void> {
    this._error = null;
    await sleep(1000);

    this._connectedDevice = {
      id: deviceId,
      name: 'HBand GT5 Pro',
      rssi: -42,
      signalQuality: 'excellent',
      batteryLevel: 78,
      lastSeen: Date.now(),
      isConnected: true,
    };
    this._sessionStart = Date.now();
    this._readingCount = 0;

    // Start heartbeat simulation (vitals trickle in every 5s)
    this._heartbeatTimer = setInterval(() => {
      if (this._connectedDevice && this._onVitalsCallback) {
        const reading = this.generateReading();
        this._onVitalsCallback(reading);
        this._lastReading = Date.now();
        this._readingCount++;
      }
    }, 5000);
  }

  async disconnect(): Promise<void> {
    this._stopHeartbeat();
    this._connectedDevice = null;
    this._sessionStart = null;
    this._readingCount = 0;
    this._lastReading = null;
    this._error = null;
  }

  async readVitals(): Promise<VitalsReading> {
    if (!this._connectedDevice) {
      throw new Error('No smartwatch connected');
    }

    const reading = this.generateReading();
    this._lastReading = Date.now();
    this._readingCount++;
    this._connectedDevice.lastSeen = Date.now();
    return reading;
  }

  generateHistory(days = 7): VitalsReading[] {
    const p = this._persona;
    const readings: VitalsReading[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const ts = Date.now() - i * 24 * 60 * 60 * 1000;
      const dayBias = (i - days / 2) * 0.4;
      readings.push({
        heart_rate: Math.max(55, Math.min(100, drift(p.baseHR + dayBias, 3))),
        blood_pressure_systolic: Math.max(100, Math.min(140, drift(p.baseSystolic + dayBias * 0.8, 4))),
        blood_pressure_diastolic: Math.max(60, Math.min(90, drift(p.baseDiastolic + dayBias * 0.5, 3))),
        oxygen_saturation: Math.min(100, Math.max(95, drift(p.baseSpo2, 1))),
        temperature: parseFloat((p.baseTemp + (Math.random() - 0.5) * 0.3).toFixed(1)),
        timestamp: ts,
      });
    }
    return readings;
  }

  onVitals(callback: (v: VitalsReading) => void): () => void {
    this._onVitalsCallback = callback;
    return () => {
      this._onVitalsCallback = null;
    };
  }

  private generateReading(): VitalsReading {
    const p = this._persona;
    return {
      heart_rate: Math.max(55, Math.min(100, drift(p.baseHR, 4))),
      blood_pressure_systolic: Math.max(100, Math.min(140, drift(p.baseSystolic, 5))),
      blood_pressure_diastolic: Math.max(60, Math.min(90, drift(p.baseDiastolic, 4))),
      oxygen_saturation: Math.min(100, Math.max(95, drift(p.baseSpo2, 1))),
      temperature: parseFloat((p.baseTemp + (Math.random() - 0.5) * 0.4).toFixed(1)),
      timestamp: Date.now(),
    };
  }

  private _stopHeartbeat(): void {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  destroy(): void {
    this._stopHeartbeat();
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._connectedDevice = null;
    this._onVitalsCallback = null;
    this._error = null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const bleExpoService = new BLEExpoService();