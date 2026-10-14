-- Spaces that stock through Neesh (have a retailer account on the
-- marketplace) are flagged on the directory, so the site can say so.
-- Matched by hand on shop name and city against retailers, October 2026.
alter table directory_stores add column if not exists on_neesh boolean not null default false;

-- Two spaces were listed twice: once with a city, once without (a
-- publisher's list gave no city). Move the city-less listings onto the main
-- entry, then remove the empty duplicate. No publisher appears on both, so
-- no listing collides.
update directory_stockists set store_id = '9ca40c88-b448-4fd5-a48f-14dc2b10ac83' -- chess-club-portland
where store_id = '1f46fcc5-acbb-4fb6-8f4f-4263e57531de';                          -- chess-club-us
update directory_stockists set store_id = '964c8c0d-e14b-44e7-ac9c-65e0f023bdad' -- smoke-signals-san-francisco
where store_id = '938e8352-41de-4afd-b078-a491e1cb62af';                          -- smoke-signals-newsstand-us
delete from directory_stores
where id in ('1f46fcc5-acbb-4fb6-8f4f-4263e57531de', '938e8352-41de-4afd-b078-a491e1cb62af');

update directory_stores set on_neesh = true
where slug in (
  'chess-club-portland',
  'smoke-signals-san-francisco',
  'disko-coffee-cambridge',
  'tender-loving-empire-portland',
  'another-corner-philadelphia'
);

select refresh_directory_cities();
