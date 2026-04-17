import { supabase } from './supabase';
import type { PatientHealth, VitalRecord } from '../types/database';

export const vitalsService = {
  async getLastHeartRate(userId: string): Promise<number> {
    const { data } = await supabase
      .from('vitals')
      .select('heart_rate')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data?.heart_rate ?? 0;
  },

  async getVitalsHistory(patientId: string): Promise<PatientHealth[]> {
    const { data, error } = await supabase
      .from('patient_health')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data as PatientHealth[]) || [];
  },

  subscribeToNotifications(callback: () => void) {
    const channel = supabase
      .channel('notification-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => callback()
      )
      .subscribe();

    return channel;
  },
};
