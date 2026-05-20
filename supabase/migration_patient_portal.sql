-- TBTrack — UPGRADE script (existing project that ran the OLD schema.sql)
-- Run this ONCE in Supabase SQL Editor if you already have tables + old RLS policies.
-- Do NOT paste the old schema again — it will conflict with what is already there.
--
-- New projects: run schema.sql only (it already includes everything below).

-- 1) Extend profile roles (old: nurse, admin, viewer only)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('nurse', 'admin', 'viewer', 'hospital', 'patient'));

-- 2) Link patient portal accounts to auth users
alter table public.patients add column if not exists user_id uuid unique references auth.users (id) on delete set null;
create index if not exists patients_user_id_idx on public.patients (user_id);

-- 3) Signup trigger: read role from signup metadata (hospital vs patient)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_role text;
begin
  signup_role := coalesce(new.raw_user_meta_data->>'role', 'hospital');
  if signup_role not in ('nurse', 'admin', 'viewer', 'hospital', 'patient') then
    signup_role := 'hospital';
  end if;
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    signup_role
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    role = excluded.role;
  return new;
end;
$$;

-- 4) RLS helper functions
create or replace function public.is_hospital_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'patient'
    ) then false
    when not exists (select 1 from public.profiles p where p.id = auth.uid()) then true
    else exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('nurse', 'admin', 'viewer', 'hospital')
    )
  end;
$$;

create or replace function public.is_patient_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'patient'
  );
$$;

create or replace function public.my_patient_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id from public.patients p where p.user_id = auth.uid() limit 1;
$$;

-- 5) Remove OLD open policies (from hackathon schema)
drop policy if exists "patients_authenticated_all" on public.patients;
drop policy if exists "dose_logs_authenticated_all" on public.dose_logs;
drop policy if exists "lab_results_authenticated_all" on public.lab_results;
drop policy if exists "contacts_authenticated_all" on public.contacts;
drop policy if exists "facilities_authenticated_all" on public.facilities;

-- 6) Remove NEW policies if re-running this script
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

-- 7) Create role-scoped policies
create policy "patients_hospital_select"
  on public.patients for select
  using (public.is_hospital_staff());

create policy "patients_hospital_insert"
  on public.patients for insert
  with check (public.is_hospital_staff());

create policy "patients_hospital_update"
  on public.patients for update
  using (public.is_hospital_staff());

create policy "patients_hospital_delete"
  on public.patients for delete
  using (public.is_hospital_staff());

create policy "patients_self_select"
  on public.patients for select
  using (user_id = auth.uid());

create policy "patients_self_insert"
  on public.patients for insert
  with check (public.is_patient_user() and user_id = auth.uid());

create policy "patients_self_update_link"
  on public.patients for update
  using (public.is_patient_user() and (user_id is null or user_id = auth.uid()))
  with check (user_id = auth.uid());

create policy "dose_logs_hospital_all"
  on public.dose_logs for all
  using (public.is_hospital_staff())
  with check (public.is_hospital_staff());

create policy "dose_logs_patient_select"
  on public.dose_logs for select
  using (patient_id = public.my_patient_id());

create policy "dose_logs_patient_insert"
  on public.dose_logs for insert
  with check (patient_id = public.my_patient_id());

create policy "dose_logs_patient_update"
  on public.dose_logs for update
  using (patient_id = public.my_patient_id())
  with check (patient_id = public.my_patient_id());

create policy "lab_results_hospital_all"
  on public.lab_results for all
  using (public.is_hospital_staff())
  with check (public.is_hospital_staff());

create policy "contacts_hospital_all"
  on public.contacts for all
  using (public.is_hospital_staff())
  with check (public.is_hospital_staff());

create policy "facilities_hospital_select"
  on public.facilities for select
  using (public.is_hospital_staff());

create policy "facilities_patient_select"
  on public.facilities for select
  using (public.is_patient_user());
