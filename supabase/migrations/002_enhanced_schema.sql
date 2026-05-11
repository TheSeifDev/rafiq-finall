-- RAFIQ App Database Schema - Full Production Schema
-- Run this on Supabase SQL Editor

-- ============================================================
-- USERS & AUTHENTICATION
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'caregiver', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PATIENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS patients (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    age INTEGER,
    gender TEXT CHECK (gender IN ('male', 'female')),
    blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    height_cm INTEGER,
    weight_kg DECIMAL(5,2),
    medical_history TEXT,
    allergies TEXT,
    chronic_conditions TEXT[],
    emergency_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS (Enhanced with categories & severity)
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT,
    category TEXT DEFAULT 'system' CHECK (category IN ('emergency', 'health', 'medication', 'device', 'chat', 'system', 'food', 'wearable')),
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_read BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    data JSONB,
    screen TEXT,
    source TEXT DEFAULT 'local' CHECK (source IN ('local', 'backend', 'wearable', 'ai', 'system')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(user_id, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_severity ON notifications(user_id, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_emergency ON notifications(user_id, severity) WHERE severity = 'critical';

-- ============================================================
-- MEDICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT,
    form TEXT CHECK (form IN ('tablet', 'capsule', 'liquid', 'injection', 'topical', 'inhaler', 'patch', 'drops', 'other')),
    frequency TEXT,
    times TEXT, -- JSON array of times ["08:00", "14:00", "20:00"]
    time_of_day TEXT[], -- ["morning", "afternoon", "evening", "night"]
    duration_days INTEGER,
    start_date DATE,
    end_date DATE,
    instructions TEXT,
    side_effects TEXT,
    remaining_quantity INTEGER DEFAULT 0,
    refill_threshold INTEGER DEFAULT 10,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patient_id, active);
CREATE INDEX IF NOT EXISTS idx_medications_user ON medications(user_id);

-- ============================================================
-- MEDICATION LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS medication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_id UUID REFERENCES medications(id) ON DELETE CASCADE,
    patient_id BIGINT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    taken_at TIMESTAMPTZ DEFAULT NOW(),
    skipped BOOLEAN DEFAULT FALSE,
    skipped_reason TEXT,
    notes TEXT,
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'wearable', 'auto')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_med_logs_med ON medication_logs(medication_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_med_logs_date ON medication_logs(taken_at DESC);

-- ============================================================
-- VITALS / HEALTH READINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    heart_rate INTEGER,
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    oxygen_saturation DECIMAL(4,1),
    temperature DECIMAL(4,1),
    respiratory_rate INTEGER,
    blood_glucose DECIMAL(5,1),
    weight_kg DECIMAL(5,2),
    steps_count INTEGER,
    sleep_hours DECIMAL(3,1),
    stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'smartwatch', 'bluetooth', 'auto', 'esp32')),
    device_id TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vitals_patient ON vitals(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vitals_user ON vitals(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vitals_source ON vitals(source, recorded_at DESC);

-- ============================================================
-- EMERGENCY CONTACTS
-- ============================================================

CREATE TABLE IF NOT EXISTS emergency_contacts (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relationship TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    priority INTEGER DEFAULT 1,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_patient ON emergency_contacts(patient_id, priority);

-- ============================================================
-- EMERGENCY LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS emergency_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('sos', 'fall', 'gas', 'medical', 'device', 'manual')),
    severity TEXT DEFAULT 'high' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    location_name TEXT,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved BOOLEAN DEFAULT FALSE,
    notes TEXT,
    responded_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_logs_patient ON emergency_logs(patient_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_logs_unresolved ON emergency_logs(resolved, triggered_at DESC) WHERE resolved = FALSE;

-- ============================================================
-- DEVICES (ESP32, Mini-PC, Smart devices)
-- ============================================================

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL CHECK (device_type IN ('esp32', 'minipc', 'smartwatch', 'mmwave', 'gas_sensor', 'camera', 'speaker', 'other')),
    mac_address TEXT,
    ip_address TEXT,
    firmware_version TEXT,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error', 'maintenance')),
    last_seen TIMESTAMPTZ,
    battery_level INTEGER,
    signal_strength INTEGER,
    location TEXT,
    config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_patient ON devices(patient_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status, last_seen DESC);

-- ============================================================
-- WEARABLES (Smartwatch pairing)
-- ============================================================

CREATE TABLE IF NOT EXISTS wearables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    device_model TEXT,
    mac_address TEXT,
    ble_uuid TEXT,
    paired_at TIMESTAMPTZ DEFAULT NOW(),
    last_sync TIMESTAMPTZ,
    battery_level INTEGER,
    firmware_version TEXT,
    status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'syncing', 'error')),
    config JSONB,
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wearables_user ON wearables(user_id);
CREATE INDEX IF NOT EXISTS idx_wearables_status ON wearables(status);

-- ============================================================
-- GAS ALERTS
-- ============================================================

CREATE TABLE IF NOT EXISTS gas_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id),
    level TEXT NOT NULL CHECK (level IN ('safe', 'warning', 'danger', 'critical')),
    concentration PPM INTEGER,
    location TEXT,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gas_alerts_patient ON gas_alerts(patient_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_gas_alerts_unresolved ON gas_alerts(resolved, triggered_at DESC) WHERE resolved = FALSE;

-- ============================================================
-- FALL DETECTION
-- ============================================================

CREATE TABLE IF NOT EXISTS fall_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    wearable_id UUID REFERENCES wearables(id),
    device_id UUID REFERENCES devices(id),
    severity TEXT DEFAULT 'high' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    confidence DECIMAL(3,2),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    location_name TEXT,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    emergency_triggered BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fall_events_patient ON fall_events(patient_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_fall_events_unresolved ON fall_events(resolved, triggered_at DESC) WHERE resolved = FALSE;

-- ============================================================
-- REMINDERS
-- ============================================================

CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'general' CHECK (type IN ('medication', 'appointment', 'exercise', 'water', 'general')),
    datetime TIMESTAMPTZ NOT NULL,
    repeat_pattern TEXT, -- "daily", "weekly", "monthly"
    is_active BOOLEAN DEFAULT TRUE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_patient ON reminders(patient_id, is_active, datetime);
CREATE INDEX IF NOT EXISTS idx_reminders_active ON reminders(is_active, datetime) WHERE is_active = TRUE;

-- ============================================================
-- AI CHATS
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model TEXT,
    tokens_used INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id, created_at);

-- ============================================================
-- FOOD & NUTRITION
-- ============================================================

CREATE TABLE IF NOT EXISTS food_data (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    category TEXT CHECK (category IN ('fruits', 'vegetables', 'proteins', 'grains', 'dairy', 'beverages', 'snacks', 'prepared', 'other')),
    calories INTEGER,
    protein_grams DECIMAL(5,2),
    carbs_grams DECIMAL(5,2),
    fat_grams DECIMAL(5,2),
    fiber_grams DECIMAL(5,2),
    sugar_grams DECIMAL(5,2),
    sodium_mg INTEGER,
    glycemic_index INTEGER,
    is_healthy BOOLEAN DEFAULT TRUE,
    restrictions TEXT[], -- ["diabetes", "heart_disease", "hypertension", "kidney"]
    warnings TEXT[],
    benefits TEXT[],
    serving_size TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forbidden_foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    food_id BIGINT REFERENCES food_data(id),
    reason TEXT NOT NULL,
    severity TEXT DEFAULT 'high' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    condition TEXT, -- "diabetes", "heart_disease", etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS favorite_foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    food_id BIGINT REFERENCES food_data(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_category ON food_data(category);
CREATE INDEX IF NOT EXISTS idx_food_restrictions ON food_data(restrictions);
CREATE INDEX IF NOT EXISTS idx_forbidden_patient ON forbidden_foods(patient_id);

-- ============================================================
-- SMART HOME DEVICES
-- ============================================================

CREATE TABLE IF NOT EXISTS smart_home_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL CHECK (device_type IN ('light', 'switch', 'thermostat', 'lock', 'camera', 'sensor', 'speaker', 'tv', 'fan', 'ac', 'other')),
    room TEXT,
    mqtt_topic TEXT,
    status TEXT DEFAULT 'off',
    config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_home_patient ON smart_home_devices(patient_id);

-- ============================================================
-- LOCATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    accuracy INTEGER,
    location_type TEXT DEFAULT 'gps' CHECK (location_type IN ('gps', 'wifi', 'cell', 'manual')),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_patient ON locations(patient_id, recorded_at DESC);

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    medication_reminders BOOLEAN DEFAULT TRUE,
    low_stock_alerts BOOLEAN DEFAULT TRUE,
    emergency_alerts BOOLEAN DEFAULT TRUE,
    chat_alerts BOOLEAN DEFAULT TRUE,
    vitals_alerts BOOLEAN DEFAULT TRUE,
    sound BOOLEAN DEFAULT TRUE,
    vibration BOOLEAN DEFAULT TRUE,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TEXT DEFAULT '22:00',
    quiet_hours_end TEXT DEFAULT '07:00',
    wearable_alerts BOOLEAN DEFAULT TRUE,
    ai_assistant_alerts BOOLEAN DEFAULT TRUE,
    gas_alerts BOOLEAN DEFAULT TRUE,
    fall_alerts BOOLEAN DEFAULT TRUE,
    food_alerts BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SYNC QUEUE (for offline-first)
-- ============================================================

CREATE TABLE IF NOT EXISTS sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
    payload JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
    attempts INTEGER DEFAULT 0,
    last_attempt TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_user ON sync_queue(user_id, status) WHERE status = 'pending';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearables ENABLE ROW LEVEL SECURITY;
ALTER TABLE gas_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fall_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE forbidden_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_home_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Profiles: users see their own
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Patients: users see their own
CREATE POLICY "Users can view own patients" ON patients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own patients" ON patients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own patients" ON patients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own patients" ON patients FOR DELETE USING (auth.uid() = user_id);

-- Notifications: users see their own
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);

-- Medications
CREATE POLICY "Users manage own medications" ON medications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own medication logs" ON medication_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own vitals" ON vitals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own emergency contacts" ON emergency_contacts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own emergency logs" ON emergency_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own devices" ON devices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own wearables" ON wearables FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own gas alerts" ON gas_alerts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own fall events" ON fall_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own reminders" ON reminders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own ai conversations" ON ai_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own ai messages" ON ai_messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own forbidden foods" ON forbidden_foods FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own favorite foods" ON favorite_foods FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own smart home devices" ON smart_home_devices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own locations" ON locations FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE gas_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE fall_events;
ALTER PUBLICATION supabase_realtime ADD TABLE vitals;
ALTER PUBLICATION supabase_realtime ADD TABLE wearables;