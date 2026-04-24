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

  // v2 (backward-compatible; may be null for existing rows)
  strength?: string | null;
  category?: string | null;
  reason?: string | null;
  form?: string | null;
  schedule_type?: string | null;
  times?: unknown;
  meal_rule?: string | null;
  quantity_type?: string | null;
  total_quantity?: number | null;
  remaining_quantity?: number | null;
  refill_threshold?: number | null;
  notes?: string | null;
  doctor_name?: string | null;
  active?: boolean | null;
  created_at?: string;
  updated_at?: string | null;
};

export type MedicationInsert = Omit<Medication, 'id'>;

export type MedicationLog = {
  id: string;
  medication_id: string;
  taken_at: string;
  scheduled_for: string | null;
  skipped: boolean;
  note: string | null;
  created_at: string;
};

export type MedicationLogInsert = {
  medication_id: string;
  taken_at?: string;
  scheduled_for?: string | null;
  skipped?: boolean;
  note?: string | null;
  created_at?: string;
};

export const medicationService = {
  async getMedications(patientId: string): Promise<Medication[]> {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('patient_id', patientId)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Medication[];
  },

  async getMedication(id: string): Promise<Medication | null> {
    const { data, error } = await supabase.from('medications').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as Medication | null;
  },

  async addMedication(payload: MedicationInsert): Promise<void> {
    const { error } = await supabase.from('medications').insert(payload);
    if (error) throw new Error(error.message);
  },

  async createMedication(payload: MedicationInsert): Promise<Medication> {
    const { data, error } = await supabase.from('medications').insert(payload).select('*').single();
    if (error) throw new Error(error.message);
    return data as Medication;
  },

  async updateMedication(id: string, payload: Partial<Medication>): Promise<void> {
    const { error } = await supabase.from('medications').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async updateMedicationReturning(id: string, payload: Partial<Medication>): Promise<Medication> {
    const { data, error } = await supabase.from('medications').update(payload).eq('id', id).select('*').single();
    if (error) throw new Error(error.message);
    return data as Medication;
  },

  async deleteMedication(id: string): Promise<void> {
    const { error } = await supabase.from('medications').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async setActive(id: string, active: boolean): Promise<void> {
    const { error } = await supabase
      .from('medications')
      .update({ active, is_active: active })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  async refillStock(
    id: string,
    payload: Pick<Medication, 'total_quantity' | 'remaining_quantity' | 'refill_threshold' | 'quantity_type'>,
  ): Promise<void> {
    const { error } = await supabase.from('medications').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async listLogs(medicationId: string, limit = 200): Promise<MedicationLog[]> {
    const { data, error } = await supabase
      .from('medication_logs')
      .select('*')
      .eq('medication_id', medicationId)
      .order('taken_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []) as MedicationLog[];
  },

  async addLog(payload: MedicationLogInsert): Promise<void> {
    const { error } = await supabase.from('medication_logs').insert(payload);
    if (error) throw new Error(error.message);
  },

  async listLogsForPatientRange(patientId: string, startIso: string, endIso: string): Promise<MedicationLog[]> {
    const { data, error } = await supabase
      .from('medication_logs')
      .select('*, medications!inner(patient_id)')
      .eq('medications.patient_id', patientId)
      .gte('taken_at', startIso)
      .lt('taken_at', endIso)
      .order('taken_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as MedicationLog[];
  },
};
