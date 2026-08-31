-- Add approval workflow for new user registrations
alter table profiles
  add column if not exists approval_status text not null default 'pending';

-- Existing accounts remain usable
update profiles
set approval_status = 'approved'
where approval_status is null or approval_status = 'pending';

update profiles
set approval_status = 'approved'
where role = 'admin';

-- Auto-created profiles from auth signup start as pending
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, approval_status, full_name)
  values (
    new.id,
    new.email,
    case when new.email = 'admin@glow.com' then 'admin' else 'customer' end,
    case when new.email = 'admin@glow.com' then 'approved' else 'pending' end,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    approval_status = excluded.approval_status;
  return new;
end;
$$ language plpgsql security definer;

-- Users can edit their own profile details (not role/approval)
drop policy if exists "Users can update own profile" on profiles;

create policy "Users can update own profile"
on profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.prevent_profile_escalation()
returns trigger as $$
declare
  actor_is_admin boolean;
begin
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
$$ language plpgsql security definer;

drop trigger if exists protect_profile_privileges on profiles;

create trigger protect_profile_privileges
before update on profiles
for each row execute procedure public.prevent_profile_escalation();

-- Admin can review and approve users
drop policy if exists "Admins can view all profiles" on profiles;
drop policy if exists "Admins can update all profiles" on profiles;

create policy "Admins can view all profiles"
on profiles for select
using (
  exists (
    select 1 from profiles admin_profile
    where admin_profile.id = auth.uid()
    and admin_profile.role = 'admin'
  )
);

create policy "Admins can update all profiles"
on profiles for update
using (
  exists (
    select 1 from profiles admin_profile
    where admin_profile.id = auth.uid()
    and admin_profile.role = 'admin'
  )
);
