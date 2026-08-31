-- Admin can permanently delete customer accounts (auth user + cascaded profile/data)

create or replace function public.admin_delete_customer(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_role text;
  target_email text;
begin
  if not public.is_admin_user() then
    raise exception 'not authorized';
  end if;

  if target_user_id is null then
    raise exception 'user id required';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'cannot delete your own account';
  end if;

  select p.role, coalesce(nullif(trim(p.email), ''), u.email)
  into target_role, target_email
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.id = target_user_id;

  if target_role is null then
    select u.email into target_email
    from auth.users u
    where u.id = target_user_id;

    if target_email is null then
      raise exception 'user not found';
    end if;

    target_role := 'customer';
  end if;

  if target_role = 'admin' or lower(coalesce(target_email, '')) = 'admin@glow.com' then
    raise exception 'cannot delete admin accounts';
  end if;

  delete from auth.users where id = target_user_id;
end;
$$;

grant execute on function public.admin_delete_customer(uuid) to authenticated;
