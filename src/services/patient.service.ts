import { supabase } from '../lib/supabase';
import type {
  Patient,
  AddressData,
  ReporterData,
  HospitalData,
  EmergencyContact,
  EmergencyContactInsert,
  PatientCondition,
  PatientConditionInsert,
} from '../types/database';

// ─── Public re-exports for backward compat ───
export type PatientProfile = Patient;

// ─── Default empty structures ───
const EMPTY_ADDRESS: AddressData = {};
const EMPTY_REPORTER: ReporterData = {};
const EMPTY_HOSPITAL: HospitalData = {};

/** Safely parse JSONB that may come as string or null */
function parseJsonb<T>(val: unknown, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === 'object') return val as T;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** Normalize a raw DB row into a typed Patient */
function normalizePatient(row: Record<string, unknown>): Patient {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    full_name: (row.full_name as string) ?? '',
    age: (row.age as number) ?? null,
    gender: (row.gender as Patient['gender']) ?? null,
    blood_type: (row.blood_type as string) ?? null,
    phone: (row.phone as string) ?? null,
    birth_date: (row.birth_date as string) ?? null,
    condition_type: (row.condition_type as string) ?? null,
    risk_level: (row.risk_level as string) ?? null,
    notes: (row.notes as string) ?? null,
    relationship: (row.relationship as string) ?? 'self',
    address_data: parseJsonb<AddressData>(row.address_data, EMPTY_ADDRESS),
    reporter_data: parseJsonb<ReporterData>(row.reporter_data, EMPTY_REPORTER),
    hospital_data: parseJsonb<HospitalData>(row.hospital_data, EMPTY_HOSPITAL),
    latitude: (row.latitude as number) ?? null,
    longitude: (row.longitude as number) ?? null,
    geocoded_address: (row.geocoded_address as string) ?? null,
    address: (row.address as string) ?? null,
    emergency_contact: (row.emergency_contact as string) ?? null,
    location: (row.location as string) ?? null,
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    updated_at: (row.updated_at as string) ?? null,
  };
}

export const patientService = {
  // ─── Patient CRUD ───────────────────────────────────────

  async getProfile(userId: string): Promise<Patient | null> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return normalizePatient(data as Record<string, unknown>);
  },

  async updateProfile(id: string, payload: Partial<Patient>): Promise<void> {
    // Strip fields that shouldn't be sent to update
    const { id: _id, user_id: _uid, created_at: _ca, ...safe } = payload as Record<string, unknown>;
    const { error } = await supabase.from('patients').update(safe).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async createPatient(payload: {
    user_id: string;
    full_name: string;
    phone?: string | null;
    birth_date?: string | null;
  }): Promise<void> {
    const { error } = await supabase.from('patients').insert(payload);
    if (error) throw new Error(error.message);
  },

  async hasPatient(userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    return Boolean(data);
  },

  async getPatientId(userId: string): Promise<string | null> {
    const { data } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  },

  // ─── Emergency Contacts ─────────────────────────────────

  async getEmergencyContacts(patientId: string): Promise<EmergencyContact[]> {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('patient_id', patientId)
      .order('priority', { ascending: true });
    if (error) {
      console.warn('[patientService] getEmergencyContacts error:', error.message);
      return [];
    }
    return (data ?? []) as EmergencyContact[];
  },

  async upsertEmergencyContact(contact: EmergencyContactInsert & { id?: string }): Promise<void> {
    if (contact.id) {
      const { id, ...rest } = contact;
      const { error } = await supabase.from('emergency_contacts').update(rest).eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('emergency_contacts').insert(contact);
      if (error) throw new Error(error.message);
    }
  },

  async deleteEmergencyContact(id: string): Promise<void> {
    const { error } = await supabase.from('emergency_contacts').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // ─── Patient Conditions ─────────────────────────────────

  async getConditions(patientId: string): Promise<PatientCondition[]> {
    const { data, error } = await supabase
      .from('patient_conditions')
      .select('*')
      .eq('patient_id', patientId);
    if (error) {
      console.warn('[patientService] getConditions error:', error.message);
      return [];
    }
    return (data ?? []) as PatientCondition[];
  },

  /**
   * Sync conditions: deletes all existing and re-inserts the current set.
   * This is simpler than diffing and safe for small lists.
   */
  async syncConditions(patientId: string, conditions: PatientConditionInsert[]): Promise<void> {
    // Delete existing
    const { error: delErr } = await supabase
      .from('patient_conditions')
      .delete()
      .eq('patient_id', patientId);
    if (delErr) throw new Error(delErr.message);

    // Insert new
    if (conditions.length > 0) {
      const { error: insErr } = await supabase.from('patient_conditions').insert(conditions);
      if (insErr) throw new Error(insErr.message);
    }
  },
};
