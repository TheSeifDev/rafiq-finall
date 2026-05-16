/**
 * Wearable Service — Real Open Wearables Integration (Facade)
 * Maintains backward compatibility while using real providers
 */

import { wearableService } from './wearable.service';
import type {
  WearableProvider,
  WearableConnection,
  WearableVitals,
  WearableSyncStatus,
} from '../../types/wearable';

// Export types for backward compatibility
export type WearableDevice = {
  id: string;
  name: string;
  provider: WearableProvider;
  isConnected: boolean;
  lastSync: string | null;
  batteryLevel?: number | null;
  signalQuality?: SignalQuality;
};

export type VitalsReading = {
  heart_rate: number;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  oxygen_saturation: number;
  temperature: number;
  steps?: number;
  sleep_hours?: number;
  timestamp: number;
};

export type WearableStatus = {
  device: WearableDevice | null;
  connectionState: 'idle' | 'connected' | 'disconnected';
  lastSync: string | null;
  batteryLevel: number | null;
  error: string | null;
};

export type SignalQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

// Re-export wearable service methods
export async function scan(): Promise<WearableDevice[]> {
  const providers = await wearableService.getProviders();
  const connections = await wearableService.getActiveConnections();

  return connections.map((conn) => ({
    id: conn.id,
    name: getProviderDisplayName(conn.provider),
    provider: conn.provider,
    isConnected: conn.isActive,
    lastSync: conn.lastSyncAt,
    batteryLevel: null,
    signalQuality: 'good' as SignalQuality,
  }));
}

export async function connect(providerOrId?: string, userId?: string): Promise<string> {
  // Backward compatibility: if called with single arg (device ID), return URL for first provider
  // New API: connect(provider, userId) returns OAuth URL
  if (providerOrId && !userId) {
    // Old-style call with device ID - return OAuth URL for first provider
    return `https://api.rafiq.example/oauth/apple_health/init`;
  }
  // New-style call
  const provider = providerOrId as WearableProvider;
  return `https://api.rafiq.example/oauth/${provider}/init`;
}

export async function disconnect(providerOrId?: string, userId?: string): Promise<void> {
  // Backward compatibility: if called with no args, disconnect from all
  // New API: disconnect(provider, userId)
  if (!providerOrId || !userId) {
    // Disconnect from all active connections (for backward compat)
    const connections = await wearableService.getActiveConnections();
    for (const conn of connections) {
      await wearableService.disconnect(conn.provider, conn.userId);
    }
    return;
  }
  await wearableService.disconnect(providerOrId as WearableProvider, userId);
}

export async function readVitals(userId: string): Promise<VitalsReading> {
  const vitals = await wearableService.getLatestVitals(userId);
  if (!vitals) {
    throw new Error('No vitals available');
  }

  return {
    heart_rate: vitals.heartRate ?? 0,
    blood_pressure_systolic: vitals.bloodPressureSystolic ?? 0,
    blood_pressure_diastolic: vitals.bloodPressureDiastolic ?? 0,
    oxygen_saturation: vitals.oxygenSaturation ?? 0,
    temperature: vitals.temperature ?? 0,
    steps: vitals.steps ?? undefined,
    sleep_hours: vitals.sleepSeconds ? vitals.sleepSeconds / 3600 : undefined,
    timestamp: new Date(vitals.recordedAt).getTime(),
  };
}

export async function sync(provider: WearableProvider): Promise<number> {
  return wearableService.syncProvider(provider);
}

export function getProviders(): WearableProvider[] {
  return [
    'apple_health',
    'health_connect',
    'samsung_health',
    'garmin',
    'fitbit',
    'oura',
    'polar',
    'suunto',
  ];
}

export async function isConnected(provider: WearableProvider): Promise<boolean> {
  return wearableService.isProviderConnected(provider);
}

export async function getSyncStatus(userId: string): Promise<WearableSyncStatus[]> {
  return wearableService.getSyncStatus(userId);
}

export async function generateHistory(userId: string, days: number = 7): Promise<VitalsReading[]> {
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const vitals = await wearableService.getVitals(userId, startDate, endDate);

  return vitals.map((v) => ({
    heart_rate: v.heartRate ?? 0,
    blood_pressure_systolic: v.bloodPressureSystolic ?? 0,
    blood_pressure_diastolic: v.bloodPressureDiastolic ?? 0,
    oxygen_saturation: v.oxygenSaturation ?? 0,
    temperature: v.temperature ?? 0,
    steps: v.steps ?? undefined,
    sleep_hours: v.sleepSeconds ? v.sleepSeconds / 3600 : undefined,
    timestamp: new Date(v.recordedAt).getTime(),
  }));
}

function getProviderDisplayName(provider: WearableProvider): string {
  const names: Record<WearableProvider, string> = {
    apple_health: 'Apple Health',
    health_connect: 'Health Connect',
    samsung_health: 'Samsung Health',
    garmin: 'Garmin',
    fitbit: 'Fitbit',
    oura: 'Oura',
    polar: 'Polar',
    suunto: 'Suunto',
    strava: 'Strava',
  };
  return names[provider];
}

// For backward compatibility - always use real data now
export const isSimulated = false;
export const isAvailable = true;