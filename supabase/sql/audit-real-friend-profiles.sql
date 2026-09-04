select 'profiles_demo_rows' as check_name, count(*) as count
from public.profiles
where is_demo = true
union all
select 'legacy_profiles_demo_rows' as check_name, count(*) as count
from public."Profiles"
where is_demo = true
union all
select 'friend_relationships_demo_source_rows' as check_name, count(*) as count
from public.friend_relationships
where source = 'demo';
