// ─────────────────────────────────────────
// Structured JSONB Sub-types
// ─────────────────────────────────────────

/** Detailed address for ambulance / emergency teams */
export interface AddressData {
  governorate?: string;
  district?: string;
  street?: string;
  building_number?: string;
  apartment_number?: string;
  floor?: string;
  apartment_side?: 'right' | 'left' | '';
  landmark?: string;
  extra_notes?: string;
}

/** Reporter / caregiver — the person filling the profile */
export interface ReporterData {
  name?: string;
  relationship?: string;
  phone?: string;
  is_primary_contact?: boolean;
}

/** Preferred hospital information */
export interface HospitalData {
  name?: string;
  address?: string;
  phone?: string;
  has_medical_file?: boolean;
  file_number?: string;
}

// ─────────────────────────────────────────
// Patients
// ─────────────────────────────────────────
export interface Patient {
  id: string;
  user_id: string;
  full_name: string;
  age: number | null;
  gender: 'male' | 'female' | null;
  blood_type: string | null;
  phone: string | null;
  birth_date: string | null;
  condition_type: string | null;
  risk_level: string | null;
  notes: string | null;
  relationship: string | null;
  // Structured JSONB
  address_data: AddressData;
  reporter_data: ReporterData;
  hospital_data: HospitalData;
  // Location
  latitude: number | null;
  longitude: number | null;
  geocoded_address: string | null;
  // Legacy (deprecated — kept for backward compat)
  address?: string | null;
  emergency_contact?: string | null;
  location?: string | null;
  // Timestamps
  created_at: string;
  updated_at: string | null;
}

// ─────────────────────────────────────────
// Emergency Contacts (normalized table)
// ─────────────────────────────────────────
export interface EmergencyContact {
  id: string;
  patient_id: string;
  name: string;
  relation: string;
  phone: string;
  priority: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface EmergencyContactInsert {
  patient_id: string;
  name: string;
  relation: string;
  phone: string;
  priority?: number;
  is_primary?: boolean;
}

// ─────────────────────────────────────────
// Patient Conditions (normalized table)
// ─────────────────────────────────────────
export interface PatientCondition {
  id: string;
  patient_id: string;
  condition_key: string;
  custom_note: string | null;
  created_at: string;
}

export interface PatientConditionInsert {
  patient_id: string;
  condition_key: string;
  custom_note?: string | null;
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
  name: string;
  dosage: string;
  frequency: string;
  time_of_day: string[];
  start_date: string | null;
  end_date: string | null;
  instructions: string | null;
  is_active: boolean;
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
  type: NotificationType | null;
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
