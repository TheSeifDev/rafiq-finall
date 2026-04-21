import { supabase } from '../lib/supabase';

export type Medication = {
  id: string;
  patient_id: string;
  name: string;
  dosage: string;
  frequency: string;
  time_of_day: string[];
  start_date: string | null;
  end_date: string | null;
  instructions: string | null;
  is_active: boolean;
};

export const medicationService = {
  async getMedications(patientId: string): Promise<Medication[]> {
    const { data, error } = await supabase.from('medications').select('*').eq('patient_id', patientId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Medication[];
  },
  async addMedication(payload: Omit<Medication, 'id'>): Promise<void> {
    const { error } = await supabase.from('medications').insert(payload);
    if (error) throw new Error(error.message);
  },
  async updateMedication(id: string, payload: Partial<Medication>): Promise<void> {
    const { error } = await supabase.from('medications').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
  },
};
