/**
 * BLE / Wearable Service — unified facade
 *
 * Architecture:
 *   App → ble.service.ts → [ble.expo.ts | ble.native.ts]
 *
 * Lazy-loads native module so Expo Go never crashes.
 */
import Constants from 'expo-constants';
import type {
  WearableDevice,
  VitalsReading,
  WearableStatus,
  SignalQuality,
} from './ble.types';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

export { type WearableDevice, type VitalsReading, type WearableStatus, type SignalQuality };

// ─── Lazy facade ────────────────────────────────────────────────

let _delegate: {
  isSimulated: boolean;
  isAvailable: boolean;
  status: WearableStatus;
  scanForDevices: () => Promise<WearableDevice[]>;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  readVitals: () => Promise<VitalsReading>;
  onVitals: (cb: (v: VitalsReading) => void) => () => void;
  destroy: () => void;
  generateHistory?: (days?: number) => VitalsReading[];
} | null = null;

async function getDelegate() {
  if (_delegate) return _delegate;

  if (IS_EXPO_GO) {
    const { bleExpoService } = await import('./ble.expo');
    _delegate = bleExpoService;
  } else {
    const native = await import('./ble.native');
    _delegate = {
      isSimulated: false,
      isAvailable: false,
      status: {
        device: null,
        connectionState: 'idle',
        lastSync: null,
        batteryLevel: null,
        signalQuality: 'unknown',
        error: null,
      },
      scanForDevices: native.scanForDevices,
      connect: (id: string) => native.connect(id),
      disconnect: native.disconnect,
      readVitals: native.readVitals,
      onVitals: native.onVitals,
      destroy: native.destroy,
    };
  }

  return _delegate;
}

// ─── Public API ─────────────────────────────────────────────────

export const wearableService = {
  get isSimulated(): boolean {
    return IS_EXPO_GO;
  },

  get isNative(): boolean {
    return !IS_EXPO_GO;
  },

  async checkAvailability(): Promise<boolean> {
    const d = await getDelegate();
    return d ? d.isAvailable : !IS_EXPO_GO;
  },

  async scan(): Promise<WearableDevice[]> {
    const d = await getDelegate()!;
    return d.scanForDevices();
  },

  async connect(deviceId: string): Promise<void> {
    const d = await getDelegate()!;
    return d.connect(deviceId);
  },

  async disconnect(): Promise<void> {
    if (!_delegate) return;
    await _delegate.disconnect();
  },

  async readVitals(): Promise<VitalsReading> {
    const d = await getDelegate()!;
    return d.readVitals();
  },

  onVitals(callback: (v: VitalsReading) => void): () => void {
    if (!_delegate) {
      // If called before any delegate is loaded, set up a no-op
      return () => {};
    }
    return _delegate.onVitals(callback);
  },

  getStatus(): WearableStatus {
    return _delegate?.status ?? {
      device: null,
      connectionState: 'idle',
      lastSync: null,
      batteryLevel: null,
      signalQuality: 'unknown',
      error: null,
    };
  },

  destroy(): void {
    _delegate?.destroy();
    _delegate = null;
  },

  // Convenience: generate a history of readings (for charts)
  async generateHistory(days = 7): Promise<VitalsReading[]> {
    const d = await getDelegate()!;
    if ('generateHistory' in d && typeof d.generateHistory === 'function') {
      return d.generateHistory(days);
    }
    // Fallback: generate programmatically
    const readings: VitalsReading[] = [];
    for (let i = days - 1; i >= 0; i--) {
      readings.push({
        heart_rate: 70 + Math.round((Math.random() - 0.5) * 20),
        blood_pressure_systolic: 118 + Math.round((Math.random() - 0.5) * 20),
        blood_pressure_diastolic: 76 + Math.round((Math.random() - 0.5) * 16),
        oxygen_saturation: 97 + Math.round(Math.random() * 3),
        temperature: parseFloat((36.5 + (Math.random() - 0.5) * 0.8).toFixed(1)),
        timestamp: Date.now() - i * 24 * 60 * 60 * 1000,
      });
    }
    return readings;
  },
};

export default wearableService;