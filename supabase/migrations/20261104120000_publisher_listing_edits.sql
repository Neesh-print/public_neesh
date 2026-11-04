-- Publishers edit their own Index listings from the Neesh portal
-- (app: /publisher/index-listing, through the index-listing edge function).
-- Three additions.
--
-- 1. A primary niche per title. Until now tags[0] was whichever subject tag
-- the database returned first, and 39 titles carry two or three subject
-- tags, so a publisher had no way to say which niche the title belongs to
-- (breadcrumb, OG card, catalog filter). At most one primary link per
-- title. Titles nobody has edited keep is_primary = false everywhere and
-- render exactly as before.
alter table public.directory_title_tags
  add column if not exists is_primary boolean not null default false;

create unique index if not exists directory_title_tags_one_primary_idx
  on public.directory_title_tags (title_id) where is_primary;

-- 2. Which Index publishers a portal user may edit: the claimed, live Index
-- publishers whose titles are linked to that user's Neesh magazines, plus
-- any claimed Index publisher whose claim email is the user's email. Only
-- the claiming publisher ever passes this check.
create or replace function public.directory_owned_publisher_ids(p_user uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct t.publisher_id
  from public.publishers pp
  join public.magazines mm on mm.publisher_id = pp.id
  join public.directory_neesh_links l on l.magazine_id = mm.id
  join public.directory_titles t on t.id = l.title_id
  join public.directory_publishers dp on dp.id = t.publisher_id
  where pp.user_id = p_user and dp.claimed and not dp.removed
  union
  select dp.id
  from public.directory_publishers dp
  join public.users u on u.id = p_user
  where dp.claimed and not dp.removed
    and u.email is not null and lower(dp.claimed_email) = lower(u.email)
$$;

-- Called only by the edge function and the site's revalidation route, both
-- with the service role.
revoke execute on function public.directory_owned_publisher_ids(uuid) from public, anon, authenticated;
grant execute on function public.directory_owned_publisher_ids(uuid) to service_role;

-- 3. An audit trail of publisher edits: who, what changed, before and
-- after. Written only by the service role; no public access.
create table if not exists public.directory_listing_edits (
  id           uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references public.directory_publishers(id) on delete cascade,
  title_id     uuid references public.directory_titles(id) on delete cascade,
  editor_user  uuid,
  editor_email text,
  changes      jsonb not null,          -- { field: { from, to } }
  created_at   timestamptz not null default now()
);
create index if not exists directory_listing_edits_publisher_idx
  on public.directory_listing_edits (publisher_id, created_at desc);

alter table public.directory_listing_edits enable row level security;
-- No policies: anon and authenticated get nothing; the service role bypasses.
