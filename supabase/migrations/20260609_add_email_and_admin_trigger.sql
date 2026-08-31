-- =========================
-- UPDATE PROFILES TABLE
-- =========================
-- Add email column if it doesn't exist
alter table profiles add column if not exists email text;

-- Update default role from 'customer' to 'user'
alter table profiles alter column role set default 'user';

-- =========================
-- AUTO-CREATE PROFILE TRIGGER
-- =========================
-- This trigger automatically creates a profile for each new auth user
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

-- Create the trigger on auth.users
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
