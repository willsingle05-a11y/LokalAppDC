alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists event_interests text[] default '{}';
alter table public.profiles add column if not exists area_interests text[] default '{}';
alter table public.profiles add column if not exists onboarding_completed boolean default false;

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    username,
    full_name,
    birthdate,
    phone,
    email,
    event_interests,
    area_interests,
    onboarding_completed
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'full_name',
    nullif(new.raw_user_meta_data ->> 'birthdate', '')::date,
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone'),
    coalesce(new.email, new.raw_user_meta_data ->> 'email'),
    coalesce(array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'event_interests')), '{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'area_interests')), '{}'::text[]),
    true
  )
  on conflict (id) do update set
    username = excluded.username,
    full_name = excluded.full_name,
    birthdate = excluded.birthdate,
    phone = excluded.phone,
    email = excluded.email,
    event_interests = excluded.event_interests,
    area_interests = excluded.area_interests,
    onboarding_completed = excluded.onboarding_completed;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

update public.events
set
  category = 'performing-arts',
  tags = (
    select array_agg(distinct tag)
    from unnest(coalesce(tags, '{}'::text[]) || array['Arts', 'Comedy']) as tag
  ),
  updated_at = now()
where lower(coalesce(category, '')) = 'community'
  and concat_ws(' ', title, description, venue_name, venue, array_to_string(tags, ' ')) ~* 'comedy|stand[- ]?up|standup|improv|comic';

update public.events
set
  tags = (
    select array_agg(distinct tag)
    from unnest(
      coalesce(tags, '{}'::text[])
      || array['Sports']
      || case when concat_ws(' ', title, description, venue_name, venue, array_to_string(tags, ' ')) ~* 'mlb|major league baseball|washington nationals|nationals|nats|baseball' then array['MLB', 'Baseball'] else '{}'::text[] end
      || case when concat_ws(' ', title, description, venue_name, venue, array_to_string(tags, ' ')) ~* 'nba|washington wizards|wizards' then array['NBA', 'Basketball'] else '{}'::text[] end
      || case when concat_ws(' ', title, description, venue_name, venue, array_to_string(tags, ' ')) ~* 'wnba|washington mystics|mystics' then array['WNBA', 'Basketball'] else '{}'::text[] end
      || case when concat_ws(' ', title, description, venue_name, venue, array_to_string(tags, ' ')) ~* 'nfl|washington commanders|commanders|football' then array['NFL', 'Football'] else '{}'::text[] end
      || case when concat_ws(' ', title, description, venue_name, venue, array_to_string(tags, ' ')) ~* 'nhl|washington capitals|capitals|caps|hockey' then array['NHL', 'Hockey'] else '{}'::text[] end
      || case when concat_ws(' ', title, description, venue_name, venue, array_to_string(tags, ' ')) ~* 'mls|d\.?c\.? united|dc united|soccer' then array['MLS', 'Soccer'] else '{}'::text[] end
      || case when concat_ws(' ', title, description, venue_name, venue, array_to_string(tags, ' ')) ~* 'nwsl|washington spirit' then array['NWSL', 'Soccer'] else '{}'::text[] end
    ) as tag
  ),
  updated_at = now()
where lower(coalesce(category, '')) = 'sports'
  or concat_ws(' ', title, description, venue_name, venue, array_to_string(tags, ' ')) ~* 'sports|mlb|nba|wnba|nfl|nhl|mls|nwsl|baseball|basketball|football|soccer|hockey|nationals|wizards|mystics|capitals|commanders|d\.?c\.? united|dc united|washington spirit';
