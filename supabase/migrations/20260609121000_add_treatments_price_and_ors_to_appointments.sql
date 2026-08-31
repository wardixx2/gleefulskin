-- =========================
-- OPTIONAL: Store ORS/treatment pricing snapshot in appointments
-- Since you chose option 2 (ORS config per treatment), we can still store ORS snapshot
-- to avoid mismatch if admin edits treatments later.
-- This migration adds nullable columns (so existing data won't break).
-- =========================

alter table public.appointments
add column if not exists treatment_price numeric;

alter table public.appointments
add column if not exists ors_required boolean;

alter table public.appointments
add column if not exists ors_number text;

alter table public.appointments
add column if not exists ors_amount numeric;

