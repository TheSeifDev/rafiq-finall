import { supabase } from '../lib/supabase';
import { toFiniteNumberOrNull } from '../utils/number';

export type PatientProfile = {
  id: string;
  user_id: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  blood_type: string | null;
  phone: string | null;
};

function normalizePatientProfile(profile: unknown): PatientProfile {
  const row = (profile ?? {}) as Partial<PatientProfile> & Record<string, unknown>;
  return {
    ...(row as PatientProfile),
    age: toFiniteNumberOrNull(row.age),
  };
}

export const patientService = {
  async getProfile(userId: string): Promise<PatientProfile | null> {
    const { data, error } = await supabase.from('patients').select('*').eq('user_id', userId).single();
    if (error) return null;
    return normalizePatientProfile(data);
  },
  async updateProfile(id: string, payload: Partial<PatientProfile>): Promise<void> {
    const normalizedPayload: Partial<PatientProfile> = {
      ...payload,
      age: payload.age === undefined ? undefined : toFiniteNumberOrNull(payload.age),
    };
    const { error } = await supabase.from('patients').update(normalizedPayload).eq('id', id);
    if (error) throw new Error(error.message);
  },
  async createPatient(payload: Omit<PatientProfile, 'id'>): Promise<void> {
    const normalizedPayload: Omit<PatientProfile, 'id'> = {
      ...payload,
      age: toFiniteNumberOrNull(payload.age),
    };
    const { error } = await supabase.from('patients').insert(normalizedPayload);
    if (error) throw new Error(error.message);
  },
};
