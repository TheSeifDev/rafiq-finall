// ─────────────────────────────────────────
// Patients
// ─────────────────────────────────────────
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

export interface UserProfile {
  full_name: string;
  age: string;
  blood_type: string;
  allergies: string;
}

// ─────────────────────────────────────────
// Vitals (legacy — patient_health table)
// ─────────────────────────────────────────
export interface PatientHealth {
  id: string;
  patient_id: string;
  heart_rate: number;
  oxygen_level: number | null;
  blood_pressure: string | null;
  temperature: number | null;
  created_at: string;
}

/** Legacy vitals record from the `vitals` table (user_id based) */
export interface VitalRecord {
  id: string;
  user_id: string;
  heart_rate: number;
  oxygen_level: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  created_at: string;
}

// ─────────────────────────────────────────
// Vitals Readings (new — vitals_readings table)
// Supports manual entry + smartwatch/BLE
// ─────────────────────────────────────────
export type VitalsReadingSource = 'manual' | 'smartwatch' | 'ble';

export interface VitalsReading {
  id: string;
  patient_id: string;
  source: VitalsReadingSource;
  heart_rate: number | null;
  oxygen_level: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  temperature: number | null;
  steps: number | null;
  device_name: string | null;
  device_id: string | null;
  recorded_at: string;
  created_at: string;
}

export interface VitalsReadingInsert {
  patient_id: string;
  source: VitalsReadingSource;
  heart_rate?: number | null;
  oxygen_level?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  temperature?: number | null;
  steps?: number | null;
  device_name?: string | null;
  device_id?: string | null;
  recorded_at?: string;
}

// ─────────────────────────────────────────
// Medications
// ─────────────────────────────────────────
export interface Medication {
  id: string;
  patient_id: string;
  med_name: string;
  dosage: string;
  reminder_time: string;
  is_active: boolean;
  created_at: string;
}

// ─────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────
export type NotificationType = 'critical' | 'reminder' | 'general';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

// ─────────────────────────────────────────
// Chat
// ─────────────────────────────────────────
export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

export interface ChatMessageInsert {
  user_id: string;
  role: ChatRole;
  content: string;
}

// ─────────────────────────────────────────
// BLE / Smartwatch
// ─────────────────────────────────────────
export interface BleDevice {
  id: string;
  name: string | null;
  rssi: number | null;
}

export interface BleVitalsStreamPayload {
  heartRate?: number;
  oxygenLevel?: number;
  temperature?: number;
  steps?: number;
  deviceId: string;
  deviceName: string;
  timestamp: string;
}
