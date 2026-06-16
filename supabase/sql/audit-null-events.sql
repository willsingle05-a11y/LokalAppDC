with blank_rows as (
  select count(*) as blank_row_count
  from public.events
  where nullif(trim(coalesce(title, '')), '') is null
    and nullif(trim(coalesce(description, '')), '') is null
    and nullif(trim(coalesce(venue, '')), '') is null
    and nullif(trim(coalesce(venue_name, '')), '') is null
    and nullif(trim(coalesce(neighborhood, '')), '') is null
    and nullif(trim(coalesce(venue_address, '')), '') is null
    and date is null
    and nullif(trim(coalesce(time, '')), '') is null
    and starts_at is null
    and ends_at is null
    and end_time is null
    and price_min is null
    and price_max is null
    and coalesce(array_length(tags, 1), 0) = 0
    and coalesce(array_length("Category", 1), 0) = 0
    and nullif(trim(coalesce(category, '')), '') is null
    and nullif(trim(coalesce(tag, '')), '') is null
    and nullif(trim(coalesce(ticket_url, '')), '') is null
    and nullif(trim(coalesce(external_id, '')), '') is null
    and nullif(trim(coalesce(external_url, '')), '') is null
    and nullif(trim(coalesce(url, '')), '') is null
    and latitude is null
    and longitude is null
    and lat is null
    and lng is null
    and raw_json is null
),
safe_drop_columns(column_name) as (
  values
    ('end_time'),
    ('url'),
    ('contact_name'),
    ('contact_email'),
    ('is_recurring'),
    ('recurrence'),
    ('recurrence_end_date'),
    ('cancellation_key')
),
all_null_safe_columns as (
  select
    safe_drop_columns.column_name,
    exists (
      select 1
      from pg_depend dep
      join pg_attribute attr
        on attr.attrelid = dep.refobjid
       and attr.attnum = dep.refobjsubid
      where attr.attrelid = 'public.events'::regclass
        and attr.attname = safe_drop_columns.column_name
        and dep.deptype in ('n', 'a')
    ) as has_dependency
  from safe_drop_columns
  join information_schema.columns columns
    on columns.table_schema = 'public'
   and columns.table_name = 'events'
   and columns.column_name = safe_drop_columns.column_name
  where (
    select count(*)
    from public.events
    where to_jsonb(events)->safe_drop_columns.column_name is not null
      and to_jsonb(events)->>safe_drop_columns.column_name <> ''
      and to_jsonb(events)->>safe_drop_columns.column_name <> '[]'
      and to_jsonb(events)->>safe_drop_columns.column_name <> '{}'
  ) = 0
)
select
  (select count(*) from public.events) as total_rows,
  (select blank_row_count from blank_rows) as blank_row_count,
  coalesce((select array_agg(column_name order by column_name) from all_null_safe_columns where not has_dependency), '{}') as droppable_all_null_safe_columns,
  coalesce((select array_agg(column_name order by column_name) from all_null_safe_columns where has_dependency), '{}') as dependent_all_null_safe_columns;
