-- Reuse the existing authenticated cron command inside Postgres. Never export its credential.
do $schedule$
declare
  template text;
  source text;
  position integer := 0;
begin
  select command into template from cron.job where jobname = 'lokal-sync-daily';
  if template is null or strpos(template, $needle$'{}'::jsonb$needle$) = 0 then
    raise exception 'Expected authenticated Lokal cron template was not found';
  end if;
  foreach source in array array['wharf','farmers-markets','Adams Morgan Partnership','Dupont Circle BID','Capitol Riverfront BID','Georgetown BID','Mount Vernon Triangle CID','Union Market District','Southwest BID','washingtonian','dc-music-live','eventsdc','edibledc','runguides','thingstododc','Shaw Main Streets','Anacostia BID','Downtown DC BID','nuandroids'] loop
    perform cron.schedule(
      'lokal-source-' || lower(regexp_replace(source,'[^a-zA-Z0-9]+','-','g')),
      format('%s 11 * * *',5 + position * 2),
      replace(template,$needle$'{}'::jsonb$needle$,format('%L::jsonb',jsonb_build_object('sources',jsonb_build_array(source),'days',60)::text))
    );
    position := position + 1;
  end loop;
end;
$schedule$;

select jobname,schedule,active from cron.job where jobname like 'lokal-source-%' order by jobid;
