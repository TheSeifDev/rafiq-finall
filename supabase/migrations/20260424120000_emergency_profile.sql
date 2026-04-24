-- ══════════════════════════════════════════════════════════════
-- Emergency Profile Schema — Consolidated Migration
-- Date: 2026-04-24
-- Purpose: Add structured address, reporter, hospital JSONB
--          columns to patients, plus normalized tables for
--          emergency_contacts and patient_conditions.
--
-- SAFE: All operations use IF NOT EXISTS / IF EXISTS guards.
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────
-- 1. Expand patients table
-- ──────────────────────────────────────────
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS condition_type text,
  ADD COLUMN IF NOT EXISTS risk_level text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS relationship text DEFAULT 'self',
  -- Structured JSONB fields
  ADD COLUMN IF NOT EXISTS address_data jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reporter_data jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hospital_data jsonb DEFAULT '{}',
  -- GPS coordinates
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS geocoded_address text,
  -- Track updates
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- NOTE: Old 'address' column (if it exists) is kept for backward
-- compatibility. It is deprecated and will be removed in a future
-- migration after data has been migrated to address_data.

-- Migrate old address text → address_data (one-time, idempotent)
UPDATE public.patients
  SET address_data = jsonb_build_object('street', address)
  WHERE address IS NOT NULL
    AND address != ''
    AND (address_data IS NULL OR address_data = '{}'::jsonb);

-- Migrate old emergency_contact text → kept as-is (legacy)
-- No structural migration needed; new contacts go to emergency_contacts table.

-- ──────────────────────────────────────────
-- 2. Emergency contacts (normalized)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  relation text NOT NULL,
  phone text NOT NULL,
  priority integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ──────────────────────────────────────────
-- 3. Patient conditions (normalized)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patient_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  condition_key text NOT NULL,
  custom_note text,
  created_at timestamptz DEFAULT now()
);

-- ──────────────────────────────────────────
-- 4. Indexes
-- ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_patients_phone
  ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_patient
  ON public.emergency_contacts(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_conditions_patient
  ON public.patient_conditions(patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_user_id_unique
  ON public.patients(user_id);

-- ──────────────────────────────────────────
-- 5. RLS — emergency_contacts
-- ──────────────────────────────────────────
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'ec_select_own' AND tablename = 'emergency_contacts'
  ) THEN
    CREATE POLICY "ec_select_own" ON public.emergency_contacts FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.patients p WHERE p.id = emergency_contacts.patient_id AND p.user_id = auth.uid())
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'ec_insert_own' AND tablename = 'emergency_contacts'
  ) THEN
    CREATE POLICY "ec_insert_own" ON public.emergency_contacts FOR INSERT TO authenticated WITH CHECK (
      EXISTS (SELECT 1 FROM public.patients p WHERE p.id = emergency_contacts.patient_id AND p.user_id = auth.uid())
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'ec_update_own' AND tablename = 'emergency_contacts'
  ) THEN
    CREATE POLICY "ec_update_own" ON public.emergency_contacts FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = emergency_contacts.patient_id AND p.user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = emergency_contacts.patient_id AND p.user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'ec_delete_own' AND tablename = 'emergency_contacts'
  ) THEN
    CREATE POLICY "ec_delete_own" ON public.emergency_contacts FOR DELETE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = emergency_contacts.patient_id AND p.user_id = auth.uid()));
  END IF;
END $$;

-- ──────────────────────────────────────────
-- 6. RLS — patient_conditions
-- ──────────────────────────────────────────
ALTER TABLE public.patient_conditions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'pc_select_own' AND tablename = 'patient_conditions'
  ) THEN
    CREATE POLICY "pc_select_own" ON public.patient_conditions FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_conditions.patient_id AND p.user_id = auth.uid())
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'pc_insert_own' AND tablename = 'patient_conditions'
  ) THEN
    CREATE POLICY "pc_insert_own" ON public.patient_conditions FOR INSERT TO authenticated WITH CHECK (
      EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_conditions.patient_id AND p.user_id = auth.uid())
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'pc_update_own' AND tablename = 'patient_conditions'
  ) THEN
    CREATE POLICY "pc_update_own" ON public.patient_conditions FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_conditions.patient_id AND p.user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_conditions.patient_id AND p.user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'pc_delete_own' AND tablename = 'patient_conditions'
  ) THEN
    CREATE POLICY "pc_delete_own" ON public.patient_conditions FOR DELETE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_conditions.patient_id AND p.user_id = auth.uid()));
  END IF;
END $$;

-- ──────────────────────────────────────────
-- 7. updated_at triggers
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_patients_updated_at'
  ) THEN
    CREATE TRIGGER trg_patients_updated_at
      BEFORE UPDATE ON public.patients
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_ec_updated_at'
  ) THEN
    CREATE TRIGGER trg_ec_updated_at
      BEFORE UPDATE ON public.emergency_contacts
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- DONE — Emergency profile schema ready.
-- ══════════════════════════════════════════════════════════════
