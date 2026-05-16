/**
 * HealthConnectService — Android Health Connect integration.
 *
 * REAL DATA ONLY: No fake vitals, no Math.random(), no mock readings.
 *
 * Architecture:
 *   Oraimo Watch → Oraimo Health app → Android Health Connect → RAFIQ
 *
 * Requires:
 *   - react-native-health-connect
 *   - Expo Dev Build (NOT Expo Go)
 *   - Android 9+ with Health Connect installed
 *
 * Install: npm install react-native-health-connect
 */

import type { VitalsRecord } from '../vitals.service';

// ── Availability ──────────────────────────────────────────────

export type HealthConnectStatus =
  | 'available'
  | 'not_installed'
  | 'not_supported'
  | 'unknown';

export type PermissionStatus = 'granted' | 'denied' | 'not_asked';

export interface HealthConnectState {
  status: HealthConnectStatus;
  permissions: Record<HealthPermission, PermissionStatus>;
  lastSyncAt: string | null;
  recordCount: number;
}

export type HealthPermission =
  | 'HeartRate'
  | 'Steps'
  | 'OxygenSaturation'
  | 'SleepSession'
  | 'BloodPressure'
  | 'BodyTemperature';

const ALL_PERMISSIONS: HealthPermission[] = [
  'HeartRate',
  'Steps',
  'OxygenSaturation',
  'SleepSession',
  'BloodPressure',
  'BodyTemperature',
];

// ── Lazy import of react-native-health-connect ────────────────
//
// The package is a native module not available in Expo Go.
// We import lazily so that the JS bundle parses without crashing
// in environments where the native module is absent.

type HC = typeof import('react-native-health-connect');

let _hc: HC | null = null;

async function getHC(): Promise<HC> {
  if (_hc) return _hc;
  try {
    _hc = await import('react-native-health-connect');
    return _hc;
  } catch {
    throw new Error(
      '[HealthConnect] react-native-health-connect not available. ' +
        'This feature requires an Expo Dev Build, not Expo Go.',
    );
  }
}

// ── Service ───────────────────────────────────────────────────

class HealthConnectService {
  private initialized = false;

  // ── Initialize ──────────────────────────────────────────────

  async initialize(): Promise<HealthConnectStatus> {
    try {
      const hc = await getHC();
      const available = await hc.getSdkStatus();
      // SdkAvailabilityStatus: 1 = Installed, 2 = NotInstalled, 3 = NotSupported
      switch (available) {
        case 1:
          this.initialized = true;
          return 'available';
        case 2:
          return 'not_installed';
        case 3:
          return 'not_supported';
        default:
          return 'unknown';
      }
    } catch (err) {
      console.warn('[HealthConnect] initialize() failed:', (err as Error).message);
      return 'unknown';
    }
  }

  // ── Permissions ─────────────────────────────────────────────

  async requestPermissions(): Promise<Record<HealthPermission, PermissionStatus>> {
    const hc = await getHC();
    const permissionRequests = ALL_PERMISSIONS.map((p) => ({
      accessType: 'read' as const,
      recordType: p,
    }));

    try {
      const granted = await hc.requestPermission(permissionRequests);
      return this.mapGrantedPermissions(granted);
    } catch (err) {
      console.error('[HealthConnect] requestPermissions failed:', (err as Error).message);
      return this.buildDeniedMap();
    }
  }

  async checkPermissions(): Promise<Record<HealthPermission, PermissionStatus>> {
    try {
      const hc = await getHC();
      const granted = await hc.getGrantedPermissions();
      return this.mapGrantedPermissions(granted);
    } catch {
      return this.buildDeniedMap();
    }
  }

  private mapGrantedPermissions(
    granted: any[],
  ): Record<HealthPermission, PermissionStatus> {
    const result = this.buildDeniedMap();
    for (const g of granted) {
      const type = g.recordType as HealthPermission;
      if (ALL_PERMISSIONS.includes(type)) {
        result[type] = 'granted';
      }
    }
    return result;
  }

  private buildDeniedMap(): Record<HealthPermission, PermissionStatus> {
    const map: Partial<Record<HealthPermission, PermissionStatus>> = {};
    for (const p of ALL_PERMISSIONS) map[p] = 'not_asked';
    return map as Record<HealthPermission, PermissionStatus>;
  }

