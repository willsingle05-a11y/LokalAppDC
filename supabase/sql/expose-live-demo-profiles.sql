alter table public."Profiles" add column if not exists is_demo boolean default false;
alter table public."Profiles" enable row level security;

drop policy if exists "Demo visitors can view live demo profiles" on public."Profiles";
drop policy if exists "Visitors can view real legacy profiles" on public."Profiles";
create policy "Visitors can view real legacy profiles"
on public."Profiles" for select
to anon, authenticated
using (coalesce(is_demo, false) = false);
