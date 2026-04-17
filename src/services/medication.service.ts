import { supabase } from './supabase';
import type { Medication } from '../types/database';

export const medicationService = {
  async getMedications(patientId: string): Promise<Medication[]> {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('patient_id', patientId)
      .order('reminder_time', { ascending: true });

    if (error) throw new Error(error.message);
    return (data as Medication[]) || [];
  },

  async addMedication(medication: {
    patient_id: string;
    med_name: string;
    dosage: string;
    reminder_time: string;
  }): Promise<{ error: string | null }> {
    const { error } = await supabase.from('medications').insert([medication]);
    return { error: error?.message ?? null };
  },

  async toggleMedication(id: string, isActive: boolean): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('medications')
      .update({ is_active: isActive })
      .eq('id', id);
    return { error: error?.message ?? null };
  },

  async deleteMedication(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase.from('medications').delete().eq('id', id);
    return { error: error?.message ?? null };
  },
};
