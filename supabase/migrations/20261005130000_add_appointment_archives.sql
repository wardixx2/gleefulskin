-- ============================================================================
-- APPOINTMENTS ARCHIVE MIGRATION
-- 1. Adds archived & archived_at columns
-- 2. Creates RPCs for archiving & restoring appointments
-- 3. Updates booked slots function to ignore archived appointments
-- ============================================================================

-- 1. Add columns to appointments table
alter table public.appointments add column if not exists archived boolean not null default false;
alter table public.appointments add column if not exists archived_at timestamp with time zone;

create index if not exists idx_appointments_archived on public.appointments(archived);

-- 2. Update get_booked_time_slots to ignore archived appointments
create or replace function public.get_booked_time_slots(p_date date)
returns table(appointment_time text)
language sql
security definer
set search_path = public
as $$
  select distinct appointment_time
  from public.appointments
  where appointment_date = p_date
    and status in ('Pending', 'Approved', 'Completed')
    and coalesce(archived, false) is false;
$$;

revoke all on function public.get_booked_time_slots(date) from public;
grant execute on function public.get_booked_time_slots(date) to authenticated, anon;

-- 3. Archive appointment RPC
create or replace function public.archive_appointment(p_appointment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select (role = 'admin') into v_is_admin
  from public.profiles
  where id = auth.uid();

  if coalesce(v_is_admin, false) is false then
    raise exception 'Only administrators can archive appointments.';
  end if;

  update public.appointments
  set archived = true,
      archived_at = now()
  where id = p_appointment_id;

  return true;
end;
$$;

revoke all on function public.archive_appointment(uuid) from public;
grant execute on function public.archive_appointment(uuid) to authenticated;

-- 4. Restore appointment RPC
create or replace function public.restore_appointment(p_appointment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select (role = 'admin') into v_is_admin
  from public.profiles
  where id = auth.uid();

  if coalesce(v_is_admin, false) is false then
    raise exception 'Only administrators can restore appointments.';
  end if;

  update public.appointments
  set archived = false,
      archived_at = null
  where id = p_appointment_id;

  return true;
end;
$$;

revoke all on function public.restore_appointment(uuid) from public;
grant execute on function public.restore_appointment(uuid) to authenticated;
