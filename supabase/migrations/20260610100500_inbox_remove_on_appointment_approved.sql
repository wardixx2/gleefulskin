-- =========================
-- INBOX: remove notification when admin approves appointment
-- =========================

create or replace function public.remove_inbox_notification_on_approved()
returns trigger as $$
begin
  -- If appointment becomes approved, delete its inbox notifications
  if NEW.status = 'Approved' and (OLD.status is distinct from NEW.status) then
    delete from public.inbox_notifications
    where appointment_id = NEW.id;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_remove_inbox_notification_on_approved on public.appointments;
create trigger trg_remove_inbox_notification_on_approved
after update of status on public.appointments
for each row
execute procedure public.remove_inbox_notification_on_approved();

