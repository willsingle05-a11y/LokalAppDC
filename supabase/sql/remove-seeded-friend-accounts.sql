-- Remove seeded friend accounts and their fake social proof.
-- Real user profiles have is_demo = false/null and are preserved.

with seeded_names(full_name) as (
  values
    ('Ana Lopez'),
    ('Marcus Reed'),
    ('Jules Kim'),
    ('Dev Shah'),
    ('Elena Torres'),
    ('Priya Lee'),
    ('Nia Williams'),
    ('Chris Bennett'),
    ('Sofia Kim'),
    ('Avery Morgan'),
    ('Theo Harris'),
    ('Maya Kapoor'),
    ('Leo Brooks'),
    ('Grace Turner'),
    ('Ryan James'),
    ('Isabel Cruz'),
    ('Owen Adams'),
    ('Zara Hassan'),
    ('Ben Miller'),
    ('Camila Wright'),
    ('Sam Nguyen'),
    ('Harper King'),
    ('Eli Parker'),
    ('Quinn Davis'),
    ('Fatima Thompson'),
    ('Jonah Patel'),
    ('Riley Ochoa'),
    ('Mina Hughes'),
    ('Kai Thomas'),
    ('Lena Scott')
), seeded_profile_ids as (
  select id::text as id
  from public.profiles
  where is_demo = true
     or full_name in (select full_name from seeded_names)
  union
  select id::text as id
  from public."Profiles"
  where is_demo = true
     or display_name in (select full_name from seeded_names)
)
delete from public.event_interactions
where user_id::text in (select id from seeded_profile_ids);

with seeded_names(full_name) as (
  values
    ('Ana Lopez'), ('Marcus Reed'), ('Jules Kim'), ('Dev Shah'), ('Elena Torres'),
    ('Priya Lee'), ('Nia Williams'), ('Chris Bennett'), ('Sofia Kim'), ('Avery Morgan'),
    ('Theo Harris'), ('Maya Kapoor'), ('Leo Brooks'), ('Grace Turner'), ('Ryan James'),
    ('Isabel Cruz'), ('Owen Adams'), ('Zara Hassan'), ('Ben Miller'), ('Camila Wright'),
    ('Sam Nguyen'), ('Harper King'), ('Eli Parker'), ('Quinn Davis'), ('Fatima Thompson'),
    ('Jonah Patel'), ('Riley Ochoa'), ('Mina Hughes'), ('Kai Thomas'), ('Lena Scott')
)
delete from public.friend_relationships
where friend_name in (select full_name from seeded_names)
   or source = 'demo';

with seeded_names(full_name) as (
  values
    ('Ana Lopez'), ('Marcus Reed'), ('Jules Kim'), ('Dev Shah'), ('Elena Torres'),
    ('Priya Lee'), ('Nia Williams'), ('Chris Bennett'), ('Sofia Kim'), ('Avery Morgan'),
    ('Theo Harris'), ('Maya Kapoor'), ('Leo Brooks'), ('Grace Turner'), ('Ryan James'),
    ('Isabel Cruz'), ('Owen Adams'), ('Zara Hassan'), ('Ben Miller'), ('Camila Wright'),
    ('Sam Nguyen'), ('Harper King'), ('Eli Parker'), ('Quinn Davis'), ('Fatima Thompson'),
    ('Jonah Patel'), ('Riley Ochoa'), ('Mina Hughes'), ('Kai Thomas'), ('Lena Scott')
)
delete from public.group_memberships
where member_name in (select full_name from seeded_names)
   or source = 'demo';

delete from public.profiles
where is_demo = true;

delete from public."Profiles"
where is_demo = true;

drop policy if exists "Demo visitors can view demo profiles" on public.profiles;
create policy "Anon visitors can view real public profiles"
on public.profiles for select
to anon
using (coalesce(is_demo, false) = false);

drop policy if exists "Demo visitors can view live demo profiles" on public."Profiles";
create policy "Visitors can view real legacy profiles"
on public."Profiles" for select
to anon, authenticated
using (coalesce(is_demo, false) = false);
