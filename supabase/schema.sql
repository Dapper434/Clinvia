-- TBTrack — run in Supabase SQL Editor (NEW project only)
-- Creates tables, RLS, profile trigger, and optional seed data.
--
-- ALREADY ran an older version of this file (roles: nurse/admin/viewer only)?
--   → Do NOT run this again. Run migration_patient_portal.sql instead.

-- Profiles (hospital staff + patient portal users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'hospital' check (role in ('nurse', 'admin', 'viewer', 'hospital', 'patient')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup (role from signup metadata)
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Patients (user_id links self-service patient accounts)
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null,
  age int,
  gender text check (gender in ('male', 'female', 'other')),
  phone text,
  address text,
  facility text,
  tb_type text check (tb_type in ('pulmonary', 'extra-pulmonary')),
  regimen text,
  treatment_start date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'lost', 'died')),
  mdr_flag boolean not null default false,
  lat double precision,
  lng double precision,
  registered_by uuid references auth.users (id)
);

create index if not exists patients_user_id_idx on public.patients (user_id);

-- Dose logs (unique per patient per calendar day for upsert)
create table if not exists public.dose_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  date date not null,
  taken boolean not null,
  notes text,
  logged_by uuid references auth.users (id),
  unique (patient_id, date)
);

create table if not exists public.lab_results (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  test_type text not null check (test_type in ('sputum_smear', 'genexpert', 'xray', 'culture')),
  result text not null check (result in ('positive', 'negative', 'pending')),
  result_date date not null,
  lab_ref text,
  notes text,
  mdr_detected boolean not null default false
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  source_patient_id uuid not null references public.patients (id) on delete cascade,
  name text not null,
  age int,
  relationship text check (relationship in ('spouse', 'child', 'parent', 'roommate', 'other')),
  phone text,
  screened boolean not null default false,
  screen_result text check (screen_result is null or screen_result in ('negative', 'referred', 'confirmed_tb')),
  screened_date date
);

create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  county text,
  sub_county text,
  lat double precision,
  lng double precision,
  phone text
);

-- RLS helpers
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

alter table public.patients enable row level security;
alter table public.dose_logs enable row level security;
alter table public.lab_results enable row level security;
alter table public.contacts enable row level security;
alter table public.facilities enable row level security;

-- Patients
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

-- Dose logs
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

-- Labs & contacts: hospital staff only
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

-- Optional seed facilities + demo patients (safe to re-run)
insert into public.facilities (name, county, sub_county, lat, lng, phone)
select v.name, v.county, v.sub_county, v.lat, v.lng, v.phone
from (
  values
    ('Thika Level 5', 'Kiambu', 'Thika', -1.0332::double precision, 37.0693::double precision, '+254700000001'),
    ('Kiambu County Hospital', 'Kiambu', 'Kiambu Town', -1.1741::double precision, 36.8356::double precision, '+254700000002'),
    ('Kenyatta National Hospital', 'Nairobi', 'Nairobi', -1.2921::double precision, 36.8219::double precision, '+254700000003')
) as v(name, county, sub_county, lat, lng, phone)
where not exists (select 1 from public.facilities f where f.name = v.name);

insert into public.patients (name, age, gender, tb_type, regimen, treatment_start, status, facility, lat, lng)
select v.name, v.age, v.gender, v.tb_type, v.regimen, v.treatment_start::date, v.status, v.facility, v.lat, v.lng
from (
  values
    ('James Mwangi', 34, 'male', 'pulmonary', 'HRZE', '2026-01-10', 'active', 'Thika Level 5', -1.0332::double precision, 37.0693::double precision),
    ('Faith Wanjiru', 27, 'female', 'pulmonary', 'HRZE', '2026-02-01', 'active', 'Kiambu County Hospital', -1.1741::double precision, 36.8356::double precision),
    ('Peter Otieno', 45, 'male', 'extra-pulmonary', 'HRE', '2025-12-15', 'active', 'Kenyatta National Hospital', -1.2921::double precision, 36.8219::double precision)
) as v(name, age, gender, tb_type, regimen, treatment_start, status, facility, lat, lng)
where not exists (select 1 from public.patients p where p.name = v.name);
