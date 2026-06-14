create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null,
  birthdate date not null,
  phone text,
  bio text,
  avatar_url text,
  home_city text default 'Washington, DC',
  is_demo boolean default false,
  created_at timestamptz default now()
);

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists home_city text default 'Washington, DC';
alter table public.profiles add column if not exists is_demo boolean default false;

alter table public.profiles enable row level security;

drop policy if exists "Demo visitors can view demo profiles" on public.profiles;
create policy "Demo visitors can view demo profiles"
on public.profiles for select
to anon
using (is_demo = true);

drop policy if exists "Signed-in users can view profiles" on public.profiles;
create policy "Signed-in users can view profiles"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, full_name, birthdate, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'full_name',
    nullif(new.raw_user_meta_data ->> 'birthdate', '')::date,
    new.phone
  )
  on conflict (id) do update set
    username = excluded.username,
    full_name = excluded.full_name,
    birthdate = excluded.birthdate,
    phone = excluded.phone;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
