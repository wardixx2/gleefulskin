-- =========================
-- TREATMENTS TABLE
-- Stores admin-configurable treatments + pricing + ORS requirements
-- =========================
create table if not exists public.treatments (
  id uuid primary key default gen_random_uuid(),

  name text not null unique,
  -- price in PHP (numeric without ₱ sign)
  price numeric not null check (price >= 0),

  ors_required boolean not null default false,

  -- ORS fields (PHP rules)
  -- ors_number: e.g. "1", "2", "3" or "1.5" (kept as text to be flexible)
  ors_number text,
  -- ors_amount in PHP
  ors_amount numeric,

  active boolean not null default true,

  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_treatments_updated_at on public.treatments;
create trigger set_treatments_updated_at
before update on public.treatments
for each row execute procedure public.set_updated_at();

-- =========================
-- ENABLE RLS
-- =========================
alter table public.treatments enable row level security;

-- =========================
-- POLICIES
-- =========================
-- Allow customers/admins to read active treatments
create policy "Anyone can view active treatments"
on public.treatments for select
using (active = true);

-- Admin can manage all treatments
create policy "Admins can manage treatments"
on public.treatments for all
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

