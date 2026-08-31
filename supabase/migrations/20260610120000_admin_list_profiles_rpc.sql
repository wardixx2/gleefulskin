-- Helper: detect admin from profile role or bootstrap admin email
create or replace function public.is_admin_user()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  )
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'admin@glow.com';
end;
$$;

-- Admins can list every profile (bypasses RLS safely)
create or replace function public.admin_list_profiles()
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  approval_status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'not authorized';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.email,
    p.role,
    coalesce(p.approval_status, 'pending') as approval_status,
    p.created_at
  from public.profiles p
  order by p.created_at desc nulls last;
end;
$$;

-- Admins can approve/reject/promote via RPC
create or replace function public.admin_update_profile(
  target_user_id uuid,
  new_role text default null,
  new_approval_status text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'not authorized';
  end if;

  update public.profiles
  set
    role = coalesce(new_role, role),
    approval_status = coalesce(new_approval_status, approval_status)
  where id = target_user_id;
end;
$$;

grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.admin_list_profiles() to authenticated;
grant execute on function public.admin_update_profile(uuid, text, text) to authenticated;

-- Ensure admins can read/update profiles when RPC is not used
drop policy if exists "Admins can view all profiles" on profiles;
drop policy if exists "Admins can update all profiles" on profiles;

create policy "Admins can view all profiles"
on profiles for select
using (public.is_admin_user());

create policy "Admins can update all profiles"
on profiles for update
using (public.is_admin_user());
