/**
 * schema.ts — Expo-compatible SQL schema export
 * Replace schema.sql?raw import with this module.
 * Metro/Expo does not support .sql?raw import syntax.
 * Asset.fromModule() handles .sql files as text assets.
 */
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

let _schemaSQL: string | null = null;

export async function loadSchemaSQL(): Promise<string> {
  if (_schemaSQL) return _schemaSQL;

  try {
    const asset = Asset.fromModule(require('./schema.sql'));
    _schemaSQL = await FileSystem.readAsStringAsync(asset.uri);
  } catch {
    // Fallback: inline the schema for environments where Asset.fromModule fails
    _schemaSQL = getInlineSchema();
  }

  return _schemaSQL;
}

function getInlineSchema(): string {
  return `CREATE TABLE IF NOT EXISTS pending_sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  checksum TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  synced_at INTEGER,
  correlation_id TEXT,
  user_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_queue_pending ON pending_sync_queue(synced_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON pending_sync_queue(table_name);
CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON pending_sync_queue(priority DESC);

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  age INTEGER,
  gender TEXT,
  blood_type TEXT,
  phone TEXT,
  birth_date TEXT,
  condition_type TEXT,
  risk_level TEXT,
  notes TEXT,
  relationship TEXT DEFAULT 'self',
  address_data TEXT,
  reporter_data TEXT,
  hospital_data TEXT,
  latitude REAL,
  longitude REAL,
  geocoded_address TEXT,
  address TEXT,
  emergency_contact TEXT,
  location TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  version INTEGER DEFAULT 1,
  updated_by_device TEXT,
  is_deleted INTEGER DEFAULT 0,
  deleted_at TEXT,
  deleted_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_patients_user ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_sync ON patients(is_deleted, updated_at);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  relationship TEXT,
  priority INTEGER DEFAULT 0,
  is_primary INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  version INTEGER DEFAULT 1,
  updated_by_device TEXT,
  is_deleted INTEGER DEFAULT 0,
  deleted_at TEXT,
  deleted_by TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);
CREATE INDEX IF NOT EXISTS idx_contacts_patient ON emergency_contacts(patient_id);

CREATE TABLE IF NOT EXISTS patient_conditions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  condition_name TEXT NOT NULL,
  severity TEXT,
  diagnosed_date TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  version INTEGER DEFAULT 1,
  updated_by_device TEXT,
  is_deleted INTEGER DEFAULT 0,
  deleted_at TEXT,
  deleted_by TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);
CREATE INDEX IF NOT EXISTS idx_conditions_patient ON patient_conditions(patient_id);

CREATE TABLE IF NOT EXISTS medications (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  dosage TEXT,
  frequency TEXT,
  time_of_day TEXT,
  start_date TEXT,
  end_date TEXT,
  instructions TEXT,
  is_active INTEGER DEFAULT 1,
  strength TEXT,
  category TEXT,
  reason TEXT,
  form TEXT,
  schedule_type TEXT,
  times TEXT,
  meal_rule TEXT,
  quantity_type TEXT,
  total_quantity REAL,
  remaining_quantity REAL,
  refill_threshold REAL,
  notes TEXT,
  doctor_name TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  version INTEGER DEFAULT 1,
  updated_by_device TEXT,
  is_deleted INTEGER DEFAULT 0,
  deleted_at TEXT,
  deleted_by TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);
CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_active ON medications(is_active);

CREATE TABLE IF NOT EXISTS medication_logs (
  id TEXT PRIMARY KEY,
  medication_id TEXT NOT NULL,
  taken_at TEXT NOT NULL,
  scheduled_for TEXT,
  skipped INTEGER DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  updated_by_device TEXT,
  is_deleted INTEGER DEFAULT 0,
  deleted_at TEXT,
  deleted_by TEXT,
  FOREIGN KEY (medication_id) REFERENCES medications(id)
);
CREATE INDEX IF NOT EXISTS idx_logs_medication ON medication_logs(medication_id);
CREATE INDEX IF NOT EXISTS idx_logs_taken_at ON medication_logs(taken_at);

CREATE TABLE IF NOT EXISTS vitals_readings (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  heart_rate REAL,
  blood_pressure_systolic REAL,
  blood_pressure_diastolic REAL,
  oxygen_saturation REAL,
  temperature REAL,
  steps INTEGER,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'smartwatch', 'bluetooth')),
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  updated_by_device TEXT,
  is_deleted INTEGER DEFAULT 0,
  deleted_at TEXT,
  deleted_by TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);
CREATE INDEX IF NOT EXISTS idx_vitals_patient ON vitals_readings(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_recorded ON vitals_readings(recorded_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data TEXT,
  read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  read_at TEXT,
  version INTEGER DEFAULT 1,
  updated_by_device TEXT,
  is_deleted INTEGER DEFAULT 0,
  deleted_at TEXT,
  deleted_by TEXT,
  FOREIGN KEY (user_id) REFERENCES patients(id)
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT,
  source TEXT,
  acknowledged INTEGER DEFAULT 0,
  acknowledged_at TEXT,
  created_at TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  updated_by_device TEXT,
  is_deleted INTEGER DEFAULT 0,
  deleted_at TEXT,
  deleted_by TEXT,
  FOREIGN KEY (user_id) REFERENCES patients(id)
);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT,
  os_version TEXT,
  app_version TEXT,
  last_seen TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  version INTEGER DEFAULT 1,
  updated_by_device TEXT,
  is_deleted INTEGER DEFAULT 0,
  deleted_at TEXT,
  deleted_by TEXT,
  FOREIGN KEY (user_id) REFERENCES patients(id)
);
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  version INTEGER DEFAULT 1,
  updated_by_device TEXT,
  is_deleted INTEGER DEFAULT 0,
  deleted_at TEXT,
  deleted_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated ON ai_conversations(updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL DEFAULT '',
  reasoning_details TEXT,
  provider TEXT,
  model TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  version INTEGER DEFAULT 1,
  updated_by_device TEXT,
  is_deleted INTEGER DEFAULT 0,
  deleted_at TEXT,
  deleted_by TEXT,
  FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id)
);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user ON ai_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON ai_messages(created_at ASC);`;
}

export const SCHEMA_SQL = ''; // Async loader above; sync export for compatibility