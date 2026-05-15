/**
 * VitalsRepository — local SQLite + sync queue
 * Uses explicit insertColumns and updateColumns.
 * No Partial<T>, no as unknown as.
 */
import { BaseRepository, EntityRow } from './BaseRepository';
import { runQuery } from '../lib/database';

// ─────────────────────────────────────────
// Explicit DTO contracts
// ─────────────────────────────────────────

export type VitalsSource = 'manual' | 'smartwatch' | 'bluetooth';

export interface VitalsInsert {
  patient_id: string;
  heart_rate?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  oxygen_saturation?: number | null;
  temperature?: number | null;
  steps?: number | null;
  source?: VitalsSource;
  recorded_at?: string;
  device_name?: string | null;
  device_id?: string | null;
  [key: string]: unknown;
}

export interface VitalsUpdate {
  heart_rate?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  oxygen_saturation?: number | null;
  temperature?: number | null;
  steps?: number | null;
  source?: VitalsSource;
  recorded_at?: string;
  device_name?: string | null;
  device_id?: string | null;
  [key: string]: unknown;
}

// ─────────────────────────────────────────
// Vitals Row
// ─────────────────────────────────────────

export interface VitalsRow extends EntityRow {
  id: string;
  patient_id: string;
  heart_rate: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  oxygen_saturation: number | null;
  temperature: number | null;
  steps: number | null;
  source: string;
  recorded_at: string;
  created_at: string;
  updated_at: string | null;
  device_name: string | null;
  device_id: string | null;
}

// ─────────────────────────────────────────
// VitalsRepository
// ─────────────────────────────────────────

export class VitalsRepository extends BaseRepository<VitalsRow, VitalsInsert, VitalsUpdate> {
  readonly tableName = 'vitals_readings';

  readonly insertColumns = [
    'patient_id', 'heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic',
    'oxygen_saturation', 'temperature', 'steps', 'source', 'recorded_at',
    'device_name', 'device_id',
  ] as const;

  readonly updateColumns = [
    'heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic',
    'oxygen_saturation', 'temperature', 'steps', 'source', 'recorded_at',
    'device_name', 'device_id',
  ] as const;

  async getHistory(patientId: string, limitDays?: number): Promise<VitalsRow[]> {
    let sql = `SELECT * FROM vitals_readings WHERE patient_id = ? AND is_deleted = 0 ORDER BY recorded_at DESC`;
    const params: (string | number)[] = [patientId];

    if (limitDays) {
      sql += ` LIMIT ?`;
      params.push(limitDays * 288);
    }

    return runQuery<VitalsRow>(sql, params);
  }

  async saveVitals(payload: VitalsInsert): Promise<VitalsRow> {
    return this.insert({
      ...payload,
      source: payload.source ?? 'manual',
      recorded_at: payload.recorded_at ?? new Date().toISOString(),
    });
  }

  async getLatest(patientId: string): Promise<VitalsRow | null> {
    const rows = await runQuery<VitalsRow>(
      `SELECT * FROM vitals_readings WHERE patient_id = ? AND is_deleted = 0 ORDER BY recorded_at DESC LIMIT 1`,
      [patientId]
    );
    return rows[0] ?? null;
  }

  async deleteForPatient(patientId: string): Promise<void> {
    const rows = await runQuery<{ id: string }>(
      `SELECT id FROM vitals_readings WHERE patient_id = ?`,
      [patientId]
    );
    for (const row of rows) {
      await this.delete(row.id);
    }
  }
}