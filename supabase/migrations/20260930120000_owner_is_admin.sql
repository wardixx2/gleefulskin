-- Owner account should always be admin on this project.

create or replace function public.is_bootstrap_admin_email(target_email text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce(target_email, '')) in (
    'admin@glow.com',
    'edwardraquipo26@gmail.com'
  );
$$;

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
  or public.is_bootstrap_admin_email(auth.jwt() ->> 'email');
end;
$$;

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
    when public.is_bootstrap_admin_email(user_email) then 'admin'
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
      when profiles.role = 'admin' or public.is_bootstrap_admin_email(excluded.email) then 'admin'
      else excluded.role
    end,
    approval_status = case
      when profiles.role = 'admin' or public.is_bootstrap_admin_email(excluded.email) then 'approved'
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
    when public.is_bootstrap_admin_email(new.email) then 'admin'
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
      when profiles.role = 'admin' or public.is_bootstrap_admin_email(excluded.email) then 'admin'
      else excluded.role
    end,
    approval_status = case
      when profiles.role = 'admin' or public.is_bootstrap_admin_email(excluded.email) then 'approved'
      when profiles.approval_status = 'approved' then profiles.approval_status
      else excluded.approval_status
    end;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

update public.profiles
set
  role = 'admin',
  approval_status = 'approved',
  email = coalesce(email, 'edwardraquipo26@gmail.com')
where id = '8b21eb6b-dcaf-4020-8b82-90b7a82cf35e'
   or lower(coalesce(email, '')) = 'edwardraquipo26@gmail.com';
