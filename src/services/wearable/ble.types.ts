/**
 * BLE / Wearable Types — cross-platform
 */
export type ConnectionState =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export type SignalQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

export interface WearableDevice {
  id: string;
  name: string;
  rssi?: number;
  signalQuality: SignalQuality;
  batteryLevel?: number;
  lastSeen: number;
  isConnected: boolean;
}

export interface VitalsReading {
  heart_rate: number;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  oxygen_saturation: number;
  temperature: number;
  steps?: number;
  sleep_hours?: number;
  timestamp: number;
}

export interface WearableStatus {
  device: WearableDevice | null;
  connectionState: ConnectionState;
  lastSync: number | null;
  batteryLevel: number | null;
  signalQuality: SignalQuality;
  error: string | null;
}

export interface WearableSession {
  deviceId: string;
  deviceName: string;
  startedAt: number;
  lastReading: number | null;
  readingCount: number;
  autoReconnect: boolean;
}

// Heart Rate Service UUIDs (standard BLE)
export const HR_SERVICE_UUID = '180d';
export const HR_MEASUREMENT_UUID = '2a37';

// Blood Pressure Service UUIDs
export const BP_SERVICE_UUID = '1810';
export const BP_MEASUREMENT_UUID = '2a35';

// Device Information Service
export const DEVICE_INFO_UUID = '180a';
export const BATTERY_SERVICE_UUID = '180f';
export const BATTERY_LEVEL_UUID = '2a19';