import { supabase } from '../lib/supabase';
import type { VitalsReading, VitalsReadingInsert } from '../types/database';
import { toFiniteNumberOrNull } from '../utils/number';

function normalizeVitalsReading(reading: unknown): VitalsReading {
  const row = (reading ?? {}) as Partial<VitalsReading> & Record<string, unknown>;
  return {
    ...(row as VitalsReading),
    heart_rate: toFiniteNumberOrNull(row.heart_rate),
    oxygen_level: toFiniteNumberOrNull(row.oxygen_level),
    blood_pressure_systolic: toFiniteNumberOrNull(row.blood_pressure_systolic),
    blood_pressure_diastolic: toFiniteNumberOrNull(row.blood_pressure_diastolic),
    temperature: toFiniteNumberOrNull(row.temperature),
    steps: toFiniteNumberOrNull(row.steps),
  };
}

export const vitalsReadingService = {
  /**
   * Fetch the full vitals history for a patient, newest first.
   */
  async getHistory(patientId: string): Promise<VitalsReading[]> {
    const { data, error } = await supabase
      .from('vitals_readings')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(normalizeVitalsReading);
  },

  /**
   * Fetch only the most recent reading (used for the Home dashboard card).
   */
  async getLatest(patientId: string): Promise<VitalsReading | null> {
    const { data, error } = await supabase
      .from('vitals_readings')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return normalizeVitalsReading(data);
  },

  /**
   * Insert a new vitals reading (manual or smartwatch).
   */
  async addReading(
    reading: VitalsReadingInsert
  ): Promise<{ data: VitalsReading | null; error: string | null }> {
    const { data, error } = await supabase
      .from('vitals_readings')
      .insert([{ ...reading, recorded_at: reading.recorded_at ?? new Date().toISOString() }])
      .select()
      .single();

    return {
      data: error || !data ? null : normalizeVitalsReading(data),
      error: error?.message ?? null,
    };
  },

  /**
   * Subscribe to real-time inserts for a given patient.
   * Returns the Supabase RealtimeChannel so the caller can unsubscribe.
   */
  subscribeToReadings(
    patientId: string,
    callback: (reading: VitalsReading) => void
  ): () => void {
    const channel = supabase
      .channel(`vitals-readings-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vitals_readings',
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => callback(normalizeVitalsReading(payload.new))
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
