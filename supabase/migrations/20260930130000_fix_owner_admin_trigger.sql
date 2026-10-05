-- Migrations and service-role upserts run without auth.uid(), so the
-- privilege-protection trigger was silently keeping the owner as a customer.

create or replace function public.prevent_profile_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_is_admin boolean;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if auth.role() in ('service_role', 'postgres')
     or current_user in ('postgres', 'supabase_admin')
     or public.is_bootstrap_admin_email(auth.jwt() ->> 'email') then
    return new;
  end if;

  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) into actor_is_admin;

  if not coalesce(actor_is_admin, false) then
    new.role := old.role;
    new.approval_status := old.approval_status;
  end if;

  return new;
end;
$$;

update public.profiles
set
  role = 'admin',
  approval_status = 'approved'
where lower(coalesce(email, '')) = 'edwardraquipo26@gmail.com'
   or id = '8b21eb6b-dcaf-4020-8b82-90b7a82cf35e';
