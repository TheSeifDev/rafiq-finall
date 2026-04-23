-- ==========================================================
-- Fix patients RLS policies for the deferred signup flow.
--
-- Problem: The original "patients_modify_own" FOR ALL policy
-- blocks INSERT when there's no active session (e.g. after
-- signUp with email confirmation). We now split policies
-- into explicit INSERT / UPDATE / DELETE for clarity.
--
-- The app now defers patient row creation to first login
-- (where auth.uid() IS available), so INSERT works correctly.
-- ==========================================================

-- Drop the combined "modify" policy that was too broad
drop policy if exists "patients_modify_own" on public.patients;

-- INSERT: authenticated users can create ONLY their own row
create policy "patients_insert_own"
  on public.patients
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- UPDATE: authenticated users can update ONLY their own row
create policy "patients_update_own"
  on public.patients
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: authenticated users can delete ONLY their own row
create policy "patients_delete_own"
  on public.patients
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Ensure unique constraint: one patient row per auth user
create unique index if not exists idx_patients_user_id_unique
  on public.patients(user_id);
