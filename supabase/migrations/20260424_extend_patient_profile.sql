-- Add extended patient profile fields for healthcare account hub
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS condition_type text,
  ADD COLUMN IF NOT EXISTS risk_level text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS relationship text DEFAULT 'self';
