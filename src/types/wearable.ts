/**
 * Wearable Types — Real Provider Integration
 * Supports: Apple Health, Health Connect, Samsung Health, Garmin, Fitbit, Oura, Polar, Suunto
 */

export type WearableProvider =
  | 'apple_health'
  | 'health_connect'
  | 'samsung_health'
  | 'garmin'
  | 'fitbit'
  | 'oura'
  | 'polar'
  | 'suunto'
  | 'strava';

// Backward compatibility type alias
export type ProviderType = WearableProvider;

// Signal quality type for UI
export type SignalQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

// Device type for UI
export interface WearableDevice {
  id: string;
  name: string;
  provider: WearableProvider;
  isConnected: boolean;
  lastSync: string | null;
  batteryLevel?: number;
  signalQuality?: SignalQuality;
}

// Vitals reading type for UI
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

export type ConnectionStatus =
  | 'idle'
  | 'authenticating'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'syncing';

export interface WearableConnection {
  id: string;
  userId: string;
  provider: WearableProvider;
  providerDeviceId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  connectedAt: string;
  lastSyncAt: string | null;
  isActive: boolean;
  version: number;
  updatedAt: string;
  updatedByDevice: string;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface WearableVitals {
  id: string;
  userId: string;
  patientId: string | null;
  provider: WearableProvider;
  heartRate: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  oxygenSaturation: number | null;
  temperature: number | null;
  steps: number | null;
  sleepSeconds: number | null;
  sleepStages: SleepStages | null;
  activityCalories: number | null;
  recordedAt: string;
  syncedToCloud: boolean;
  version: number;
  updatedAt: string;
  updatedByDevice: string;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface SleepStages {
  deep: number;
  light: number;
  rem: number;
  awake: number;
  total: number;
}

export interface WearableSyncStatus {
  provider: WearableProvider;
  lastSyncAt: string | null;
  status: ConnectionStatus;
  recordCount: number;
  errorMessage: string | null;
}

export interface ProviderAuthConfig {
  provider: WearableProvider;
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

// DTOs for SQLite operations
export interface WearableConnectionInsert {
  id: string;
  user_id: string;
  provider: string;
  provider_device_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  connected_at: string;
  last_sync: string | null;
  is_active: number;
  version: number;
  updated_at: string;
  updated_by_device: string;
  is_deleted: number;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface WearableVitalsInsert {
  id: string;
  user_id: string;
  patient_id: string | null;
  provider: string;
  heart_rate: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  oxygen_saturation: number | null;
  temperature: number | null;
  steps: number | null;
  sleep_seconds: number | null;
  activity_calories: number | null;
  recorded_at: string;
  synced_to_cloud: number;
  version: number;
  updated_at: string;
  updated_by_device: string;
  is_deleted: number;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface WearableSyncQueueInsert {
  id: string;
  user_id: string;
  payload: string;
  operation: string;
  entity_type: string;
  entity_id: string;
  attempts: number;
  max_attempts: number;
  last_attempt: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

// Provider capabilities
export interface ProviderCapabilities {
  provider: WearableProvider;
  supportsHeartRate: boolean;
  supportsBloodPressure: boolean;
  supportsSpO2: boolean;
  supportsTemperature: boolean;
  supportsSteps: boolean;
  supportsSleep: boolean;
  supportsActivity: boolean;
  requiresServerAuth: boolean;
}

export const PROVIDER_CAPABILITIES: Record<WearableProvider, ProviderCapabilities> = {
  apple_health: {
    provider: 'apple_health',
    supportsHeartRate: true,
    supportsBloodPressure: false,
    supportsSpO2: true,
    supportsTemperature: true,
    supportsSteps: true,
    supportsSleep: true,
    supportsActivity: true,
    requiresServerAuth: true,
  },
  health_connect: {
    provider: 'health_connect',
    supportsHeartRate: true,
    supportsBloodPressure: true,
    supportsSpO2: true,
    supportsTemperature: true,
    supportsSteps: true,
    supportsSleep: true,
    supportsActivity: true,
    requiresServerAuth: false,
  },
  samsung_health: {
    provider: 'samsung_health',
    supportsHeartRate: true,
    supportsBloodPressure: true,
    supportsSpO2: true,
    supportsTemperature: false,
    supportsSteps: true,
    supportsSleep: true,
    supportsActivity: true,
    requiresServerAuth: true,
  },
  garmin: {
    provider: 'garmin',
    supportsHeartRate: true,
    supportsBloodPressure: false,
    supportsSpO2: true,
    supportsTemperature: false,
    supportsSteps: true,
    supportsSleep: true,
    supportsActivity: true,
    requiresServerAuth: true,
  },
  fitbit: {
    provider: 'fitbit',
    supportsHeartRate: true,
    supportsBloodPressure: false,
    supportsSpO2: true,
    supportsTemperature: false,
    supportsSteps: true,
    supportsSleep: true,
    supportsActivity: true,
    requiresServerAuth: true,
  },
  oura: {
    provider: 'oura',
    supportsHeartRate: true,
    supportsBloodPressure: false,
    supportsSpO2: false,
    supportsTemperature: true,
    supportsSteps: false,
    supportsSleep: true,
    supportsActivity: true,
    requiresServerAuth: true,
  },
  polar: {
    provider: 'polar',
    supportsHeartRate: true,
    supportsBloodPressure: false,
    supportsSpO2: true,
    supportsTemperature: false,
    supportsSteps: true,
    supportsSleep: false,
    supportsActivity: true,
    requiresServerAuth: true,
  },
  suunto: {
    provider: 'suunto',
    supportsHeartRate: true,
    supportsBloodPressure: false,
    supportsSpO2: false,
    supportsTemperature: false,
    supportsSteps: true,
    supportsSleep: true,
    supportsActivity: true,
    requiresServerAuth: true,
  },
  strava: {
    provider: 'strava',
    supportsHeartRate: true,
    supportsBloodPressure: false,
    supportsSpO2: false,
    supportsTemperature: false,
    supportsSteps: false,
    supportsSleep: false,
    supportsActivity: true,
    requiresServerAuth: true,
  },
};