  // ── Data Readers ─────────────────────────────────────────────

  private timeRange(days = 7): { startTime: string; endTime: string } {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };
  }

  async readHeartRate(days = 7): Promise<{ bpm: number; timestamp: string }[]> {
    try {
      const hc = await getHC();
      const { startTime, endTime } = this.timeRange(days);
      const response = await hc.readRecords('HeartRate', {
        timeRangeFilter: { operator: 'between', startTime, endTime },
      });
      return (response.records ?? []).flatMap((r: any) =>
        (r.samples ?? []).map((s: any) => ({
          bpm: Math.round(s.beatsPerMinute),
          timestamp: s.time ?? r.startTime,
        })),
      );
    } catch (err) {
      console.error('[HealthConnect] readHeartRate failed:', (err as Error).message);
      return [];
    }
  }

  async readSteps(days = 7): Promise<{ count: number; startTime: string; endTime: string }[]> {
    try {
      const hc = await getHC();
      const { startTime, endTime } = this.timeRange(days);
      const response = await hc.readRecords('Steps', {
        timeRangeFilter: { operator: 'between', startTime, endTime },
      });
      return (response.records ?? []).map((r: any) => ({
        count: r.count ?? 0,
        startTime: r.startTime,
        endTime: r.endTime,
      }));
    } catch (err) {
      console.error('[HealthConnect] readSteps failed:', (err as Error).message);
      return [];
    }
  }

  async readOxygenSaturation(days = 7): Promise<{ percentage: number; timestamp: string }[]> {
    try {
      const hc = await getHC();
      const { startTime, endTime } = this.timeRange(days);
      const response = await hc.readRecords('OxygenSaturation', {
        timeRangeFilter: { operator: 'between', startTime, endTime },
      });
      return (response.records ?? []).map((r: any) => ({
        percentage: Math.round((r.percentage ?? 0) * 100) / 100,
        timestamp: r.time,
      }));
    } catch (err) {
      console.error('[HealthConnect] readOxygenSaturation failed:', (err as Error).message);
      return [];
    }
  }

  async readBloodPressure(
    days = 7,
  ): Promise<{ systolic: number; diastolic: number; timestamp: string }[]> {
    try {
      const hc = await getHC();
      const { startTime, endTime } = this.timeRange(days);
      const response = await hc.readRecords('BloodPressure', {
        timeRangeFilter: { operator: 'between', startTime, endTime },
      });
      return (response.records ?? []).map((r: any) => ({
        systolic: Math.round(r.systolic?.inMillimetersOfMercury ?? 0),
        diastolic: Math.round(r.diastolic?.inMillimetersOfMercury ?? 0),
        timestamp: r.time,
      }));
    } catch (err) {
      console.error('[HealthConnect] readBloodPressure failed:', (err as Error).message);
      return [];
    }
  }

  async readBodyTemperature(days = 7): Promise<{ celsius: number; timestamp: string }[]> {
    try {
      const hc = await getHC();
      const { startTime, endTime } = this.timeRange(days);
      const response = await hc.readRecords('BodyTemperature', {
        timeRangeFilter: { operator: 'between', startTime, endTime },
      });
      return (response.records ?? []).map((r: any) => ({
        celsius:
          Math.round((r.temperature?.inCelsius ?? 0) * 10) / 10,
        timestamp: r.time,
      }));
    } catch (err) {
      console.error('[HealthConnect] readBodyTemperature failed:', (err as Error).message);
      return [];
    }
  }

  async readSleep(
    days = 7,
  ): Promise<{ startTime: string; endTime: string; durationMinutes: number }[]> {
    try {
      const hc = await getHC();
      const { startTime, endTime } = this.timeRange(days);
      const response = await hc.readRecords('SleepSession', {
        timeRangeFilter: { operator: 'between', startTime, endTime },
      });
      return (response.records ?? []).map((r: any) => {
        const durationMs =
          new Date(r.endTime).getTime() - new Date(r.startTime).getTime();
        return {
          startTime: r.startTime,
          endTime: r.endTime,
          durationMinutes: Math.round(durationMs / 60000),
        };
      });
    } catch (err) {
      console.error('[HealthConnect] readSleep failed:', (err as Error).message);
      return [];
    }
  }

  // ── Synthesize into VitalsRecord format ───────────────────────

  /**
   * Read all available data from Health Connect and return as VitalsRecord[].
   * Records are deduplicated by timestamp (minute granularity).
   * Returns [] if no permissions or no records.
   */
  async readAllVitals(patientId: string, days = 7): Promise<Omit<VitalsRecord, 'id'>[]> {
    const [heartRates, oxygens, bps, temps, steps] = await Promise.all([
      this.readHeartRate(days),
      this.readOxygenSaturation(days),
      this.readBloodPressure(days),
      this.readBodyTemperature(days),
      this.readSteps(days),
    ]);

    if (
      heartRates.length === 0 &&
      oxygens.length === 0 &&
      bps.length === 0 &&
      temps.length === 0
    ) {
      return [];
    }

    // Build a timeline map keyed by date+hour+minute
    const buckets = new Map<string, Partial<Omit<VitalsRecord, 'id'>>>();

    const bucket = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
    };

    for (const hr of heartRates) {
      const k = bucket(hr.timestamp);
      const b = buckets.get(k) ?? { recorded_at: hr.timestamp, patient_id: patientId, source: 'smartwatch', steps: null };
      b.heart_rate = hr.bpm;
      buckets.set(k, b);
    }
    for (const o2 of oxygens) {
      const k = bucket(o2.timestamp);
      const b = buckets.get(k) ?? { recorded_at: o2.timestamp, patient_id: patientId, source: 'smartwatch', steps: null };
      b.oxygen_saturation = o2.percentage;
      buckets.set(k, b);
    }
    for (const bp of bps) {
      const k = bucket(bp.timestamp);
      const b = buckets.get(k) ?? { recorded_at: bp.timestamp, patient_id: patientId, source: 'smartwatch', steps: null };
      b.blood_pressure_systolic = bp.systolic;
      b.blood_pressure_diastolic = bp.diastolic;
      buckets.set(k, b);
    }
    for (const t of temps) {
      const k = bucket(t.timestamp);
      const b = buckets.get(k) ?? { recorded_at: t.timestamp, patient_id: patientId, source: 'smartwatch', steps: null };
      b.temperature = t.celsius;
      buckets.set(k, b);
    }

    // Attach total steps to the most recent bucket
    if (steps.length > 0) {
      const totalSteps = steps.reduce((sum, s) => sum + s.count, 0);
      const lastBucket = [...buckets.values()].sort(
        (a, b) =>
          new Date(b.recorded_at ?? 0).getTime() -
          new Date(a.recorded_at ?? 0).getTime(),
      )[0];
      if (lastBucket) lastBucket.steps = totalSteps;
    }

    // Validate: reject buckets with no meaningful data
    const records: Omit<VitalsRecord, 'id'>[] = [];
    for (const b of buckets.values()) {
      if (!b.patient_id || !b.recorded_at) continue;
      if (
        b.heart_rate == null &&
        b.oxygen_saturation == null &&
        b.blood_pressure_systolic == null &&
        b.temperature == null
      ) {
        continue; // no real data — skip
      }
      records.push({
        patient_id: b.patient_id,
        heart_rate: b.heart_rate ?? null,
        blood_pressure_systolic: b.blood_pressure_systolic ?? null,
        blood_pressure_diastolic: b.blood_pressure_diastolic ?? null,
        oxygen_saturation: b.oxygen_saturation ?? null,
        temperature: b.temperature ?? null,
        steps: b.steps ?? null,
        source: 'smartwatch',
        recorded_at: b.recorded_at,
      });
    }

    return records.sort(
      (a, b) =>
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
    );
  }

  /** Returns latest single reading, or null if none. */
  async getLatestReading(patientId: string): Promise<Omit<VitalsRecord, 'id'> | null> {
    const records = await this.readAllVitals(patientId, 1);
    return records[0] ?? null;
  }
}

export const healthConnectService = new HealthConnectService();
