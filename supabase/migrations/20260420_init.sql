create extension if not exists pgcrypto;

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  full_name text not null,
  age integer,
  gender text,
  blood_type text,
  phone text,
  created_at timestamptz default now()
);

create table if not exists public.vitals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients not null,
  heart_rate integer,
  blood_pressure_systolic integer,
  blood_pressure_diastolic integer,
  oxygen_saturation integer,
  temperature decimal,
  source text default 'manual',
  recorded_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients not null,
  name text not null,
  dosage text not null,
  frequency text not null,
  time_of_day text[],
  start_date date,
  end_date date,
  instructions text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  body text not null,
  type text,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.patients enable row level security;
alter table public.vitals enable row level security;
alter table public.medications enable row level security;
alter table public.notifications enable row level security;

create policy "patients_select_own" on public.patients for select using (auth.uid() = user_id);
create policy "patients_modify_own" on public.patients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "vitals_select_own" on public.vitals for select using (
  exists (select 1 from public.patients p where p.id = vitals.patient_id and p.user_id = auth.uid())
);
create policy "vitals_modify_own" on public.vitals for all using (
  exists (select 1 from public.patients p where p.id = vitals.patient_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.patients p where p.id = vitals.patient_id and p.user_id = auth.uid())
);

create policy "medications_select_own" on public.medications for select using (
  exists (select 1 from public.patients p where p.id = medications.patient_id and p.user_id = auth.uid())
);
create policy "medications_modify_own" on public.medications for all using (
  exists (select 1 from public.patients p where p.id = medications.patient_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.patients p where p.id = medications.patient_id and p.user_id = auth.uid())
);

create policy "notifications_select_own" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_modify_own" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
