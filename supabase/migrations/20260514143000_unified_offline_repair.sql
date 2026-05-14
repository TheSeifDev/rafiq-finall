-- RAFIQ unified offline-first repair migration
-- Date: 2026-05-14
-- Purpose:
--   * Add the canonical UUID-first schema used by SQLite, backend APIs, app sync, realtime, AI, MQTT, and emergency systems.
--   * Preserve existing data by keeping legacy integer IDs in legacy_id columns and by adding UUID sync IDs where a table already exists.
--   * Repair known drift: missing vitals_readings, missing durable sync/event tables, invalid gas_alerts shape,
--     incomplete alert tables, missing notification receipt fields, and stale PostgREST schema cache.

create extension if not exists pgcrypto;

create or replace function public.rafiq_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.rafiq_ensure_realtime(table_name text)
returns void
language plpgsql
as $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = table_name
  ) then
    execute format('alter publication supabase_realtime add table public.%I', table_name);
  end if;
exception
  when undefined_object or insufficient_privilege or duplicate_object then
    raise notice 'Realtime publication setup skipped for %. Manage in Supabase dashboard if needed.', table_name;
end;
$$;

create table if not exists public.rafiq_entity_uuid_map (
  table_name text not null,
  legacy_id text not null,
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  primary key (table_name, legacy_id),
  unique (table_name, id)
);

-- Preserve incompatible legacy tables before the UUID-first schema is created.
-- Older RAFIQ migrations used BIGSERIAL patients.id and BIGINT patient_id; those
-- tables cannot safely receive UUID foreign keys in place.
do $$
declare
  tbl text;
  suffix text := to_char(clock_timestamp(), 'YYYYMMDDHH24MISS');
  candidates text[] := array[
    'patients',
    'emergency_contacts',
    'medications',
    'medication_logs',
    'vitals',
    'emergency_logs',
    'devices',
    'wearables',
    'gas_alerts',
    'fall_events',
    'reminders',
    'ai_conversations',
    'forbidden_foods',
    'favorite_foods',
    'smart_home_devices',
    'locations',
    'sync_queue'
  ];
begin
  foreach tbl in array candidates loop
    if to_regclass(format('public.%I', tbl)) is not null and exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = tbl
        and (
          (c.column_name = 'id' and c.data_type <> 'uuid')
          or (c.column_name = 'patient_id' and c.data_type <> 'uuid')
        )
    ) then
      execute format('alter table public.%I rename to %I', tbl, tbl || '_legacy_' || suffix);
      raise notice 'Preserved incompatible legacy table public.% as public.%', tbl, tbl || '_legacy_' || suffix;
    end if;
  end loop;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'caregiver', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  age integer check (age is null or age between 0 and 150),
  gender text check (gender is null or gender in ('male', 'female')),
  blood_type text check (blood_type is null or blood_type in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  phone text,
  birth_date date,
  height_cm integer,
  weight_kg numeric(6,2),
  medical_history text,
  allergies text,
  chronic_conditions text[] default '{}',
  emergency_notes text,
  condition_type text,
  risk_level text,
  notes text,
  relationship text default 'self',
  address text,
  emergency_contact text,
  location text,
  address_data jsonb not null default '{}'::jsonb,
  reporter_data jsonb not null default '{}'::jsonb,
  hospital_data jsonb not null default '{}'::jsonb,
  latitude double precision,
  longitude double precision,
  geocoded_address text,
  device_id uuid,
  version integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  legacy_patients text;
begin
  select c.relname
    into legacy_patients
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname like 'patients_legacy_%'
  order by c.relname desc
  limit 1;

  if legacy_patients is not null then
    execute format(
      'insert into public.rafiq_entity_uuid_map(table_name, legacy_id)
       select %L, id::text from public.%I
       on conflict (table_name, legacy_id) do nothing',
      'patients',
      legacy_patients
    );

    execute format(
      'insert into public.patients
        (id, legacy_id, user_id, full_name, age, gender, blood_type, medical_history,
         allergies, chronic_conditions, emergency_notes, created_at, updated_at)
       select
        m.id,
        p.id::text,
        p.user_id,
        coalesce(p.full_name, ''Legacy patient '' || p.id::text),
        p.age,
        p.gender,
        p.blood_type,
        p.medical_history,
        p.allergies,
        coalesce(p.chronic_conditions, ''{}''::text[]),
        p.emergency_notes,
        coalesce(p.created_at, now()),
        coalesce(p.updated_at, now())
       from public.%I p
       join public.rafiq_entity_uuid_map m
         on m.table_name = %L and m.legacy_id = p.id::text
       where p.user_id is not null
       on conflict (id) do nothing',
      legacy_patients,
      'patients'
    );
  end if;
end $$;

create table if not exists public.patient_conditions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  condition_key text not null,
  custom_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, condition_key)
);

