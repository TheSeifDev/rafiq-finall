-- ==========================================================
-- Medications v2: scheduling, stock tracking, and logs
-- ==========================================================

-- 1) Extend medications table (backward-compatible)
alter table public.medications
  add column if not exists strength text,
  add column if not exists category text,
  add column if not exists reason text,
  add column if not exists form text,
  add column if not exists schedule_type text,
  add column if not exists times jsonb default '[]'::jsonb,
  add column if not exists meal_rule text,
  add column if not exists quantity_type text,
  add column if not exists total_quantity numeric,
  add column if not exists remaining_quantity numeric,
  add column if not exists refill_threshold numeric,
  add column if not exists notes text,
  add column if not exists doctor_name text,
  add column if not exists active boolean default true,
  add column if not exists updated_at timestamptz default now();

-- Backfill / normalize
update public.medications
set
  active = coalesce(active, is_active),
  times = coalesce(times, '[]'::jsonb)
where active is null or times is null;

-- 2) Ensure updated_at trigger exists (function defined in 20260424120000_emergency_profile.sql)
do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_medications_updated_at'
  ) then
    create trigger trg_medications_updated_at
      before update on public.medications
      for each row execute function public.update_updated_at_column();
  end if;
end $$;

-- 3) Medication logs table (taken/skipped/history)
create table if not exists public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid references public.medications(id) on delete cascade not null,
  taken_at timestamptz not null default now(),
  scheduled_for timestamptz,
  skipped boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

alter table public.medication_logs enable row level security;

-- 4) RLS policies for medication_logs (mirrors medication ownership)
do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'medication_logs_select_own' and tablename = 'medication_logs'
  ) then
    create policy "medication_logs_select_own" on public.medication_logs for select to authenticated
      using (
        exists (
          select 1
          from public.medications m
          join public.patients p on p.id = m.patient_id
          where m.id = medication_logs.medication_id and p.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'medication_logs_insert_own' and tablename = 'medication_logs'
  ) then
    create policy "medication_logs_insert_own" on public.medication_logs for insert to authenticated
      with check (
        exists (
          select 1
          from public.medications m
          join public.patients p on p.id = m.patient_id
          where m.id = medication_logs.medication_id and p.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'medication_logs_update_own' and tablename = 'medication_logs'
  ) then
    create policy "medication_logs_update_own" on public.medication_logs for update to authenticated
      using (
        exists (
          select 1
          from public.medications m
          join public.patients p on p.id = m.patient_id
          where m.id = medication_logs.medication_id and p.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.medications m
          join public.patients p on p.id = m.patient_id
          where m.id = medication_logs.medication_id and p.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'medication_logs_delete_own' and tablename = 'medication_logs'
  ) then
    create policy "medication_logs_delete_own" on public.medication_logs for delete to authenticated
      using (
        exists (
          select 1
          from public.medications m
          join public.patients p on p.id = m.patient_id
          where m.id = medication_logs.medication_id and p.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- 5) Indexes for common query paths
create index if not exists idx_medications_patient_active
  on public.medications(patient_id, active);

create index if not exists idx_medications_patient_updated_at_desc
  on public.medications(patient_id, updated_at desc);

create index if not exists idx_medication_logs_medication_taken_at_desc
  on public.medication_logs(medication_id, taken_at desc);

create index if not exists idx_medication_logs_medication_scheduled_for_desc
  on public.medication_logs(medication_id, scheduled_for desc);

