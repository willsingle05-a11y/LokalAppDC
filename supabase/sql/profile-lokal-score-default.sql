alter table if exists public.profiles
  add column if not exists lokal_score integer default 100;

alter table if exists public."Profiles"
  add column if not exists lokal_score integer default 100;

alter table if exists public.profiles
  alter column lokal_score set default 100;

alter table if exists public."Profiles"
  alter column lokal_score set default 100;

update public.profiles
set lokal_score = 100
where lokal_score is null;

update public."Profiles"
set lokal_score = 100
where lokal_score is null;
