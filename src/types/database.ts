export interface Patient {
  id: string;
  user_id: string;
  full_name: string;
  age: number;
  gender: 'male' | 'female';
  blood_type: string;
  allergies: string | null;
  created_at: string;
}

export interface VitalRecord {
  id: string;
  user_id: string;
  heart_rate: number;
  oxygen_level: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  created_at: string;
}

export interface PatientHealth {
  id: string;
  patient_id: string;
  heart_rate: number;
  oxygen_level: number | null;
  blood_pressure: string | null;
  temperature: number | null;
  created_at: string;
}

export interface Medication {
  id: string;
  patient_id: string;
  med_name: string;
  dosage: string;
  reminder_time: string;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'critical' | 'reminder' | 'general';
  is_read: boolean;
  created_at: string;
}

export interface UserProfile {
  full_name: string;
  age: string;
  blood_type: string;
  allergies: string;
}
