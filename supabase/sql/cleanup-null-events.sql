create or replace function public.event_is_blank(event_row public.events)
returns boolean
language plpgsql
stable
as $$
declare
  row_data jsonb := to_jsonb(event_row);
begin
  return nullif(trim(coalesce(row_data->>'title', '')), '') is null
    and nullif(trim(coalesce(row_data->>'description', '')), '') is null
    and nullif(trim(coalesce(row_data->>'venue', '')), '') is null
    and nullif(trim(coalesce(row_data->>'venue_name', '')), '') is null
    and nullif(trim(coalesce(row_data->>'neighborhood', '')), '') is null
    and nullif(trim(coalesce(row_data->>'venue_address', '')), '') is null
    and nullif(trim(coalesce(row_data->>'date', '')), '') is null
    and nullif(trim(coalesce(row_data->>'time', '')), '') is null
    and nullif(trim(coalesce(row_data->>'starts_at', '')), '') is null
    and nullif(trim(coalesce(row_data->>'ends_at', '')), '') is null
    and nullif(trim(coalesce(row_data->>'end_time', '')), '') is null
    and nullif(trim(coalesce(row_data->>'price_min', '')), '') is null
    and nullif(trim(coalesce(row_data->>'price_max', '')), '') is null
    and (row_data->'tags' is null or row_data->'tags' = '[]'::jsonb)
    and (row_data->'Category' is null or row_data->'Category' = '[]'::jsonb)
    and nullif(trim(coalesce(row_data->>'category', '')), '') is null
    and nullif(trim(coalesce(row_data->>'tag', '')), '') is null
    and nullif(trim(coalesce(row_data->>'ticket_url', '')), '') is null
    and nullif(trim(coalesce(row_data->>'external_id', '')), '') is null
    and nullif(trim(coalesce(row_data->>'external_url', '')), '') is null
    and nullif(trim(coalesce(row_data->>'url', '')), '') is null
    and nullif(trim(coalesce(row_data->>'latitude', '')), '') is null
    and nullif(trim(coalesce(row_data->>'longitude', '')), '') is null
    and nullif(trim(coalesce(row_data->>'lat', '')), '') is null
    and nullif(trim(coalesce(row_data->>'lng', '')), '') is null
    and (row_data->'raw_json' is null or row_data->'raw_json' = 'null'::jsonb or row_data->'raw_json' = '{}'::jsonb);
end;
$$;

create or replace function public.skip_blank_event_write()
returns trigger
language plpgsql
as $$
begin
  if public.event_is_blank(new) then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists skip_blank_events_before_write on public.events;
create trigger skip_blank_events_before_write
before insert or update on public.events
for each row execute function public.skip_blank_event_write();

create temp table if not exists pg_temp.null_event_cleanup_summary (
  action text,
  value text
);
truncate pg_temp.null_event_cleanup_summary;

with deleted as (
  delete from public.events
  where public.event_is_blank(events)
  returning 1
)
insert into pg_temp.null_event_cleanup_summary (action, value)
select 'deleted_blank_rows', count(*)::text
from deleted;

do $$
declare
  candidate text;
  non_empty_count bigint;
  has_dependency boolean;
  safe_columns text[] := array[
    'end_time',
    'url',
    'contact_name',
    'contact_email',
    'is_recurring',
    'recurrence',
    'recurrence_end_date',
    'cancellation_key'
  ];
begin
  foreach candidate in array safe_columns loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'events'
        and column_name = candidate
    ) then
      execute format(
        'select count(*) from public.events where to_jsonb(events)->%L is not null and to_jsonb(events)->>%L <> '''' and to_jsonb(events)->>%L <> ''[]'' and to_jsonb(events)->>%L <> ''{}''',
        candidate,
        candidate,
        candidate,
        candidate
      )
      into non_empty_count;

      if non_empty_count = 0 then
        select exists (
          select 1
          from pg_depend dep
          join pg_attribute attr
            on attr.attrelid = dep.refobjid
           and attr.attnum = dep.refobjsubid
          where attr.attrelid = 'public.events'::regclass
            and attr.attname = candidate
            and dep.deptype in ('n', 'a')
        )
        into has_dependency;

        if has_dependency then
          insert into pg_temp.null_event_cleanup_summary (action, value)
          values ('skipped_dependent_all_null_column', candidate);
        else
          execute format('alter table public.events drop column if exists %I', candidate);
          insert into pg_temp.null_event_cleanup_summary (action, value)
          values ('dropped_all_null_column', candidate);
        end if;
      end if;
    end if;
  end loop;
end;
$$;

select * from pg_temp.null_event_cleanup_summary order by action, value;
