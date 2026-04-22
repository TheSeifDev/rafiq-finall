import { supabase } from '../lib/supabase';
import { toFiniteNumberOrNull } from '../utils/number';

export type VitalsRecord = {
  id: string;
  patient_id: string;
  heart_rate: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  oxygen_saturation: number | null;
  temperature: number | null;
  source: 'manual' | 'smartwatch' | 'bluetooth';
  recorded_at: string;
};

function normalizeVitalsRecord(record: unknown): VitalsRecord {
  const row = (record ?? {}) as Partial<VitalsRecord> & Record<string, unknown>;
  return {
    ...(row as VitalsRecord),
    heart_rate: toFiniteNumberOrNull(row.heart_rate),
    blood_pressure_systolic: toFiniteNumberOrNull(row.blood_pressure_systolic),
    blood_pressure_diastolic: toFiniteNumberOrNull(row.blood_pressure_diastolic),
    oxygen_saturation: toFiniteNumberOrNull(row.oxygen_saturation),
    temperature: toFiniteNumberOrNull(row.temperature),
  };
}

export const vitalsService = {
  async getVitalsHistory(patientId: string): Promise<VitalsRecord[]> {
    const { data, error } = await supabase.from('vitals').select('*').eq('patient_id', patientId).order('recorded_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(normalizeVitalsRecord);
  },
  async saveVitals(payload: Omit<VitalsRecord, 'id'>): Promise<void> {
    const normalizedPayload: Omit<VitalsRecord, 'id'> = {
      ...payload,
      heart_rate: toFiniteNumberOrNull(payload.heart_rate),
      blood_pressure_systolic: toFiniteNumberOrNull(payload.blood_pressure_systolic),
      blood_pressure_diastolic: toFiniteNumberOrNull(payload.blood_pressure_diastolic),
      oxygen_saturation: toFiniteNumberOrNull(payload.oxygen_saturation),
      temperature: toFiniteNumberOrNull(payload.temperature),
    };
    const { error } = await supabase.from('vitals').insert(normalizedPayload);
    if (error) throw new Error(error.message);
  },
  async getLatestVitals(patientId: string): Promise<VitalsRecord | null> {
    const { data, error } = await supabase.from('vitals').select('*').eq('patient_id', patientId).order('recorded_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? normalizeVitalsRecord(data) : null;
  },
};
