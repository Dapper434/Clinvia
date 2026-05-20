-- Quick fix if hospital "Register patient" fails with RLS / permission errors
-- Run in Supabase SQL Editor (safe to re-run)

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


