create table if not exists public.mail_settings (
  id integer primary key default 1 check (id = 1),
  smtp_user text,
  smtp_pass text,
  smtp_host text not null default 'smtp.gmail.com',
  smtp_port integer not null default 587,
  from_name text not null default 'Gleeful Skin Wellness Center',
  updated_at timestamptz not null default now()
);

insert into public.mail_settings (id, smtp_user, smtp_host, smtp_port, from_name)
values (1, 'gleefulskinwellnesscentercaste@gmail.com', 'smtp.gmail.com', 587, 'Gleeful Skin Wellness Center')
on conflict (id) do nothing;

alter table public.mail_settings enable row level security;

drop policy if exists "Admins can read mail settings" on public.mail_settings;
create policy "Admins can read mail settings"
on public.mail_settings
for select
to authenticated
using (public.is_admin_user());

drop policy if exists "Admins can update mail settings" on public.mail_settings;
create policy "Admins can update mail settings"
on public.mail_settings
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can insert mail settings" on public.mail_settings;
create policy "Admins can insert mail settings"
on public.mail_settings
for insert
to authenticated
with check (public.is_admin_user());

grant select, insert, update on public.mail_settings to authenticated;
grant all on public.mail_settings to service_role;
