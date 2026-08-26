-- When the title's publisher joined the Neesh platform. Drives the
-- Featured badge: the three most recently joined Neesh titles are always
-- featured.
alter table public.directory_titles
  add column if not exists neesh_listed_at timestamptz;

update public.directory_titles dt
set neesh_listed_at = p.created_at
from public.magazines m
join public.publishers p on p.id = m.publisher_id
where dt.neesh_magazine_id = m.id;
