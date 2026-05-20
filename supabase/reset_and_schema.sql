-- TBTrack — FULL RESET then fresh install (dev/demo only)
-- Run in Supabase SQL Editor. Deletes all app data and policies.
-- Auth users in Authentication are NOT deleted — remove them in Dashboard if needed.

-- Drop policies
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;

drop policy if exists "patients_authenticated_all" on public.patients;
drop policy if exists "dose_logs_authenticated_all" on public.dose_logs;
drop policy if exists "lab_results_authenticated_all" on public.lab_results;
drop policy if exists "contacts_authenticated_all" on public.contacts;
drop policy if exists "facilities_authenticated_all" on public.facilities;

drop policy if exists "patients_hospital_select" on public.patients;
drop policy if exists "patients_hospital_insert" on public.patients;
drop policy if exists "patients_hospital_update" on public.patients;
drop policy if exists "patients_hospital_delete" on public.patients;
drop policy if exists "patients_self_select" on public.patients;
drop policy if exists "patients_self_insert" on public.patients;
drop policy if exists "patients_self_update_link" on public.patients;

drop policy if exists "dose_logs_hospital_all" on public.dose_logs;
drop policy if exists "dose_logs_patient_select" on public.dose_logs;
drop policy if exists "dose_logs_patient_insert" on public.dose_logs;
drop policy if exists "dose_logs_patient_update" on public.dose_logs;

drop policy if exists "lab_results_hospital_all" on public.lab_results;
drop policy if exists "contacts_hospital_all" on public.contacts;
drop policy if exists "facilities_hospital_select" on public.facilities;
drop policy if exists "facilities_patient_select" on public.facilities;

-- Drop trigger & tables (order matters for FKs)
drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.dose_logs cascade;
drop table if exists public.lab_results cascade;
drop table if exists public.contacts cascade;
drop table if exists public.patients cascade;
drop table if exists public.facilities cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_hospital_staff() cascade;
drop function if exists public.is_patient_user() cascade;
drop function if exists public.my_patient_id() cascade;

-- === Paste the rest of schema.sql below, OR run schema.sql as a second query ===
