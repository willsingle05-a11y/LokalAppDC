alter table if exists public.profiles
  add column if not exists lokal_score integer default 20;

alter table if exists public."Profiles"
  add column if not exists lokal_score integer default 20;

update public.profiles
set lokal_score = 20
where lokal_score is null;

update public."Profiles"
set lokal_score = 20
where lokal_score is null;
