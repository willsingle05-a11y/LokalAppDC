-- Run this in the Supabase SQL editor after deploying the Edge Function.
-- It schedules the PredictHQ sync to run every morning at 7:00 AM UTC.
-- 7:00 AM UTC is 3:00 AM Eastern during daylight saving time.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- Replace PROJECT_REF if you use this in another Supabase project.
-- Current Lokal project ref: iglzcjtklryapmcpyoam
select cron.unschedule('sync-predicthq-events-daily')
where exists (
  select 1
  from cron.job
  where jobname = 'sync-predicthq-events-daily'
);

select cron.schedule(
  'sync-predicthq-events-daily',
  '0 7 * * *',
  $$
  select
    net.http_post(
      url := 'https://iglzcjtklryapmcpyoam.functions.supabase.co/sync-predicthq-events',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('scheduled', true)
    );
  $$
);

-- To test immediately from SQL after deployment:
-- select net.http_post(
--   url := 'https://iglzcjtklryapmcpyoam.functions.supabase.co/sync-predicthq-events',
--   headers := jsonb_build_object('Content-Type', 'application/json'),
--   body := jsonb_build_object('manual_test', true)
-- );
