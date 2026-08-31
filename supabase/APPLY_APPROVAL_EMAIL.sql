-- Run this in the Supabase SQL Editor so approved users get an in-app inbox notice.
-- Also deploy the Edge Function so they receive an email:
--   npx supabase functions deploy notify-account-approved

create or replace function public.notify_profile_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.approval_status = 'approved'
     and OLD.approval_status is distinct from 'approved' then
    if to_regclass('public.inbox_notifications') is not null then
      insert into public.inbox_notifications (
        user_id,
        appointment_id,
        title,
        message,
        read_at
      )
      values (
        NEW.id,
        null,
        'Account approved',
        'Your Gleeful account has been approved. You can now log in and book appointments.',
        null
      );
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_notify_profile_approved on public.profiles;
create trigger trg_notify_profile_approved
after update of approval_status on public.profiles
for each row
execute procedure public.notify_profile_approved();
