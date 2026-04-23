-- supabase/migrations/20260423_add_patient_fields.sql
alter table public.patients 
  add column if not exists phone text,
  add column if not exists location text,
  add column if not exists birth_date date;

create index if not exists idx_patients_phone on public.patients(phone);