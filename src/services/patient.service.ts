import { supabase } from './supabase';
import type { Patient, UserProfile } from '../types/database';

export const patientService = {
  async hasPatient(userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    return Boolean(data && data.length > 0);
  },

  async getPatient(userId: string): Promise<Patient | null> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data as Patient;
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('patients')
      .select('full_name, age, blood_type, allergies')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return {
      full_name: data.full_name || 'غير مسجل',
      age: data.age?.toString() || '--',
      blood_type: data.blood_type || '--',
      allergies: data.allergies || 'لا يوجد',
    };
  },

  async getUserName(userId: string): Promise<string> {
    const { data } = await supabase
      .from('patients')
      .select('full_name')
      .eq('user_id', userId)
      .single();

    return data?.full_name || 'مستخدم رفيق';
  },

  async createPatient(patient: {
    user_id: string;
    full_name: string;
    age: number;
    gender: string;
    blood_type: string;
  }): Promise<{ error: string | null }> {
    const { error } = await supabase.from('patients').insert([patient]);
    return { error: error?.message ?? null };
  },

  async getPatientId(userId: string): Promise<string | null> {
    const { data } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    return data?.id ?? null;
  },
};
