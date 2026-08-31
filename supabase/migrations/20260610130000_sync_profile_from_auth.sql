-- Sync profile display data from auth.users + fix signup profile completion

create or replace function public.complete_signup_profile(
  user_full_name text,
  user_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid := auth.uid();
  resolved_role text;
  resolved_status text;
begin
  if target_id is null then
    raise exception 'not authenticated';
  end if;

  resolved_role := case
    when lower(coalesce(user_email, '')) = 'admin@glow.com' then 'admin'
    else 'customer'
  end;

  resolved_status := case
    when resolved_role = 'admin' then 'approved'
    else 'pending'
  end;

  insert into public.profiles (id, full_name, email, role, approval_status)
  values (target_id, user_full_name, user_email, resolved_role, resolved_status)
  on conflict (id) do update
  set
    full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
    email = coalesce(nullif(excluded.email, ''), profiles.email),
    role = case
      when profiles.role = 'admin' then profiles.role
      else excluded.role
    end,
    approval_status = case
      when profiles.role = 'admin' then 'approved'
      else excluded.approval_status
    end;
end;
$$;

create or replace function public.handle_new_user()
returns trigger as $$
declare
  resolved_role text;
  resolved_status text;
  resolved_name text;
begin
  resolved_name := coalesce(new.raw_user_meta_data->>'full_name', '');
  resolved_role := case
    when lower(coalesce(new.email, '')) = 'admin@glow.com' then 'admin'
    else 'customer'
  end;
  resolved_status := case
    when resolved_role = 'admin' then 'approved'
    else 'pending'
  end;

  insert into public.profiles (id, email, role, approval_status, full_name, created_at)
  values (new.id, new.email, resolved_role, resolved_status, resolved_name, now())
  on conflict (id) do update
  set
    email = coalesce(nullif(excluded.email, ''), profiles.email),
    full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
    role = case
      when profiles.role = 'admin' then profiles.role
      else excluded.role
    end,
    approval_status = case
      when profiles.role = 'admin' then 'approved'
      when profiles.approval_status = 'approved' then profiles.approval_status
      else excluded.approval_status
    end;

  return new;
end;
$$ language plpgsql security definer;

-- Backfill missing profile rows and empty name/email from auth.users
insert into public.profiles (id, email, full_name, role, approval_status, created_at)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', ''),
  case when lower(u.email) = 'admin@glow.com' then 'admin' else 'customer' end,
  case when lower(u.email) = 'admin@glow.com' then 'approved' else 'pending' end,
  u.created_at
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

update public.profiles p
set
  email = coalesce(nullif(trim(p.email), ''), u.email),
  full_name = coalesce(nullif(trim(p.full_name), ''), u.raw_user_meta_data->>'full_name', p.full_name),
  created_at = coalesce(p.created_at, u.created_at)
from auth.users u
where p.id = u.id;

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
    coalesce(
      nullif(trim(p.full_name), ''),
      nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
      'Unnamed User'
    ) as full_name,
    coalesce(nullif(trim(p.email), ''), u.email) as email,
    case
      when p.role = 'admin' or lower(coalesce(u.email, '')) = 'admin@glow.com' then 'admin'
      when p.role in ('customer', 'user') then 'customer'
      else coalesce(p.role, 'customer')
    end as role,
    case
      when p.role = 'admin' or lower(coalesce(u.email, '')) = 'admin@glow.com' then 'approved'
      else coalesce(p.approval_status, 'pending')
    end as approval_status,
    coalesce(u.created_at, p.created_at) as created_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  order by coalesce(u.created_at, p.created_at) desc nulls last;
end;
$$;

grant execute on function public.complete_signup_profile(text, text) to authenticated;
