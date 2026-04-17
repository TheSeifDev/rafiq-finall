import { supabase } from './supabase';
import type { VitalsReading, VitalsReadingInsert } from '../types/database';

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
    return (data as VitalsReading[]) ?? [];
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
    return data as VitalsReading;
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
      data: error ? null : (data as VitalsReading),
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
  ) {
    return supabase
      .channel(`vitals-readings-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vitals_readings',
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => callback(payload.new as VitalsReading)
      )
      .subscribe();
  },
};
