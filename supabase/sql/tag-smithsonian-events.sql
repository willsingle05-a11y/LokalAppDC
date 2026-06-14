-- Add a dedicated Smithsonian tag to existing events.
-- Future imports add this in the sync scripts; this backfills rows already in Supabase.

update public.events
set
  tags = array_append(coalesce(tags, '{}'), 'Smithsonian'),
  updated_at = now()
where
  not ('Smithsonian' = any(coalesce(tags, '{}')))
  and (
    title ilike any(array[
      '%smithsonian%',
      '%hirshhorn%',
      '%renwick gallery%',
      '%national portrait gallery%',
      '%american art museum%',
      '%national air and space museum%',
      '%national museum of african american history%',
      '%national museum of natural history%',
      '%national museum of american history%'
    ])
    or description ilike any(array[
      '%smithsonian%',
      '%hirshhorn%',
      '%renwick gallery%',
      '%national portrait gallery%',
      '%american art museum%',
      '%national air and space museum%',
      '%national museum of african american history%',
      '%national museum of natural history%',
      '%national museum of american history%'
    ])
    or venue_name ilike any(array[
      '%smithsonian%',
      '%hirshhorn%',
      '%renwick gallery%',
      '%national portrait gallery%',
      '%american art museum%',
      '%national air and space museum%',
      '%national museum of african american history%',
      '%national museum of natural history%',
      '%national museum of american history%'
    ])
    or venue ilike any(array[
      '%smithsonian%',
      '%hirshhorn%',
      '%renwick gallery%',
      '%national portrait gallery%',
      '%american art museum%',
      '%national air and space museum%',
      '%national museum of african american history%',
      '%national museum of natural history%',
      '%national museum of american history%'
    ])
  );
