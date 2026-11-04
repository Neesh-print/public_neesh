-- Publishers edit their own Index listings (/listing). Two additions.
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

-- 2. An audit trail of publisher edits: who signed in with which address,
-- what changed, before and after. Written only by the service role from
-- /api/listing/update; no public access.
create table if not exists public.directory_listing_edits (
  id           uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references public.directory_publishers(id) on delete cascade,
  title_id     uuid references public.directory_titles(id) on delete cascade,
  editor_email text not null,
  changes      jsonb not null,          -- { field: { from, to } }
  created_at   timestamptz not null default now()
);
create index if not exists directory_listing_edits_publisher_idx
  on public.directory_listing_edits (publisher_id, created_at desc);

alter table public.directory_listing_edits enable row level security;
-- No policies: anon and authenticated get nothing; the service role bypasses.
