-- ============================================================================
-- COMPLETE APPOINTMENTS FLOW MIGRATION
-- 1. Check time slot availability & prevent double bookings
-- 2. Allow customers to cancel their own appointments
-- 3. Replace notification removal with real-time status update notifications
-- ============================================================================

-- 1. Function to safely retrieve booked time slots for a given date
create or replace function public.get_booked_time_slots(p_date date)
returns table(appointment_time text)
language sql
security definer
set search_path = public
as $$
  select distinct appointment_time
  from public.appointments
  where appointment_date = p_date
    and status in ('Pending', 'Approved', 'Completed');
$$;

revoke all on function public.get_booked_time_slots(date) from public;
grant execute on function public.get_booked_time_slots(date) to authenticated, anon;

-- 2. Update book_customer_appointment with double-booking prevention
create or replace function public.book_customer_appointment(
  p_full_name text,
  p_email text,
  p_phone text,
  p_treatment text,
  p_price numeric,
  p_ors_required boolean,
  p_ors_number text,
  p_ors_amount numeric,
  p_appointment_date date,
  p_appointment_time text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to book an appointment.';
  end if;

  if coalesce(trim(p_treatment), '') = '' then
    raise exception 'Please select a treatment first.';
  end if;

  if p_appointment_date is null or coalesce(trim(p_appointment_time), '') = '' then
    raise exception 'Please choose a date and time.';
  end if;

  -- Conflict check: Prevent double booking for the same time slot and date
  if exists (
    select 1 from public.appointments
    where appointment_date = p_appointment_date
      and trim(lower(appointment_time)) = trim(lower(p_appointment_time))
      and status in ('Pending', 'Approved', 'Completed')
  ) then
    raise exception 'The time slot % on % is already booked. Please choose another time slot.',
      trim(p_appointment_time), to_char(p_appointment_date, 'YYYY-MM-DD');
  end if;

  insert into public.appointments (
    user_id,
    full_name,
    email,
    phone,
    treatment,
    price,
    treatment_price,
    ors_required,
    ors_number,
    ors_amount,
    appointment_date,
    appointment_time,
    status
  )
  values (
    auth.uid(),
    trim(p_full_name),
    trim(p_email),
    trim(p_phone),
    trim(p_treatment),
    coalesce(p_price, 0)::text,
    p_price,
    coalesce(p_ors_required, false),
    nullif(trim(coalesce(p_ors_number, '')), ''),
    p_ors_amount,
    p_appointment_date,
    trim(p_appointment_time),
    'Pending'
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.book_customer_appointment(
  text, text, text, text, numeric, boolean, text, numeric, date, text
) from public;
grant execute on function public.book_customer_appointment(
  text, text, text, text, numeric, boolean, text, numeric, date, text
) to authenticated;

-- 3. Customer cancellation RPC function
create or replace function public.cancel_customer_appointment(
  p_appointment_id uuid,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_status text;
  v_is_admin boolean;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to cancel an appointment.';
  end if;

  select user_id, status into v_user_id, v_status
  from public.appointments
  where id = p_appointment_id;

  if not found then
    raise exception 'Appointment not found.';
  end if;

  select (role = 'admin') into v_is_admin
  from public.profiles
  where id = auth.uid();

  if auth.uid() <> v_user_id and coalesce(v_is_admin, false) is false then
    raise exception 'You do not have permission to cancel this appointment.';
  end if;

  if v_status in ('Cancelled', 'Declined') then
    raise exception 'This appointment is already cancelled.';
  end if;

  if v_status = 'Completed' then
    raise exception 'Completed appointments cannot be cancelled.';
  end if;

  update public.appointments
  set status = 'Cancelled'
  where id = p_appointment_id;

  return true;
end;
$$;

revoke all on function public.cancel_customer_appointment(uuid, text) from public;
grant execute on function public.cancel_customer_appointment(uuid, text) to authenticated;

-- 4. RLS Policy allowing users to update status to Cancelled on own appointments
drop policy if exists "Users can cancel own appointments" on public.appointments;
create policy "Users can cancel own appointments"
on public.appointments
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id and status = 'Cancelled');

grant update(status) on public.appointments to authenticated;

-- 5. Fix notifications: Remove counterproductive delete trigger and add status change notifications
drop trigger if exists trg_remove_inbox_notification_on_approved on public.appointments;
drop function if exists public.remove_inbox_notification_on_approved();

create or replace function public.notify_appointment_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_msg text;
begin
  -- Only trigger if status actually changed
  if OLD.status is not distinct from NEW.status then
    return NEW;
  end if;

  if NEW.status = 'Approved' then
    v_title := 'Appointment Confirmed & Approved! 🎉';
    v_msg := format(
      'Great news! Your appointment for %s on %s at %s has been confirmed. We look forward to seeing you at Gleeful Skin Wellness Center!',
      NEW.treatment,
      to_char(NEW.appointment_date, 'YYYY-MM-DD'),
      NEW.appointment_time
    );
  elsif NEW.status = 'Cancelled' then
    v_title := 'Appointment Cancelled';
    v_msg := format(
      'Your appointment for %s on %s at %s is now marked as cancelled.',
      NEW.treatment,
      to_char(NEW.appointment_date, 'YYYY-MM-DD'),
      NEW.appointment_time
    );
  elsif NEW.status = 'Declined' then
    v_title := 'Appointment Request Declined';
    v_msg := format(
      'Your appointment request for %s on %s at %s could not be accepted at this time.',
      NEW.treatment,
      to_char(NEW.appointment_date, 'YYYY-MM-DD'),
      NEW.appointment_time
    );
  elsif NEW.status = 'Completed' then
    v_title := 'Treatment Completed! ✨';
    v_msg := format(
      'Thank you for visiting Gleeful Skin Wellness Center for your %s treatment. We hope your skin is glowing!',
      NEW.treatment
    );
  else
    return NEW;
  end if;

  insert into public.inbox_notifications (
    user_id,
    appointment_id,
    title,
    message,
    read_at
  )
  values (
    NEW.user_id,
    NEW.id,
    v_title,
    v_msg,
    null
  );

  return NEW;
exception
  when others then
    raise warning 'Status change notification failed: %', SQLERRM;
    return NEW;
end;
$$;

drop trigger if exists trg_notify_appointment_status_change on public.appointments;
create trigger trg_notify_appointment_status_change
after update of status on public.appointments
for each row
execute procedure public.notify_appointment_status_change();
