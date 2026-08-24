-- New nightlife events from Flash (flashdc.com/calendar), Azure Day Party DC
-- (azuredayparty.com/dc-events), and Rosebar (eventbrite.com listings): 12 rows.
--
-- Flash: 9 individual dated events -- everything else on flashdc.com/calendar was
-- already present in dc_events_final.csv / the dc-events-csv-2026-07 import, so only
-- events NOT already covered by that import are included here (checked by date +
-- venue against the existing CSV).
--
-- Azure Day Party DC, Rosebar Day Party Saturdays (#TasteSaturdays), and Rosebar
-- Sundays are ongoing weekly series (guest DJs rotate weekly and aren't announced
-- far in advance), so each is one row with an array of upcoming weekly dates,
-- matching the convention used for recurring events in the earlier import.
--
-- Wild Days DC (wild-days-dc.com/events-wav) could not be pulled: the site's
-- events page and Eaton Workshop's calendar are both fully client-rendered with
-- no server-side event data and no indexed individual listings for upcoming 2026
-- dates, so it is not included in this batch.
--
-- Safe to re-run: the delete below is scoped to this source only.
begin;

set local statement_timeout = '10min';

delete from public.events where source = 'nightlife-2026-08';

insert into public.events (
  title, description, category, venue, venue_name, venue_address, neighborhood,
  date, time, end_time, starts_at, ends_at, timezone,
  is_recurring, is_free, source, external_id, external_url, ticket_url, url,
  image_url, status
)
select
  e.title, e.description, e.category, e.venue, e.venue, e.venue_address, e.neighborhood,
  t.d::date,
  e.time_label,
  case
    when e.end24 is null then null
    when e.end24 < e.start24 then ((t.d::date + 1)::text || 'T' || e.end24 || '-04:00')::timestamptz
    else (t.d || 'T' || e.end24 || '-04:00')::timestamptz
  end,
  case when e.start24 is null then null else (t.d || 'T' || e.start24 || '-04:00')::timestamptz end,
  case
    when e.end24 is null then null
    when e.end24 < e.start24 then ((t.d::date + 1)::text || 'T' || e.end24 || '-04:00')::timestamptz
    else (t.d || 'T' || e.end24 || '-04:00')::timestamptz
  end,
  'America/New_York',
  e.is_recurring, e.is_free,
  'nightlife-2026-08',
  e.base || '-' || t.d,
  e.link, e.link, e.link,
  e.image_url,
  'published'
from (values
('James Zabiela - Adi', 'Club Level DJ set from James Zabiela with support from Adi.', 'nightlife', 'Flash', '645 Florida Ave NW, Shaw, Washington, DC 20001', 'Shaw', '10:00 PM', NULL, '22:00:00', NULL, FALSE, FALSE, 'james-zabiela---adi-flash', 'https://www.flashdc.com/e/z0CTJRGpjC', 'https://epyck.s3.amazonaws.com/05ff094b01ff4ef28daf1106f9e8f334_event.jpg', '{2026-08-22}'::text[]),
('DJ Three & Öona Dahl [open-to-close]', 'Open-to-close Club Level set from DJ Three and Öona Dahl.', 'nightlife', 'Flash', '645 Florida Ave NW, Shaw, Washington, DC 20001', 'Shaw', '10:00 PM', NULL, '22:00:00', NULL, FALSE, FALSE, 'dj-three-oona-dahl-open-to-close-flash', 'https://www.flashdc.com/e/6MH13eB2pW', 'https://epyck.s3.amazonaws.com/c3e6ae31ada3451c904d8b7adcb9716c_event.jpg', '{2026-09-05}'::text[]),
('Spencer Brown', 'Club Level headline set from Spencer Brown.', 'nightlife', 'Flash', '645 Florida Ave NW, Shaw, Washington, DC 20001', 'Shaw', '10:00 PM', NULL, '22:00:00', NULL, FALSE, FALSE, 'spencer-brown-flash', 'https://www.flashdc.com/e/BSzoFYf14I', 'https://epyck.s3.amazonaws.com/e453fa88babb4de4ab551c95e32be63c_event.jpg', '{2026-09-12}'::text[]),
('Sunday Love: SHARE', 'Sunday Love day party featuring SHARE.', 'nightlife', 'Flash', '645 Florida Ave NW, Shaw, Washington, DC 20001', 'Shaw', '2:30 PM', NULL, '14:30:00', NULL, FALSE, FALSE, 'sunday-love-share-flash', 'https://www.flashdc.com/e/5RyB4yD4IC', 'https://epyck.s3.amazonaws.com/7630b7f4217e47e8a2ec1094d233544a_event.jpg', '{2026-09-13}'::text[]),
('M-HIGH', 'Club Level DJ set from M-HIGH.', 'nightlife', 'Flash', '645 Florida Ave NW, Shaw, Washington, DC 20001', 'Shaw', '10:00 PM', NULL, '22:00:00', NULL, FALSE, FALSE, 'm-high-flash', 'https://www.flashdc.com/e/Ff0ErxJOPl', 'https://epyck.s3.amazonaws.com/413a942e0ea745a5a764468833a36a39_event.jpg', '{2026-09-18}'::text[]),
('FOCUS: Ellen Allien', 'FOCUS Club Level set headlined by Berlin techno DJ Ellen Allien.', 'nightlife', 'Flash', '645 Florida Ave NW, Shaw, Washington, DC 20001', 'Shaw', '10:00 PM', NULL, '22:00:00', NULL, FALSE, FALSE, 'focus-ellen-allien-flash', 'https://www.flashdc.com/e/5i5Dcajiom', 'https://epyck.s3.amazonaws.com/22068462350344bc9a4ab09d9e893712_event.jpg', '{2026-09-26}'::text[]),
('Sunday Love: Gene on Earth - Momo Trosman - Ramos', 'Sunday Love day party featuring Gene on Earth, Momo Trosman, and Ramos.', 'nightlife', 'Flash', '645 Florida Ave NW, Shaw, Washington, DC 20001', 'Shaw', '2:30 PM', NULL, '14:30:00', NULL, FALSE, FALSE, 'sunday-love-gene-on-earth---momo-trosman---ramos-flash', 'https://www.flashdc.com/e/yTZdMsp93o', 'https://epyck.s3.amazonaws.com/a24c5b2454ec4a8a9097b08450e2cde3_event.jpg', '{2026-09-27}'::text[]),
('FOCUS: Marcel Dettmann', 'FOCUS Club Level set headlined by Berlin techno DJ Marcel Dettmann.', 'nightlife', 'Flash', '645 Florida Ave NW, Shaw, Washington, DC 20001', 'Shaw', '10:00 PM', NULL, '22:00:00', NULL, FALSE, FALSE, 'focus-marcel-dettmann-flash', 'https://www.flashdc.com/e/ZqOnHD9A6W', 'https://epyck.s3.amazonaws.com/f9a31dab26764a1db4cb66ede6f99939_event.jpg', '{2026-10-09}'::text[]),
('FOCUS: Colin Benders [LiVE]', 'FOCUS Club Level live performance from Colin Benders.', 'nightlife', 'Flash', '645 Florida Ave NW, Shaw, Washington, DC 20001', 'Shaw', '10:00 PM', NULL, '22:00:00', NULL, FALSE, FALSE, 'focus-colin-benders-live-flash', 'https://www.flashdc.com/e/WP5dzZ0fcC', 'https://epyck.s3.amazonaws.com/3b7377e95eac4dce8476f4669d12144f_event.jpg', '{2026-10-10}'::text[]),
('Azure Day Party DC', 'Weekly Sunday house-music rooftop day party with rotating guest DJs, panoramic Capitol views.', 'nightlife', 'Ciel Capitol Hill', '175 L St NE, Washington, DC 20002', 'Capitol Hill', '2:00 PM', NULL, '14:00:00', '22:00:00', TRUE, FALSE, 'azure-day-party-dc', 'https://www.azuredayparty.com/dc-events', 'https://images.posh.vip/originals/6961aa2a5157a7dfaae754fe', '{2026-08-16,2026-08-23,2026-08-30,2026-09-06,2026-09-13,2026-09-20,2026-09-27}'::text[]),
('Rosebar Day Party Saturdays (#TasteSaturdays)', 'Weekly Saturday day party at Rosebar with Hip-Hop, Latin, and Afrobeats; complimentary entry with RSVP before 5pm.', 'nightlife', 'Rosebar Lounge', '1215 Connecticut Ave NW, Dupont Circle, Washington, DC 20036', 'Dupont Circle', '3:00 PM', NULL, '15:00:00', '21:00:00', TRUE, TRUE, 'rosebar-day-party-saturdays', 'https://www.eventbrite.com/e/rosebar-day-party-saturdays-vip-rsvp-rosebar-dc-tastesaturdays-tickets-325188265857', 'https://cdn.evbuc.com/images/1001227363/14329721777/1/original.20250404-190547.jpg', '{2026-08-15,2026-08-22,2026-08-29,2026-09-05,2026-09-12,2026-09-19,2026-09-26,2026-10-03,2026-10-10,2026-10-17,2026-10-24,2026-10-31}'::text[]),
('Rosebar Sundays', 'Weekly Sunday night at Rosebar closing out the weekend with open-format Afrobeats, hip-hop, and R&B; free entry with RSVP before midnight.', 'nightlife', 'Rosebar Lounge', '1215 Connecticut Ave NW, Dupont Circle, Washington, DC 20036', 'Dupont Circle', '10:00 PM', '3:00 AM', '22:00:00', '03:00:00', TRUE, TRUE, 'rosebar-sundays', 'https://www.eventbrite.com/e/rosebar-sundays-tickets-1369009075999', 'https://cdn.evbuc.com/images/1188592371/185770512106/1/original.20260710-052105.jpg', '{2026-08-16,2026-08-23,2026-08-30,2026-09-06,2026-09-13,2026-09-20,2026-09-27,2026-10-04}'::text[])
) as e(title, description, category, venue, venue_address, neighborhood, time_label, end_label, start24, end24, is_recurring, is_free, base, link, image_url, dates)
cross join lateral unnest(e.dates) as t(d);

commit;
