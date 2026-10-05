-- Optional paste in the SQL editor if db push is not used.

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
