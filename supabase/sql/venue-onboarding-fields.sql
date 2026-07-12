alter table public.venue_verification_requests
  add column if not exists venue_image_url text,
  add column if not exists venue_description text,
  add column if not exists event_interests text[] not null default '{}',
  add column if not exists area_interests text[] not null default '{}';

alter table public.profiles
  add column if not exists account_type text not null default 'person',
  add column if not exists venue_name text,
  add column if not exists venue_address text,
  add column if not exists venue_website text,
  add column if not exists venue_image_url text,
  add column if not exists venue_description text;
