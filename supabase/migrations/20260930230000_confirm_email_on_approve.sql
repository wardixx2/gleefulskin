-- Gleeful uses admin approval, not the Auth confirmation email.
-- Confirm the Auth user when a profile is approved so they can log in.

create or replace function public.confirm_auth_email(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if target_user_id is null then
    return;
  end if;

  update auth.users
  set
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
  where id = target_user_id
    and email_confirmed_at is null;
end;
$$;

revoke all on function public.confirm_auth_email(uuid) from public;
grant execute on function public.confirm_auth_email(uuid) to service_role;

create or replace function public.confirm_auth_email_on_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.approval_status = 'approved'
     and (TG_OP = 'INSERT' or OLD.approval_status is distinct from 'approved') then
    perform public.confirm_auth_email(NEW.id);
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_confirm_auth_email_on_approved on public.profiles;
create trigger trg_confirm_auth_email_on_approved
after insert or update of approval_status on public.profiles
for each row
execute procedure public.confirm_auth_email_on_approved();

update auth.users as u
set
  email_confirmed_at = coalesce(u.email_confirmed_at, now()),
  updated_at = now()
from public.profiles as p
where p.id = u.id
  and p.approval_status = 'approved'
  and u.email_confirmed_at is null;
