/**
 * Bluetooth / Smartwatch Service — Expo Go Safe
 *
 * BLE (react-native-ble-plx) requires native modules unavailable in
 * Expo Go. This service detects the environment and provides:
 *
 *   • Expo Go  → medically-coherent simulated readings
 *   • Dev build → real BLE (future, behind dynamic require)
 *
 * Zero crash paths in any environment.
 */
import Constants from 'expo-constants';

// ─── Environment ────────────────────────────────────────────

const IS_EXPO_GO = Constants.appOwnership === 'expo';

// ─── Types ──────────────────────────────────────────────────

export interface SmartWatchDevice {
  id: string;
  name: string;
  rssi?: number;
}

export interface VitalsReading {
  heart_rate: number;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  oxygen_saturation: number;
  temperature: number;
}

export type ConnectionState = 'idle' | 'scanning' | 'connecting' | 'connected' | 'error';

// ─── Persona-based simulator ────────────────────────────────
// Instead of pure random values, we use a fixed "persona" for
// the session so all readings are internally consistent (like
// a real patient). Values drift slightly each read.

interface Persona {
  baseHR: number;
  baseSystolic: number;
  baseDiastolic: number;
  baseSpo2: number;
  baseTemp: number;
}

function createPersona(): Persona {
  // Pick a realistic resting profile (healthy adult)
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

// ─── Service ────────────────────────────────────────────────

export class BluetoothService {
  private _state: ConnectionState = 'idle';
  private _connectedDevice: SmartWatchDevice | null = null;
  private _persona: Persona = createPersona();

  get isSimulated(): boolean {
    return IS_EXPO_GO;
  }

  get state(): ConnectionState {
    return this._state;
  }

  get connectedDevice(): SmartWatchDevice | null {
    return this._connectedDevice;
  }

  /**
   * Scan for nearby smartwatch devices.
   */
  async scanForDevices(): Promise<SmartWatchDevice[]> {
    this._state = 'scanning';

    if (IS_EXPO_GO) {
      await sleep(1800);
      this._state = 'idle';
      return [
        { id: 'hband-gt5-001', name: 'HBand GT5 Pro', rssi: -42 },
      ];
    }

    // Dev build: attempt real BLE
    try {
      const BLE = safeRequireBLE();
      if (BLE) return await scanWithRealBLE(BLE);
    } catch { /* fall through */ }

    await sleep(1800);
    this._state = 'idle';
    return [{ id: 'hband-gt5-001', name: 'HBand GT5 Pro', rssi: -42 }];
  }

  /**
   * Connect to a discovered device.
   */
  async connectToDevice(deviceId: string): Promise<void> {
    this._state = 'connecting';

    if (IS_EXPO_GO) {
      await sleep(1000);
      this._connectedDevice = { id: deviceId, name: 'HBand GT5 Pro' };
      this._state = 'connected';
      return;
    }

    try {
      const BLE = safeRequireBLE();
      if (BLE) {
        await connectWithRealBLE(BLE, deviceId);
        this._connectedDevice = { id: deviceId, name: 'Smartwatch' };
        this._state = 'connected';
        return;
      }
    } catch { /* fall through */ }

    await sleep(1000);
    this._connectedDevice = { id: deviceId, name: 'HBand GT5 Pro' };
    this._state = 'connected';
  }

  /**
   * Read vitals — persona-consistent with small drift.
   */
  async readVitals(): Promise<VitalsReading> {
    const p = this._persona;
    return {
      heart_rate: drift(p.baseHR, 4),
      blood_pressure_systolic: drift(p.baseSystolic, 5),
      blood_pressure_diastolic: drift(p.baseDiastolic, 4),
      oxygen_saturation: Math.min(100, Math.max(95, drift(p.baseSpo2, 1))),
      temperature: parseFloat((p.baseTemp + (Math.random() - 0.5) * 0.4).toFixed(1)),
    };
  }

  /**
   * Generate a coherent 7-day history for the chart.
   * Each day's values are persona-consistent with a slow trend.
   */
  generateHistory(): VitalsReading[] {
    const p = this._persona;
    const days: VitalsReading[] = [];
    for (let i = 6; i >= 0; i--) {
      // Slight daily trend (e.g. HR slowly drifts over the week)
      const dayBias = (i - 3) * 0.5;
      days.push({
        heart_rate: drift(p.baseHR + dayBias, 3),
        blood_pressure_systolic: drift(p.baseSystolic + dayBias * 0.8, 4),
        blood_pressure_diastolic: drift(p.baseDiastolic + dayBias * 0.5, 3),
        oxygen_saturation: Math.min(100, Math.max(95, drift(p.baseSpo2, 1))),
        temperature: parseFloat((p.baseTemp + (Math.random() - 0.5) * 0.3).toFixed(1)),
      });
    }
    return days;
  }

  async disconnect(): Promise<void> {
    this._connectedDevice = null;
    this._state = 'idle';
  }

  destroy(): void {
    this._connectedDevice = null;
    this._state = 'idle';
  }
}

// ─── Helpers ────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function safeRequireBLE(): any | null {
  try {
    return require('react-native-ble-plx');
  } catch {
    return null;
  }
}

async function scanWithRealBLE(_BLE: any): Promise<SmartWatchDevice[]> {
  // TODO: Implement with BleManager when using dev build
  return [];
}

async function connectWithRealBLE(_BLE: any, _id: string): Promise<void> {
  // TODO: Implement with BleManager when using dev build
}
