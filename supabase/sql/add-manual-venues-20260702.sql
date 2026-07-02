with input as (
  select * from jsonb_to_recordset('[
{"name":"Capital Fringe","address":"1358 Florida Ave NE, Washington, DC 20002","neighborhood":"H Street Corridor / Trinidad","venue_type":"Community / Cultural Venue","website_url":"https://capitalfringe.org/","image_url":"https://capitalfringe.org/wp-content/uploads/2021/12/xcapital-fringe-logo-00.png.pagespeed.ic.71sgqYWo4A.png"},
{"name":"Capo Backroom","address":"715a Florida Ave, NW DC","neighborhood":"Adams Morgan","venue_type":"Speakeasy","website_url":"","image_url":"https://img.partyslate.com/companies/34154/brand-image-74c31aa7-e327-4869-af72-03640459bcd3.jpg?tr=w-96"},
{"name":"Carter Barron Amphitheater","address":"4850 Colorado Ave NW, Washington, DC 20011","neighborhood":"Crestwood / Fort Reno","venue_type":"Theater / Performance","website_url":"","image_url":"https://images.squarespace-cdn.com/content/v1/69cb0fa01bb0d217993f27b7/1774915490921-NUO7QGJAWT9VESO5P5HO/51248139902_fe768e0a07_o.jpg?format=1000w"},
{"name":"City State Brewing Company","address":"705 Edgewood St NE, First Floor, Washington, DC 20017","neighborhood":"NoMa","venue_type":"Brewery / Distillery / Wine","website_url":"https://citystatedc.com/","image_url":"https://images.squarespace-cdn.com/content/v1/6514459601803350dd05a9cf/9d86a320-b6a5-4111-af0b-da9fd000e524/city+state.png?format=1500w"},
{"name":"City Tap House Dupont","address":"1250 Connecticut Ave NW suite 105 Washington DC US 20036","neighborhood":"Dupont Circle","venue_type":"Bar","website_url":"","image_url":"https://images.getbento.com/tiWGJqETaGzztMey9AMA_logo.png"},
{"name":"Club Glow","address":"1608 7th St NW, Washington, DC 20001","neighborhood":"Shaw / Mount Vernon Square","venue_type":"Nightclub / Lounge","website_url":"","image_url":"https://clubglow.com/wp-content/uploads/2023/10/glow_logo_menu.png"},
{"name":"Club Timehri","address":"2439 18th St NW, Washington, DC 20009, United States","neighborhood":"Adams Morgan","venue_type":"Nightclub / Lounge","website_url":"","image_url":"https://clubtimehri.com/images/logo-new.jpg"},
{"name":"Conduit Road Public House","address":"","neighborhood":"Cleveland Park","venue_type":"Bar","website_url":"https://www.conduitroadllc.com","image_url":"https://img1.wsimg.com/isteam/ip/8604f28c-3e3e-4a44-ad78-7368d7764cca/blob-3367016.png/:/rs=w:1333,h:400,cg:true,m/cr=w:1333,h:400/qt=q:95"},
{"name":"Crooked Run Fermentation","address":"","neighborhood":"NoMa / Union Market","venue_type":"Community / Cultural Venue","website_url":"https://www.crookedrunbrewing.com","image_url":"https://cdn.prod.website-files.com/6982402c57ac0b05d43983f5/698243a15a6a86043a86cf3f_CRFlogoHorizontal.avif"},
{"name":"Dance Loft on 14 (Warehouse)","address":"4618 14th St NW, Washington, District of Columbia 20011","neighborhood":"Columbia Heights","venue_type":"Nightclub / Lounge","website_url":"https://www.danceloft14.org/","image_url":"https://images.squarespace-cdn.com/content/v1/55412229e4b026d3b560dedb/cef1e2ce-730a-4e7d-adc5-d54201e00486/10+Year+Main+Logo-Gradient_White+Text.png?format=1500w"}
]'::jsonb) as item(name text, address text, neighborhood text, venue_type text, website_url text, image_url text)
), updated as (
  update public.venues venue
  set address = coalesce(nullif(input.address, ''), venue.address),
      venue_type = coalesce(nullif(input.venue_type, ''), venue.venue_type),
      neighborhood = coalesce(nullif(input.neighborhood, ''), venue.neighborhood),
      website_url = coalesce(nullif(input.website_url, ''), venue.website_url),
      source_name = 'Lokal manual venue import',
      raw_data = venue.raw_data || jsonb_strip_nulls(jsonb_build_object('manual_imported_at', now(), 'image_url', nullif(input.image_url, ''))),
      image_url = coalesce(nullif(input.image_url, ''), venue.image_url),
      updated_at = now()
  from input
  where public.venue_image_key(venue.name) = public.venue_image_key(input.name)
  returning venue.id
)
insert into public.venues (name, address, venue_type, neighborhood, website_url, source_name, source_key, raw_data, image_url, imported_at, created_at, updated_at)
select input.name,
       nullif(input.address, ''),
       nullif(input.venue_type, ''),
       nullif(input.neighborhood, ''),
       nullif(input.website_url, ''),
       'Lokal manual venue import',
       'venue:' || public.venue_image_key(input.name),
       jsonb_strip_nulls(jsonb_build_object('manual_imported_at', now(), 'image_url', nullif(input.image_url, ''))),
       nullif(input.image_url, ''),
       now(), now(), now()
