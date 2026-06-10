-- =========================
-- INBOX NOTIFICATIONS (customer appointments)
-- =========================

-- Notification messages for customer inbox
create table if not exists public.inbox_notifications (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  appointment_id uuid references public.appointments(id) on delete set null,

  title text not null,
  message text not null,

  -- Marking
  read_at timestamp with time zone,

  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.inbox_notifications enable row level security;

-- Customer can view their own notifications
drop policy if exists "Customers can view own inbox notifications" on public.inbox_notifications;
create policy "Customers can view own inbox notifications"
on public.inbox_notifications for select
using (
  auth.uid() = user_id
);

-- Customer can mark their own notifications as read
drop policy if exists "Customers can update own inbox notifications" on public.inbox_notifications;
create policy "Customers can update own inbox notifications"
on public.inbox_notifications for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

-- =========================
-- Trigger: when a new appointment is created, create inbox notification for the owner.
-- Admin-only customers are also stored in appointments.user_id, so we notify the owner only.
-- =========================

create or replace function public.notify_appointment_created()
returns trigger as $$
declare
  customer_name text;
  treatment_name text;
  appt_date date;
  appt_time text;
  appt_status text;
  owner_id uuid;
  full_message text;
begin
  owner_id := NEW.user_id;
  customer_name := NEW.full_name;
  treatment_name := NEW.treatment;
  appt_date := NEW.appointment_date;
  appt_time := NEW.appointment_time;
  appt_status := NEW.status;

  full_message := format(
    'You have an appointment for %s on %s at %s. Status: %s',
    treatment_name,
    to_char(appt_date, 'YYYY-MM-DD'),
    appt_time,
    appt_status
  );

  insert into public.inbox_notifications (
    user_id,
    appointment_id,
    title,
    message,
    read_at
  )
  values (
    owner_id,
    NEW.id,
    'New appointment requested',
    full_message,
    null
  );

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_appointment_created on public.appointments;
create trigger trg_notify_appointment_created
after insert on public.appointments
for each row
execute procedure public.notify_appointment_created();

