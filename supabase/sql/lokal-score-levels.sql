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
  (1, 'New in Town', 0, 200),
  (2, 'Explorer', 200, 275),
  (3, 'District Scout', 275, 350),
  (4, 'Neighborhood Regular', 350, 450),
  (5, 'Plan Maker', 450, 575),
  (6, 'Ward Wanderer', 575, 725),
  (7, 'Metro Connector', 725, 900),
  (8, 'District Insider', 900, 1100),
  (9, 'Downtown Regular', 1100, 1350),
  (10, 'Capital Connector', 1350, 1650),
  (11, 'DC Tastemaker', 1650, 2000),
  (12, 'Certified Lokal', 2000, 2400),
  (13, 'District Icon', 2400, 2900),
  (14, 'Lokal Legend', 2900, 3600),
  (15, 'DC Hall of Fame', 3600, null)
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
