alter table public.onboarding_submissions
  add column if not exists owner_name text;

alter table public.profiles
  add column if not exists owner_name text;