import { supabase } from '../lib/supabase';

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

export const vitalsService = {
  async getVitalsHistory(patientId: string): Promise<VitalsRecord[]> {
    const { data, error } = await supabase.from('vitals').select('*').eq('patient_id', patientId).order('recorded_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as VitalsRecord[];
  },
  async saveVitals(payload: Omit<VitalsRecord, 'id'>): Promise<void> {
    const { error } = await supabase.from('vitals').insert(payload);
    if (error) throw new Error(error.message);
  },
  async getLatestVitals(patientId: string): Promise<VitalsRecord | null> {
    const { data, error } = await supabase.from('vitals').select('*').eq('patient_id', patientId).order('recorded_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as VitalsRecord | null) ?? null;
  },
};