from input
where not exists (
  select 1 from public.venues venue where public.venue_image_key(venue.name) = public.venue_image_key(input.name)
)
on conflict (source_key) do update
set address = coalesce(excluded.address, public.venues.address),
    venue_type = coalesce(excluded.venue_type, public.venues.venue_type),
    neighborhood = coalesce(excluded.neighborhood, public.venues.neighborhood),
    website_url = coalesce(excluded.website_url, public.venues.website_url),
    source_name = excluded.source_name,
    raw_data = public.venues.raw_data || excluded.raw_data,
    image_url = coalesce(excluded.image_url, public.venues.image_url),
    updated_at = now();

select name, address, neighborhood, venue_type, website_url, case when image_url is not null and image_url <> '' then 'yes' else 'no' end as has_image
from public.venues
where public.venue_image_key(name) in (select public.venue_image_key(name) from jsonb_to_recordset('[
{"name":"Capital Fringe","address":"1358 Florida Ave NE, Washington, DC 20002","neighborhood":"H Street Corridor / Trinidad","venue_type":"Community / Cultural Venue","website_url":"https://capitalfringe.org/","image_url":"https://capitalfringe.org/wp-content/uploads/2021/12/xcapital-fringe-logo-00.png.pagespeed.ic.71sgqYWo4A.png"},
{"name":"Capo Backroom","address":"715a Florida Ave, NW DC","neighborhood":"Adams Morgan","venue_type":"Speakeasy","website_url":"","image_url":"https://img.partyslate.com/companies/34154/brand-image-74c31aa7-e327-4869-af72-03640459bcd3.jpg?tr=w-96"},
{"name":"Carter Barron Amphitheater","address":"4850 Colorado Ave NW, Washington, DC 20011","neighborhood":"Crestwood / Fort Reno","venue_type":"Theater / Performance","website_url":"","image_url":"https://images.squarespace-cdn.com/content/v1/69cb0fa01bb0d217993f27b7/1774915490921-NUO7QGJAWT9VESO5P5HO/51248139902_fe768e0a07_o.jpg?format=1000w"},
{"name":"City State Brewing Company","address":"705 Edgewood St NE, First Floor, Washington, DC 20017","neighborhood":"NoMa","venue_type":"Brewery / Distillery / Wine","website_url":"https://citystatedc.com/","image_url":"https://images.squarespace-cdn.com/content/v1/6514459601803350dd05a9cf/9d86a320-b6a5-4111-af0b-da9fd000e524/city+state.png?format=1500w"},
{"name":"City Tap House Dupont","address":"1250 Connecticut Ave NW suite 105 Washington DC US 20036","neighborhood":"Dupont Circle","venue_type":"Bar","website_url":"","image_url":"https://images.getbento.com/tiWGJqETaGzztMey9AMA_logo.png"},
{"name":"Club Glow","address":"1608 7th St NW, Washington, DC 20001","neighborhood":"Shaw / Mount Vernon Square","venue_type":"Nightclub / Lounge","website_url":"","image_url":"https://clubglow.com/wp-content/uploads/2023/10/glow_logo_menu.png"},
{"name":"Club Timehri","address":"2439 18th St NW, Washington, DC 20009, United States","neighborhood":"Adams Morgan","venue_type":"Nightclub / Lounge","website_url":"","image_url":"https://clubtimehri.com/images/logo-new.jpg"},
{"name":"Conduit Road Public House","address":"","neighborhood":"Cleveland Park","venue_type":"Bar","website_url":"https://www.conduitroadllc.com","image_url":"https://img1.wsimg.com/isteam/ip/8604f28c-3e3e-4a44-ad78-7368d7764cca/blob-3367016.png/:/rs=w:1333,h:400,cg:true,m/cr=w:1333,h:400/qt=q:95"},
{"name":"Crooked Run Fermentation","address":"","neighborhood":"NoMa / Union Market","venue_type":"Community / Cultural Venue","website_url":"https://www.crookedrunbrewing.com","image_url":"https://cdn.prod.website-files.com/6982402c57ac0b05d43983f5/698243a15a6a86043a86cf3f_CRFlogoHorizontal.avif"},
{"name":"Dance Loft on 14 (Warehouse)","address":"4618 14th St NW, Washington, District of Columbia 20011","neighborhood":"Columbia Heights","venue_type":"Nightclub / Lounge","website_url":"https://www.danceloft14.org/","image_url":"https://images.squarespace-cdn.com/content/v1/55412229e4b026d3b560dedb/cef1e2ce-730a-4e7d-adc5-d54201e00486/10+Year+Main+Logo-Gradient_White+Text.png?format=1500w"}
]'::jsonb) as item(name text, address text, neighborhood text, venue_type text, website_url text, image_url text))
order by name;