create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  patient_id uuid not null references public.patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  relation text,
  relationship text,
  phone text not null,
  phone_number text,
  email text,
  priority integer not null default 1,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  patient_id uuid references public.patients(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  device_name text not null,
  name text,
  device_type text not null default 'other',
  type text,
  mac_address text,
  ip_address text,
  firmware_version text,
  status text not null default 'offline' check (status in ('online', 'offline', 'error', 'maintenance', 'disconnected', 'syncing')),
  last_seen timestamptz,
  battery_level integer check (battery_level is null or battery_level between 0 and 100),
  signal_strength integer,
  location text,
  mqtt_topic text,
  config jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.esp32_devices (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.devices(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  chip_id text unique,
  mqtt_client_id text,
  board_type text default 'esp32',
  firmware_version text,
  ip_address text,
  last_boot_at timestamptz,
  last_seen timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wearables (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  device_name text not null,
  device_model text,
  mac_address text,
  ble_uuid text,
  paired_at timestamptz not null default now(),
  last_sync timestamptz,
  battery_level integer,
  firmware_version text,
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'syncing', 'error')),
  config jsonb not null default '{}'::jsonb,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vitals_readings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  source text not null default 'manual' check (source in ('manual', 'smartwatch', 'ble', 'bluetooth', 'auto', 'esp32', 'backend')),
  heart_rate integer,
  oxygen_level numeric(4,1),
  oxygen_saturation numeric(4,1),
  blood_pressure_systolic integer,
  blood_pressure_diastolic integer,
  temperature numeric(4,1),
  respiratory_rate integer,
  blood_glucose numeric(6,1),
  weight_kg numeric(6,2),
  steps integer,
  steps_count integer,
  sleep_hours numeric(4,1),
  stress_level integer check (stress_level is null or stress_level between 1 and 10),
  device_id uuid references public.devices(id) on delete set null,
  device_name text,
  confidence numeric(4,3),
  raw_payload jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.vitals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  heart_rate integer,
  blood_pressure_systolic integer,
  blood_pressure_diastolic integer,
  oxygen_saturation numeric(4,1),
  temperature numeric(4,1),
  respiratory_rate integer,
  source text not null default 'manual',
  device_id uuid references public.devices(id) on delete set null,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  dosage text,
  strength text,
  category text,
  reason text,
  form text,
  frequency text,
  schedule_type text,
  times jsonb not null default '[]'::jsonb,
  time_of_day text[] default '{}',
  meal_rule text,
  quantity_type text,
  total_quantity numeric,
  remaining_quantity numeric,
  refill_threshold numeric,
  duration_days integer,
  start_date date,
  end_date date,
  instructions text,
  side_effects text,
  notes text,
  doctor_name text,
  active boolean not null default true,
  is_active boolean not null default true,
  version integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  taken_at timestamptz not null default now(),
  scheduled_for timestamptz,
  skipped boolean not null default false,
  skipped_reason text,
  note text,
  notes text,
  source text not null default 'manual' check (source in ('manual', 'wearable', 'auto', 'backend')),
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  patient_id uuid not null references public.patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  type text not null default 'general',
  time timestamptz,
  datetime timestamptz,
  repeat text default 'none',
  repeat_pattern text,
  done boolean not null default false,
  completed boolean not null default false,
  completed_at timestamptz,
  is_active boolean not null default true,
  source text not null default 'local',
  version integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminders_has_schedule check (time is not null or datetime is not null)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  title text not null,
  body text not null,
  type text,
  category text not null default 'system' check (category in ('emergency', 'health', 'medication', 'device', 'chat', 'system', 'food', 'wearable')),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  is_read boolean not null default false,
  is_pinned boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  screen text,
  source text not null default 'local' check (source in ('local', 'backend', 'wearable', 'ai', 'system')),
  idempotency_key text,
  delivered_at timestamptz,
  read_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

alter table public.notifications add column if not exists patient_id uuid references public.patients(id) on delete set null;
alter table public.notifications add column if not exists category text not null default 'system';
alter table public.notifications add column if not exists severity text not null default 'medium';
alter table public.notifications add column if not exists is_pinned boolean not null default false;
alter table public.notifications add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.notifications add column if not exists screen text;
alter table public.notifications add column if not exists source text not null default 'local';
alter table public.notifications add column if not exists idempotency_key text;
alter table public.notifications add column if not exists delivered_at timestamptz;
alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists acknowledged_at timestamptz;
alter table public.notifications add column if not exists updated_at timestamptz not null default now();

create table if not exists public.notification_receipts (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid,
  channel text not null default 'local',
  status text not null default 'pending' check (status in ('pending', 'scheduled', 'delivered', 'read', 'failed', 'acknowledged')),
  attempts integer not null default 0,
  last_error text,
  scheduled_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.emergency_events (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  patient_id uuid references public.patients(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('sos', 'fall', 'gas', 'oxygen', 'heart_rate', 'respiratory', 'medical', 'device', 'manual', 'general')),
  severity text not null default 'high' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'active' check (status in ('active', 'acknowledged', 'resolved', 'cancelled')),
  message text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  location_name text,
  source text not null default 'system',
  source_event_id uuid,
  response_time integer,
  triggered_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved boolean not null default false,
  notes text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  patient_id uuid references public.patients(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  emergency_event_id uuid references public.emergency_events(id) on delete set null,
  type text not null default 'general',
  message text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  source text,
  is_read boolean not null default false,
  resolved boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fall_detection_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  wearable_id uuid references public.wearables(id) on delete set null,
  device_id uuid references public.devices(id) on delete set null,
  severity text not null default 'high' check (severity in ('low', 'medium', 'high', 'critical')),
  confidence numeric(4,3),
  latitude numeric(10,7),
  longitude numeric(10,7),
  location_name text,
  emergency_triggered boolean not null default false,
  resolved boolean not null default false,
  triggered_at timestamptz not null default now(),
  resolved_at timestamptz,
  notes text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.gas_alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  level text not null check (level in ('safe', 'warning', 'danger', 'critical')),
  concentration_ppm integer,
  location text,
  triggered_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved boolean not null default false,
  notes text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.oxygen_alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  vital_reading_id uuid references public.vitals_readings(id) on delete set null,
  oxygen_saturation numeric(4,1) not null,
  threshold numeric(4,1) not null default 94,
  severity text not null default 'high',
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.heart_rate_alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  vital_reading_id uuid references public.vitals_readings(id) on delete set null,
  heart_rate integer not null,
  threshold_low integer,
  threshold_high integer,
  severity text not null default 'medium',
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.respiratory_alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  vital_reading_id uuid references public.vitals_readings(id) on delete set null,
  respiratory_rate integer not null,
  threshold_low integer,
  threshold_high integer,
  severity text not null default 'medium',
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.mqtt_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  topic text not null,
  qos integer default 0,
  retain boolean default false,
  direction text not null check (direction in ('inbound', 'outbound')),
  payload jsonb not null default '{}'::jsonb,
  payload_text text,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.sensor_readings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  sensor_type text not null,
  value numeric,
  unit text,
  room text,
  raw_payload jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.smart_home_devices (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  device_name text not null,
  device_type text not null default 'other',
  room text,
  mqtt_topic text,
  status text not null default 'off',
  state jsonb not null default '{}'::jsonb,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.smart_home_commands (
  id uuid primary key default gen_random_uuid(),
  smart_home_device_id uuid references public.smart_home_devices(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  command text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'acknowledged', 'failed')),
  requested_at timestamptz not null default now(),
  sent_at timestamptz,
  acknowledged_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  automation_name text,
  trigger_type text,
  action text,
  status text not null default 'completed',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.relay_logs (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.devices(id) on delete set null,
  state text not null,
  source text not null default 'mqtt',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.radar_presence_logs (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.devices(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  presence boolean not null,
  distance_cm numeric,
  zone text,
  raw_payload jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  summary text,
  provider text,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_conversations(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  reasoning_details text,
  model text,
  provider text,
  tokens_used integer,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_memory (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  memory_type text not null default 'general',
  key text not null,
  value jsonb not null default '{}'::jsonb,
  confidence numeric(4,3),
  source_message_id uuid references public.ai_messages(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, memory_type, key)
);

create table if not exists public.ai_context (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  context_type text not null,
  data jsonb not null default '{}'::jsonb,
  last_built_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_personality (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  language text not null default 'ar',
  tone text not null default 'warm',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_voice_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  stt_provider text,
  tts_provider text,
  transcript text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_emotion_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  emotion text not null,
  confidence numeric(4,3),
  source text not null default 'ai',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_reminders (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid references public.reminders(id) on delete cascade,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  patient_id uuid references public.patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  instruction text,
  created_at timestamptz not null default now()
);

create table if not exists public.pending_sync (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  device_id uuid,
  table_name text not null,
  record_id uuid not null,
  operation text not null check (operation in ('insert', 'update', 'delete', 'upsert')),
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'synced', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.failed_sync (
  id uuid primary key default gen_random_uuid(),
  pending_sync_id uuid,
  user_id uuid references auth.users(id) on delete cascade,
  device_id uuid,
  table_name text not null,
  record_id uuid,
  operation text not null,
  payload jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text not null,
  attempts integer not null default 0,
  failed_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text
);

create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  device_id uuid,
  direction text not null check (direction in ('push', 'pull', 'realtime', 'repair')),
  table_name text,
  record_id uuid,
  status text not null check (status in ('started', 'success', 'partial', 'failed')),
  pushed integer not null default 0,
  pulled integer not null default 0,
  failed integer not null default 0,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.realtime_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  table_name text not null,
  record_id uuid,
  event_type text not null check (event_type in ('INSERT', 'UPDATE', 'DELETE', 'BROADCAST')),
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.health_status (
  id uuid primary key default gen_random_uuid(),
  service text not null unique default 'database',
  status text not null default 'ok',
  checked_at timestamptz not null default now()
);
insert into public.health_status (service, status)
values ('database', 'ok')
on conflict (service) do update set status = excluded.status, checked_at = now();

-- Compatibility alias for older app code. If an old fall_events table already
-- exists, preserve it for the explicit repair/backfill phase instead of
-- replacing it with a view.
do $$
begin
  if to_regclass('public.fall_events') is null then
    execute 'create view public.fall_events with (security_invoker = true) as select * from public.fall_detection_events';
  end if;
end $$;

-- Helpful indexes.
create index if not exists idx_patients_user_id on public.patients(user_id);
create index if not exists idx_patients_updated_at on public.patients(updated_at desc);
create index if not exists idx_patient_conditions_patient on public.patient_conditions(patient_id);
create index if not exists idx_contacts_patient_priority on public.emergency_contacts(patient_id, priority);
create index if not exists idx_devices_patient_status on public.devices(patient_id, status, last_seen desc);
create index if not exists idx_esp32_device_seen on public.esp32_devices(device_id, last_seen desc);
create index if not exists idx_vitals_readings_patient_time on public.vitals_readings(patient_id, recorded_at desc);
create index if not exists idx_vitals_readings_user_time on public.vitals_readings(user_id, recorded_at desc);
create index if not exists idx_vitals_patient_time on public.vitals(patient_id, recorded_at desc);
create index if not exists idx_medications_patient_active on public.medications(patient_id, active, updated_at desc);
create index if not exists idx_medication_logs_medication_time on public.medication_logs(medication_id, taken_at desc);
create index if not exists idx_reminders_patient_active_time on public.reminders(patient_id, is_active, coalesce(datetime, time));
create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications(user_id, is_read) where is_read = false;
create index if not exists idx_notifications_severity on public.notifications(user_id, severity, created_at desc);
create index if not exists idx_notification_receipts_notification on public.notification_receipts(notification_id, status);
create index if not exists idx_emergency_events_patient_time on public.emergency_events(patient_id, triggered_at desc);
create index if not exists idx_emergency_events_active on public.emergency_events(resolved, triggered_at desc) where resolved = false;
create index if not exists idx_alerts_patient_time on public.alerts(patient_id, created_at desc);
create index if not exists idx_fall_events_patient_time on public.fall_detection_events(patient_id, triggered_at desc);
create index if not exists idx_gas_alerts_patient_time on public.gas_alerts(patient_id, triggered_at desc);
create index if not exists idx_mqtt_events_topic_time on public.mqtt_events(topic, received_at desc);
create index if not exists idx_sensor_readings_device_time on public.sensor_readings(device_id, recorded_at desc);
create index if not exists idx_ai_messages_conversation_time on public.ai_messages(conversation_id, created_at);
create index if not exists idx_pending_sync_ready on public.pending_sync(status, next_attempt_at, priority);
create index if not exists idx_realtime_events_user_time on public.realtime_events(user_id, created_at desc);

-- updated_at triggers.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','patients','patient_conditions','emergency_contacts','devices','esp32_devices','wearables',
    'medications','reminders','notifications','notification_receipts','emergency_events','alerts',
    'smart_home_devices','ai_conversations','ai_memory','ai_context','ai_personality','pending_sync'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.rafiq_touch_updated_at()', t, t);
  end loop;
end $$;

-- RLS helpers and policies.
create or replace function public.rafiq_patient_owned(patient uuid)
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1 from public.patients p
    where p.id = patient
      and p.user_id = auth.uid()
  );
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','patients','patient_conditions','emergency_contacts','devices','esp32_devices','wearables',
    'vitals','vitals_readings','medications','medication_logs','reminders','notifications','notification_receipts',
    'emergency_events','alerts','fall_detection_events','gas_alerts','oxygen_alerts','heart_rate_alerts','respiratory_alerts',
    'mqtt_events','sensor_readings','smart_home_devices','smart_home_commands','automation_logs','relay_logs','radar_presence_logs',
    'ai_conversations','ai_messages','ai_memory','ai_context','ai_personality','ai_voice_sessions','ai_emotion_logs','ai_reminders',
    'pending_sync','failed_sync','sync_logs','realtime_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

drop policy if exists profiles_own_select on public.profiles;
drop policy if exists profiles_own_insert on public.profiles;
drop policy if exists profiles_own_update on public.profiles;
create policy profiles_own_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_own_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_own_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists patients_own_all on public.patients;
create policy patients_own_all on public.patients for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare
  t text;
begin
  foreach t in array array[
    'notifications','notification_receipts','pending_sync','failed_sync','sync_logs','realtime_events'
  ]
  loop
    execute format('drop policy if exists %I_user_all on public.%I', t, t);
    execute format('create policy %I_user_all on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t, t);
  end loop;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'patient_conditions','emergency_contacts','devices','esp32_devices','wearables','vitals','vitals_readings',
    'medications','medication_logs','reminders','emergency_events','alerts','fall_detection_events','gas_alerts',
    'oxygen_alerts','heart_rate_alerts','respiratory_alerts','mqtt_events','sensor_readings','smart_home_devices',
    'automation_logs','radar_presence_logs','ai_conversations','ai_messages','ai_memory','ai_context',
    'ai_personality','ai_voice_sessions','ai_emotion_logs','ai_reminders'
  ]
  loop
    execute format('drop policy if exists %I_patient_or_user_all on public.%I', t, t);
    execute format(
      'create policy %I_patient_or_user_all on public.%I for all to authenticated using ((user_id = auth.uid()) or public.rafiq_patient_owned(patient_id)) with check ((user_id = auth.uid()) or public.rafiq_patient_owned(patient_id))',
      t, t
    );
  end loop;
end $$;

drop policy if exists smart_home_commands_user_all on public.smart_home_commands;
create policy smart_home_commands_user_all on public.smart_home_commands
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists relay_logs_device_owner_select on public.relay_logs;
create policy relay_logs_device_owner_select on public.relay_logs
  for select to authenticated
  using (
    exists (
      select 1
      from public.devices d
      where d.id = relay_logs.device_id
        and (d.user_id = auth.uid() or public.rafiq_patient_owned(d.patient_id))
    )
  );

-- Realtime table set. Realtime is a wake-up channel; pull sync remains authoritative.
select public.rafiq_ensure_realtime('notifications');
select public.rafiq_ensure_realtime('emergency_events');
select public.rafiq_ensure_realtime('alerts');
select public.rafiq_ensure_realtime('fall_detection_events');
select public.rafiq_ensure_realtime('gas_alerts');
select public.rafiq_ensure_realtime('vitals_readings');
select public.rafiq_ensure_realtime('realtime_events');

-- Data API grants. RLS still controls rows.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.health_status to anon, authenticated;
grant select on public.fall_events to authenticated;

-- Refresh PostgREST schema cache to prevent PGRST204/PGRST205 after SQL migrations.
notify pgrst, 'reload schema';
