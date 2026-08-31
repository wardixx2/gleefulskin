-- =========================
-- PROFILES TABLE
-- =========================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text default 'customer',
  created_at timestamp default now()
);

-- =========================
-- APPOINTMENTS TABLE
-- =========================
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),

  -- link to authenticated user
  user_id uuid references auth.users(id) on delete cascade not null,

  -- customer info
  full_name text not null,
  email text not null,
  phone text,

  -- booking details
  treatment text not null,
  price text,

  appointment_date date not null,
  appointment_time text not null,

  status text default 'Pending',

  created_at timestamp default now()
);

-- =========================
-- ENABLE RLS
-- =========================
alter table profiles enable row level security;
alter table appointments enable row level security;

-- =========================
-- PROFILES POLICIES
-- =========================
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Users can insert own profile" on profiles;

create policy "Users can view own profile"
on profiles for select
using (auth.uid() = id);

create policy "Users can insert own profile"
on profiles for insert
with check (auth.uid() = id);

-- =========================
-- APPOINTMENTS POLICIES
-- =========================
drop policy if exists "Users can create appointments" on appointments;
drop policy if exists "Users can view own appointments" on appointments;
drop policy if exists "Admins can manage all appointments" on appointments;

create policy "Users can create appointments"
on appointments for insert
with check (auth.uid() = user_id);

create policy "Users can view own appointments"
on appointments for select
using (auth.uid() = user_id);

create policy "Admins can manage all appointments"
on appointments for all
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);