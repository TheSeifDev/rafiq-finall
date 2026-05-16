/**
 * Wearable Ingestion Service — Validation & Normalization
 */

import type {
  WearableProvider,
  WearableVitalsInsert,
  SleepStages,
} from '../../types/wearable';
import { generateId } from '../../lib/database/helpers';

interface RawProviderData {
  timestamp: string;
  heart_rate?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  oxygen_saturation?: number;
  temperature?: number;
  steps?: number;
  sleep_seconds?: number;
  sleep_deep?: number;
  sleep_light?: number;
  sleep_rem?: number;
  sleep_awake?: number;
  activity_calories?: number;
}

class WearableIngestionService {
  validateAndNormalize(
    data: RawProviderData,
    provider: WearableProvider
  ): WearableVitalsInsert | null {
    // Validate timestamp
    if (!data.timestamp || !this.isValidTimestamp(data.timestamp)) {
      return null;
    }

    // Reject impossible values
    if (!this.isValidVitals(data)) {
      return null;
    }

    const now = new Date().toISOString();
    const deviceId = `device_${Date.now()}`;

    // Normalize values
    const heartRate = data.heart_rate !== undefined
      ? this.normalizeHeartRate(data.heart_rate)
      : null;

    const bloodPressureSystolic = data.blood_pressure_systolic !== undefined
      ? this.normalizeBloodPressure(data.blood_pressure_systolic, 'systolic')
      : null;

    const bloodPressureDiastolic = data.blood_pressure_diastolic !== undefined
      ? this.normalizeBloodPressure(data.blood_pressure_diastolic, 'diastolic')
      : null;

    const oxygenSaturation = data.oxygen_saturation !== undefined
      ? this.normalizeSpO2(data.oxygen_saturation)
      : null;

    const temperature = data.temperature !== undefined
      ? this.normalizeTemperature(data.temperature)
      : null;

    const steps = data.steps !== undefined
      ? this.normalizeSteps(data.steps)
      : null;

    const sleepSeconds = data.sleep_seconds !== undefined
      ? this.normalizeSleep(data.sleep_seconds)
      : null;

    return {
      id: generateId(),
      user_id: '', // Set by caller
      patient_id: null,
      provider,
      heart_rate: heartRate,
      blood_pressure_systolic: bloodPressureSystolic,
      blood_pressure_diastolic: bloodPressureDiastolic,
      oxygen_saturation: oxygenSaturation,
      temperature,
      steps,
      sleep_seconds: sleepSeconds,
      activity_calories: data.activity_calories ?? null,
      recorded_at: data.timestamp,
      synced_to_cloud: 0,
      version: 1,
      updated_at: now,
      updated_by_device: deviceId,
      is_deleted: 0,
      deleted_at: null,
      deleted_by: null,
    };
  }

  private isValidTimestamp(timestamp: string): boolean {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

      return date >= oneYearAgo && date <= now;
    } catch {
      return false;
    }
  }

  private isValidVitals(data: RawProviderData): boolean {
    // Heart rate: 30-220 bpm
    if (data.heart_rate !== undefined && (data.heart_rate < 30 || data.heart_rate > 220)) {
      return false;
    }

    // Blood pressure: systolic 70-250, diastolic 40-150
    if (data.blood_pressure_systolic !== undefined && (data.blood_pressure_systolic < 70 || data.blood_pressure_systolic > 250)) {
      return false;
    }
    if (data.blood_pressure_diastolic !== undefined && (data.blood_pressure_diastolic < 40 || data.blood_pressure_diastolic > 150)) {
      return false;
    }

    // SpO2: 70-100%
    if (data.oxygen_saturation !== undefined && (data.oxygen_saturation < 70 || data.oxygen_saturation > 100)) {
      return false;
    }

    // Temperature: 30-45°C
    if (data.temperature !== undefined && (data.temperature < 30 || data.temperature > 45)) {
      return false;
    }

    // Steps: 0-100000
    if (data.steps !== undefined && (data.steps < 0 || data.steps > 100000)) {
      return false;
    }

    // Sleep: 0-24 hours
    if (data.sleep_seconds !== undefined && (data.sleep_seconds < 0 || data.sleep_seconds > 86400)) {
      return false;
    }

    return true;
  }

  normalizeHeartRate(value: number): number | null {
    if (value === null || value === undefined) return null;
    const clamped = Math.max(30, Math.min(220, Math.round(value)));
    return clamped;
  }

  normalizeBloodPressure(value: number, type: 'systolic' | 'diastolic'): number | null {
    if (value === null || value === undefined) return null;

    if (type === 'systolic') {
      return Math.max(70, Math.min(250, Math.round(value)));
    }
    return Math.max(40, Math.min(150, Math.round(value)));
  }

  normalizeSpO2(value: number): number | null {
    if (value === null || value === undefined) return null;
    return Math.max(70, Math.min(100, Math.round(value)));
  }

  normalizeTemperature(value: number): number | null {
    if (value === null || value === undefined) return null;
    return Math.max(30, Math.min(45, Math.round(value * 10) / 10));
  }

  normalizeSteps(value: number): number | null {
    if (value === null || value === undefined) return null;
    return Math.max(0, Math.min(100000, Math.round(value)));
  }

  normalizeSleep(seconds: number): number | null {
    if (seconds === null || seconds === undefined) return null;
    return Math.max(0, Math.min(86400, Math.round(seconds)));
  }

  computeSleepStages(data: RawProviderData): SleepStages | null {
    const deep = data.sleep_deep ?? 0;
    const light = data.sleep_light ?? 0;
    const rem = data.sleep_rem ?? 0;
    const awake = data.sleep_awake ?? 0;
    const total = deep + light + rem + awake;

    if (total === 0) return null;

    return {
      deep: Math.round((deep / total) * 100),
      light: Math.round((light / total) * 100),
      rem: Math.round((rem / total) * 100),
      awake: Math.round((awake / total) * 100),
      total: total,
    };
  }
}

export const wearableIngestionService = new WearableIngestionService();