insert into public.demo_groups
  (name, type, member_count, member_count_label, note, icon, style, description, is_demo, updated_at)
values
  (
    'Museum Night Crew',
    'Public',
    284,
    '284 members',
    'Smithsonian nights + gallery talks',
    'M',
    'art',
    'People planning museum nights, exhibit walks, after-hours programs, and Smithsonian events around DC.',
    true,
    now()
  ),
  (
    '9:30 Club Regulars',
    'Public',
    731,
    '731 members',
    'Concert buddies this week',
    '9',
    'run',
    'A public group for DC concertgoers finding friends for 9:30 Club, Atlantis, Anthem, Howard Theatre, and Union Stage shows.',
    true,
    now()
  ),
  (
    'Kennedy Center Rush',
    'Public',
    418,
    '418 members',
    'Theater, opera, and rush-ticket plans',
    'K',
    'art',
    'A planning group for theater, dance, opera, musicals, and last-minute performing arts tickets in DC.',
    true,
    now()
  ),
  (
    'Navy Yard Game Day',
    'Public',
    892,
    '892 members',
    'Nats, Mystics, and pregame meetups',
    'N',
    'run',
    'A sports group for game-day plans around Nationals Park, CareFirst Arena, and Navy Yard hangouts.',
    true,
    now()
  ),
  (
    'Free DC Finds',
    'Public',
    1204,
    '1.2k members',
    'Free events, markets, and outdoor plans',
    'F',
    'book',
    'A public group for free museum programs, markets, outdoor movies, volunteer days, and budget-friendly DC plans.',
    true,
    now()
  )
on conflict (name) do update set
  type = excluded.type,
  member_count = excluded.member_count,
  member_count_label = excluded.member_count_label,
  note = excluded.note,
  icon = excluded.icon,
  style = excluded.style,
  description = excluded.description,
  is_demo = excluded.is_demo,
  updated_at = now();
