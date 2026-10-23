create table if not exists public.source_sync_runs (
  id bigint generated always as identity primary key,
  source text not null,
  status text not null check (status in ('success','partial','error','empty')),
  parsed integer not null default 0,
  upserted integer not null default 0,
  error text,
  duration_ms integer,
  created_at timestamptz not null default now()
);
create index if not exists source_sync_runs_source_created_idx on public.source_sync_runs(source,created_at desc);
alter table public.source_sync_runs enable row level security;
revoke all on public.source_sync_runs from anon, authenticated;
grant all on public.source_sync_runs to service_role;
