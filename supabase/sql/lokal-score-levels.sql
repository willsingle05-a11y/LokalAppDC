create table if not exists public.lokal_score_levels (
  level_order integer primary key,
  name text not null unique,
  min_score integer not null unique,
  next_score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.lokal_score_levels (level_order, name, min_score, next_score)
values
  (1, 'New in Town', 0, 100),
  (2, 'Explorer', 100, 175),
  (3, 'District Scout', 175, 250),
  (4, 'Neighborhood Regular', 250, 350),
  (5, 'Plan Maker', 350, 475),
  (6, 'Ward Wanderer', 475, 625),
  (7, 'Metro Connector', 625, 800),
  (8, 'District Insider', 800, 1000),
  (9, 'Downtown Regular', 1000, 1250),
  (10, 'Capital Connector', 1250, 1550),
  (11, 'DC Tastemaker', 1550, 1900),
  (12, 'Certified Lokal', 1900, 2300),
  (13, 'District Icon', 2300, 2800),
  (14, 'Lokal Legend', 2800, 3500),
  (15, 'DC Hall of Fame', 3500, null)
on conflict (level_order) do update
set name = excluded.name,
    min_score = excluded.min_score,
    next_score = excluded.next_score,
    updated_at = now();

alter table public.lokal_score_levels enable row level security;

drop policy if exists "Public read lokal score levels" on public.lokal_score_levels;
create policy "Public read lokal score levels"
  on public.lokal_score_levels
  for select
  to anon, authenticated
  using (true);

grant select on public.lokal_score_levels to anon, authenticated;
