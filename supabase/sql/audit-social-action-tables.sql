select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'friend_relationships',
    'group_memberships',
    'group_messages',
    'direct_messages'
  )
order by table_name;
