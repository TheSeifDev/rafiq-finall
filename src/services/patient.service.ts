import { supabase } from '../lib/supabase';

export type PatientProfile = {
  id: string;
  user_id: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  blood_type: string | null;
  phone: string | null;
};

export const patientService = {
  async getProfile(userId: string): Promise<PatientProfile | null> {
    const { data, error } = await supabase.from('patients').select('*').eq('user_id', userId).single();
    if (error) return null;
    return data as PatientProfile;
  },
  async updateProfile(id: string, payload: Partial<PatientProfile>): Promise<void> {
    const { error } = await supabase.from('patients').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
  },
  async createPatient(payload: Omit<PatientProfile, 'id'>): Promise<void> {
    const { error } = await supabase.from('patients').insert(payload);
    if (error) throw new Error(error.message);
  },
};
