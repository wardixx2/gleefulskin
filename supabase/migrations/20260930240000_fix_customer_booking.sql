-- Keep booking working even if the inbox notification insert is blocked by RLS.
-- Also let customers insert their own inbox rows, and book via a single RPC.

create or replace function public.notify_appointment_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
    'New appointment requested',
    format(
      'You have an appointment for %s on %s at %s. Status: %s',
      NEW.treatment,
      to_char(NEW.appointment_date, 'YYYY-MM-DD'),
      NEW.appointment_time,
      coalesce(NEW.status, 'Pending')
    ),
    null
  );

  return NEW;
exception
  when others then
    raise warning 'inbox notification skipped: %', SQLERRM;
    return NEW;
end;
$$;

drop policy if exists "Customers can insert own inbox notifications" on public.inbox_notifications;
create policy "Customers can insert own inbox notifications"
on public.inbox_notifications
for insert
to authenticated
with check (auth.uid() = user_id);

grant select, insert, update on public.inbox_notifications to authenticated;
grant select, insert on public.appointments to authenticated;
grant select on public.treatments to authenticated, anon;

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
