-- Your collection on Neesh (spec Oct 19, 2026), part 2 of 2.
--
-- Adds issues, reader state, an append-only event log and issue-level
-- availability, and extends the Index tables for coverage and review.
-- Reader-added titles reuse directory_titles and directory_publishers so the
-- Index stays one database. Collection actions get their own event table
-- instead of directory_demand_signals, which is anonymous and IP-hashed.
--
-- Additions beyond the spec's schema block, each small and named here:
--   directory_titles.collect_pilot           notification pilot membership
--   directory_issues.neesh_magazine_id       links an issue to its platform
--                                             listing (seed + order-based
--                                             availability)
--   directory_issues.followers_notified_at   new-issue email sent marker
--   directory_issues.published_year          year only, for reader additions
--   directory_issue_availability.alerts_sent_at  availability alert marker
--   collectors.can_add                       cleared after three rejected
--                                             additions, reset on review
--   created_by columns use on delete set null so account deletion works
--   content_reports.reporter_id likewise

create extension if not exists pg_trgm with schema extensions;

-- Enums
create type review_status as enum ('approved', 'pending', 'flagged', 'rejected');
create type catalogue_coverage as enum ('complete', 'partial', 'unknown');
create type collection_state as enum ('own', 'want');
create type variant_kind as enum ('alternate_cover', 'edition', 'supplement');
create type availability_level as enum ('reported', 'confirmed');
create type availability_source as enum ('store', 'publisher', 'neesh_check', 'neesh_order');
create type collection_event_type as enum (
  'own_added', 'own_removed', 'want_added', 'want_removed',
  'follow_added', 'follow_removed', 'complete_on', 'complete_off',
  'alert_requested', 'alert_cancelled', 'alert_sent',
  'stockist_click', 'purchase_click', 'acquired_confirmed',
  'issue_viewed', 'title_viewed');
create type report_reason as enum ('inaccurate', 'duplicate', 'offensive', 'other');

-- Existing Index tables (existing rows count as approved)
alter table directory_titles
  add column catalogue_coverage catalogue_coverage not null default 'unknown',
  add column coverage_checked_at timestamptz,
  add column review_status review_status not null default 'approved',
  add column created_by uuid references auth.users(id) on delete set null,
  add column reviewed_at timestamptz,
  add column review_note text,
  add column merged_into uuid references directory_titles(id),
  add column collect_pilot boolean not null default false;
alter table directory_publishers
  add column review_status review_status not null default 'approved',
  add column created_by uuid references auth.users(id) on delete set null,
  add column reviewed_at timestamptz,
  add column review_note text,
  add column merged_into uuid references directory_publishers(id);
create index directory_titles_review_idx on directory_titles (review_status, created_at);
create index directory_titles_name_trgm on directory_titles using gin (name extensions.gin_trgm_ops);
create index directory_publishers_name_trgm on directory_publishers using gin (name extensions.gin_trgm_ops);

-- Issues
create table directory_issues (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references directory_titles(id) on delete cascade,
  issue_label text not null,          -- as printed: 'Issue 04', 'Spring 2025'
  issue_number numeric,               -- for sorting; null when unnumbered
  sort_order integer,                 -- manual override for irregular numbering
  published_on date,
  published_year integer,             -- year as printed when the exact date is unknown
  cover_image_path text,
  barcode text,
  isbn text,
  cover_price numeric,
  currency character(3),
  page_count integer,
  notes text,
  source_url text,                    -- where the issue was verified
  verified_at timestamptz,
  neesh_magazine_id uuid,             -- platform listing for this issue, if any
  followers_notified_at timestamptz,  -- new-issue email sent (pilot titles)
  created_from provenance not null default 'admin_created',
  created_by uuid references auth.users(id) on delete set null,
  review_status review_status not null default 'approved',
  reviewed_at timestamptz,
  review_note text,
  merged_into uuid references directory_issues(id),
  removed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index directory_issues_title_label_uniq
  on directory_issues (title_id, lower(issue_label)) where not removed and merged_into is null;
create index directory_issues_title_idx on directory_issues (title_id);
create index directory_issues_review_idx on directory_issues (review_status, created_at);
create index directory_issues_magazine_idx on directory_issues (neesh_magazine_id) where neesh_magazine_id is not null;
create index directory_issues_label_trgm on directory_issues using gin (issue_label extensions.gin_trgm_ops);
create trigger directory_issues_updated_at
  before update on directory_issues
  for each row execute function directory_set_updated_at();

-- Variants belong to an issue; collection marks stay at issue level
create table directory_issue_variants (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references directory_issues(id) on delete cascade,
  kind variant_kind not null,
  label text not null,                -- 'Cover B', 'Japanese edition', 'Poster insert'
  cover_image_path text,
  barcode text,
  source_url text,
  created_from provenance not null default 'admin_created',
  created_by uuid references auth.users(id) on delete set null,
  review_status review_status not null default 'approved',
  created_at timestamptz not null default now()
);
create index directory_issue_variants_issue_idx on directory_issue_variants (issue_id);

-- Issue availability; title-level 'carries' stays in directory_stockists
create table directory_issue_availability (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references directory_issues(id) on delete cascade,
  store_id uuid not null references directory_stores(id) on delete cascade,
  level availability_level not null,
  source availability_source not null,
  source_url text,
  source_note text,
  observed_on date not null,
  expires_on date not null,           -- reported: +60 days, confirmed: +14 days
  alerts_sent_at timestamptz,         -- availability alerts sent for this row
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index issue_availability_live_idx on directory_issue_availability (issue_id, expires_on);

-- Fill expires_on from the level when the writer leaves it out.
create function directory_issue_availability_expiry() returns trigger
language plpgsql as $$
begin
  if new.expires_on is null then
    new.expires_on := new.observed_on + case new.level when 'confirmed' then 14 else 60 end;
  end if;
  return new;
end $$;
create trigger directory_issue_availability_expiry
  before insert on directory_issue_availability
  for each row execute function directory_issue_availability_expiry();

-- Readers
create table collectors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  home_city_id uuid references directory_cities(id),
  is_public boolean not null default false,       -- reserved, no public collections in v1
  notify_new_issues boolean not null default true,
  newsletter_opt_in boolean not null default false,
  newsletter_consent_at timestamptz,              -- set only when the box is ticked
  first_source text,                              -- utm_campaign at first visit
  first_anon_id uuid,                             -- device id before sign-in
  can_add boolean not null default true,          -- false after three rejected additions
  created_at timestamptz not null default now()
);

-- Current state: one row per reader per issue
create table collection_items (
  user_id uuid not null references collectors(user_id) on delete cascade,
  issue_id uuid not null references directory_issues(id) on delete cascade,
  state collection_state not null,
  variant_id uuid references directory_issue_variants(id) on delete set null,
  condition text,                     -- reserved for resale later
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, issue_id)
);
create index collection_items_issue_idx on collection_items (issue_id, state);
create trigger collection_items_updated_at
  before update on collection_items
  for each row execute function directory_set_updated_at();

-- Follow and Complete this title
create table collector_titles (
  user_id uuid not null references collectors(user_id) on delete cascade,
  title_id uuid not null references directory_titles(id) on delete cascade,
  following boolean not null default false,
  completing boolean not null default false,      -- switches 'Not in your collection' to 'Missing'
  updated_at timestamptz not null default now(),
  primary key (user_id, title_id)
);
create index collector_titles_following_idx on collector_titles (title_id) where following;
create trigger collector_titles_updated_at
  before update on collector_titles
  for each row execute function directory_set_updated_at();

-- Alert requests (pilot titles only)
create table availability_requests (
  user_id uuid not null references collectors(user_id) on delete cascade,
  issue_id uuid not null references directory_issues(id) on delete cascade,
  city_id uuid references directory_cities(id),
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  primary key (user_id, issue_id)
);
create index availability_requests_open_idx on availability_requests (issue_id)
  where fulfilled_at is null and cancelled_at is null;

-- Append-only history; written by triggers on state tables and by the app for clicks and views
create table collection_events (
  id bigint generated always as identity primary key,
  user_id uuid references collectors(user_id) on delete set null,
  anon_id uuid,                       -- set for actions before sign-in
  event_type collection_event_type not null,
  title_id uuid references directory_titles(id),
  issue_id uuid references directory_issues(id),
  store_id uuid references directory_stores(id),
  surface text,                       -- where it happened: title_page, shelf, wants, email
  utm_source text, utm_medium text, utm_campaign text, utm_content text,
  created_at timestamptz not null default now()
);
create index collection_events_type_idx on collection_events (event_type, created_at);
create index collection_events_issue_idx on collection_events (issue_id, event_type);
create index collection_events_anon_idx on collection_events (anon_id) where anon_id is not null and user_id is null;
create index collection_events_user_idx on collection_events (user_id, event_type, created_at);

-- Reports from readers
create table content_reports (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null check (target_kind in ('title', 'issue', 'variant', 'publisher')),
  target_id uuid not null,
  reason report_reason not null,
  note text,
  reporter_id uuid references collectors(user_id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index content_reports_open_idx on content_reports (target_id) where resolved_at is null;

-- Reader view of unowned issues for titles they collect
create view collection_not_owned with (security_invoker = true) as
select t.user_id, i.title_id, i.id as issue_id,
       coalesce(ct.completing, false) as completing
from (select distinct c.user_id, di.title_id
      from collection_items c join directory_issues di on di.id = c.issue_id
      where c.state = 'own') t
join directory_issues i on i.title_id = t.title_id
  and not i.removed and i.merged_into is null and i.review_status <> 'rejected'
left join collector_titles ct on ct.user_id = t.user_id and ct.title_id = t.title_id
where not exists (select 1 from collection_items x
  where x.user_id = t.user_id and x.issue_id = i.id and x.state = 'own');

-- ---------------------------------------------------------------------------
-- Event triggers: one collection_events row per real state change. No-op
-- upserts write nothing. claim_anonymous_activity and the merge functions set
-- collect.suppress_events for their transaction, because the anonymous events
-- (or the original events) already exist.
-- ---------------------------------------------------------------------------

create function collect_events_suppressed() returns boolean
language sql stable as $$
  select coalesce(current_setting('collect.suppress_events', true), '') = 'on'
$$;

create function collection_items_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_title uuid;
  v_issue uuid := coalesce(new.issue_id, old.issue_id);
  v_user uuid := coalesce(new.user_id, old.user_id);
begin
  if collect_events_suppressed() then return null; end if;
  select title_id into v_title from directory_issues where id = v_issue;
  if tg_op = 'INSERT' then
    insert into collection_events (user_id, event_type, title_id, issue_id)
    values (v_user, (new.state || '_added')::collection_event_type, v_title, v_issue);
  elsif tg_op = 'DELETE' then
    insert into collection_events (user_id, event_type, title_id, issue_id)
    values (v_user, (old.state || '_removed')::collection_event_type, v_title, v_issue);
  elsif new.state is distinct from old.state then
    insert into collection_events (user_id, event_type, title_id, issue_id) values
      (v_user, (old.state || '_removed')::collection_event_type, v_title, v_issue),
      (v_user, (new.state || '_added')::collection_event_type, v_title, v_issue);
  end if;
  return null;
end $$;
create trigger collection_items_log
  after insert or update or delete on collection_items
  for each row execute function collection_items_log();

create function collector_titles_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  was_following boolean := case when tg_op = 'INSERT' then false else old.following end;
  was_completing boolean := case when tg_op = 'INSERT' then false else old.completing end;
  is_following boolean := case when tg_op = 'DELETE' then false else new.following end;
  is_completing boolean := case when tg_op = 'DELETE' then false else new.completing end;
  v_user uuid := coalesce(new.user_id, old.user_id);
  v_title uuid := coalesce(new.title_id, old.title_id);
begin
  if collect_events_suppressed() then return null; end if;
  if is_following <> was_following then
    insert into collection_events (user_id, event_type, title_id)
    values (v_user, case when is_following then 'follow_added' else 'follow_removed' end::collection_event_type, v_title);
  end if;
  if is_completing <> was_completing then
    insert into collection_events (user_id, event_type, title_id)
    values (v_user, case when is_completing then 'complete_on' else 'complete_off' end::collection_event_type, v_title);
  end if;
  return null;
end $$;
create trigger collector_titles_log
  after insert or update or delete on collector_titles
  for each row execute function collector_titles_log();

create function availability_requests_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  was_open boolean := tg_op <> 'INSERT' and old.cancelled_at is null and old.fulfilled_at is null;
  is_open boolean := tg_op <> 'DELETE' and new.cancelled_at is null and new.fulfilled_at is null;
  v_user uuid := coalesce(new.user_id, old.user_id);
  v_issue uuid := coalesce(new.issue_id, old.issue_id);
  v_title uuid;
begin
  if collect_events_suppressed() then return null; end if;
  if is_open = was_open then return null; end if;
  -- Fulfilment is logged as alert_sent by the sender, not as a cancellation.
  if not is_open and tg_op = 'UPDATE' and new.fulfilled_at is not null and old.fulfilled_at is null then
    return null;
  end if;
  select title_id into v_title from directory_issues where id = v_issue;
  insert into collection_events (user_id, event_type, title_id, issue_id)
  values (v_user, case when is_open then 'alert_requested' else 'alert_cancelled' end::collection_event_type, v_title, v_issue);
  return null;
end $$;
create trigger availability_requests_log
  after insert or update or delete on availability_requests
  for each row execute function availability_requests_log();

-- ---------------------------------------------------------------------------
-- claim_anonymous_activity: on sign-in, move the device's marks (kept in
-- local storage before sign-in, passed in here) into the reader's tables and
-- stamp the reader onto that device's anonymous events. The union of both;
-- where the account already has a mark on an issue, the account wins.
--   p_items:  [{"issue_id": uuid, "state": "own"|"want"}, ...]
--   p_titles: [{"title_id": uuid, "following": bool, "completing": bool}, ...]
-- ---------------------------------------------------------------------------
create function claim_anonymous_activity(
  p_anon_id uuid,
  p_items jsonb default '[]'::jsonb,
  p_titles jsonb default '[]'::jsonb,
  p_first_source text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not signed in'; end if;

  insert into collectors (user_id, first_source, first_anon_id)
  values (v_user, p_first_source, p_anon_id)
  on conflict (user_id) do update set
    first_source = coalesce(collectors.first_source, excluded.first_source),
    first_anon_id = coalesce(collectors.first_anon_id, excluded.first_anon_id);

  perform set_config('collect.suppress_events', 'on', true);

  insert into collection_items (user_id, issue_id, state)
  select v_user, x.issue_id, x.state
  from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as x(issue_id uuid, state collection_state)
  join directory_issues i on i.id = x.issue_id
  where x.state is not null
  on conflict (user_id, issue_id) do nothing;

  insert into collector_titles (user_id, title_id, following, completing)
  select v_user, x.title_id, coalesce(x.following, false), coalesce(x.completing, false)
  from jsonb_to_recordset(coalesce(p_titles, '[]'::jsonb)) as x(title_id uuid, following boolean, completing boolean)
  join directory_titles t on t.id = x.title_id
  on conflict (user_id, title_id) do update set
    following = collector_titles.following or excluded.following,
    completing = collector_titles.completing or excluded.completing;

  perform set_config('collect.suppress_events', 'off', true);

  if p_anon_id is not null then
    update collection_events set user_id = v_user
    where anon_id = p_anon_id and user_id is null;
  end if;
end $$;
revoke all on function claim_anonymous_activity(uuid, jsonb, jsonb, text) from public, anon;
grant execute on function claim_anonymous_activity(uuid, jsonb, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Merges. Repoint marks (Own over Want), follows, availability, requests,
-- variants and events, then set merged_into. The merged row is never
-- deleted, so history stays traceable. Admin or service role only.
-- ---------------------------------------------------------------------------
create function merge_issue(from_id uuid, into_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' and not coalesce(is_admin(), false) then
    raise exception 'admin only';
  end if;
  if from_id = into_id then raise exception 'cannot merge an issue into itself'; end if;
  perform set_config('collect.suppress_events', 'on', true);

  -- Own beats Want where a reader has both.
  update collection_items c set state = 'own'
  from collection_items f
  where f.issue_id = from_id and f.state = 'own'
    and c.user_id = f.user_id and c.issue_id = into_id and c.state = 'want';
  delete from collection_items f
  where f.issue_id = from_id
    and exists (select 1 from collection_items c where c.user_id = f.user_id and c.issue_id = into_id);
  update collection_items set issue_id = into_id, variant_id = null where issue_id = from_id;

  delete from availability_requests f
  where f.issue_id = from_id
    and exists (select 1 from availability_requests r where r.user_id = f.user_id and r.issue_id = into_id);
  update availability_requests set issue_id = into_id where issue_id = from_id;

  update directory_issue_availability set issue_id = into_id where issue_id = from_id;
  update directory_issue_variants set issue_id = into_id where issue_id = from_id;
  update collection_events set issue_id = into_id where issue_id = from_id;
  update content_reports set resolved_at = now()
  where target_kind = 'issue' and target_id = from_id and resolved_at is null;

  update directory_issues set merged_into = into_id, reviewed_at = now() where id = from_id;
  perform set_config('collect.suppress_events', 'off', true);
end $$;

create function merge_title(from_id uuid, into_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_match uuid;
begin
  if auth.role() <> 'service_role' and not coalesce(is_admin(), false) then
    raise exception 'admin only';
  end if;
  if from_id = into_id then raise exception 'cannot merge a title into itself'; end if;

  -- Issues: merge into a same-label issue on the target, else move across.
  for r in select id, issue_label from directory_issues
           where title_id = from_id and merged_into is null loop
    select id into v_match from directory_issues
    where title_id = into_id and merged_into is null and not removed
      and lower(issue_label) = lower(r.issue_label);
    if v_match is not null then
      perform merge_issue(r.id, v_match);
    else
      update directory_issues set title_id = into_id where id = r.id;
    end if;
  end loop;

  perform set_config('collect.suppress_events', 'on', true);
  update collector_titles c set
    following = c.following or f.following,
    completing = c.completing or f.completing
  from collector_titles f
  where f.title_id = from_id and c.user_id = f.user_id and c.title_id = into_id;
  delete from collector_titles f
  where f.title_id = from_id
    and exists (select 1 from collector_titles c where c.user_id = f.user_id and c.title_id = into_id);
  update collector_titles set title_id = into_id where title_id = from_id;

  update collection_events set title_id = into_id where title_id = from_id;
  update directory_stockists set title_id = into_id where title_id = from_id;
  insert into directory_title_tags (title_id, tag_id)
  select into_id, tag_id from directory_title_tags where title_id = from_id
  on conflict do nothing;
  update content_reports set resolved_at = now()
  where target_kind = 'title' and target_id = from_id and resolved_at is null;

  update directory_titles set merged_into = into_id, reviewed_at = now() where id = from_id;
  perform set_config('collect.suppress_events', 'off', true);
end $$;
revoke all on function merge_issue(uuid, uuid) from public, anon;
revoke all on function merge_title(uuid, uuid) from public, anon;
grant execute on function merge_issue(uuid, uuid) to authenticated;
grant execute on function merge_title(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Moderation rules
-- ---------------------------------------------------------------------------

-- Two open reports on one record set it to flagged until reviewed.
create function content_reports_flag() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  open_count int;
begin
  select count(*) into open_count from content_reports
  where target_id = new.target_id and target_kind = new.target_kind and resolved_at is null;
  if open_count >= 2 then
    if new.target_kind = 'issue' then
      update directory_issues set review_status = 'flagged' where id = new.target_id and review_status <> 'rejected';
    elsif new.target_kind = 'title' then
      update directory_titles set review_status = 'flagged' where id = new.target_id and review_status <> 'rejected';
    elsif new.target_kind = 'publisher' then
      update directory_publishers set review_status = 'flagged' where id = new.target_id and review_status <> 'rejected';
    elsif new.target_kind = 'variant' then
      update directory_issue_variants set review_status = 'flagged' where id = new.target_id and review_status <> 'rejected';
    end if;
  end if;
  return null;
end $$;
create trigger content_reports_flag
  after insert on content_reports
  for each row execute function content_reports_flag();

-- A reader with three rejected additions loses the ability to add until
-- reviewed (an admin sets collectors.can_add back to true).
create function reader_rejections_check() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rejected int;
begin
  if new.created_by is null or new.created_from <> 'reader_created'
     or new.review_status <> 'rejected' or old.review_status = 'rejected' then
    return null;
  end if;
  select (select count(*) from directory_issues where created_by = new.created_by and created_from = 'reader_created' and review_status = 'rejected')
       + (select count(*) from directory_titles where created_by = new.created_by and created_from = 'reader_created' and review_status = 'rejected')
       + (select count(*) from directory_publishers where created_by = new.created_by and created_from = 'reader_created' and review_status = 'rejected')
    into rejected;
  if rejected >= 3 then
    update collectors set can_add = false where user_id = new.created_by;
  end if;
  return null;
end $$;
create trigger directory_issues_rejections after update of review_status on directory_issues
  for each row execute function reader_rejections_check();
create trigger directory_titles_rejections after update of review_status on directory_titles
  for each row execute function reader_rejections_check();
create trigger directory_publishers_rejections after update of review_status on directory_publishers
  for each row execute function reader_rejections_check();

-- ---------------------------------------------------------------------------
-- Stores on Neesh confirm availability from their orders: a delivered Neesh
-- order for an issue counts as Reported stocking on the delivery date. The
-- store is the directory store whose approved claim names the retailer.
-- ---------------------------------------------------------------------------
create function orders_report_issue_availability() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'delivered' or old.status = 'delivered' then return null; end if;
  insert into directory_issue_availability (issue_id, store_id, level, source, source_note, observed_on)
  select i.id, c.store_id, 'reported', 'neesh_order', 'Neesh order ' || new.id, current_date
  from directory_issues i
  join directory_store_claims c on c.retailer_id = new.retailer_id and c.status = 'approved'
  where i.neesh_magazine_id = new.magazine_id and not i.removed and i.merged_into is null;
  return null;
end $$;
create trigger orders_report_issue_availability
  after update of status on orders
  for each row execute function orders_report_issue_availability();

-- ---------------------------------------------------------------------------
-- Review queue: pending, flagged or reported records, oldest first. The view
-- itself is closed to anon and authenticated; the admin portal reads it
-- through get_directory_review_queue(), which checks is_admin().
-- ---------------------------------------------------------------------------
create view directory_review_queue as
select 'issue' as kind, id, title_id as parent_id, issue_label as label, source_url,
  cover_image_path, review_status, created_from, created_by, created_at,
  (select count(*) from content_reports r where r.target_id = i.id and r.resolved_at is null) as open_reports
  from directory_issues i
  where merged_into is null and (review_status in ('pending', 'flagged')
    or exists (select 1 from content_reports r where r.target_id = i.id and r.resolved_at is null))
union all
select 'title', id, publisher_id, name, null, cover_image_path, review_status, created_from, created_by, created_at,
  (select count(*) from content_reports r where r.target_id = t.id and r.resolved_at is null)
  from directory_titles t
  where merged_into is null and (review_status in ('pending', 'flagged')
    or exists (select 1 from content_reports r where r.target_id = t.id and r.resolved_at is null))
union all
select 'publisher', id, null, name, website, null, review_status, created_from, created_by, created_at,
  (select count(*) from content_reports r where r.target_id = p.id and r.resolved_at is null)
  from directory_publishers p
  where merged_into is null and (review_status in ('pending', 'flagged')
    or exists (select 1 from content_reports r where r.target_id = p.id and r.resolved_at is null))
union all
select 'variant', id, issue_id, label, source_url, cover_image_path, review_status, created_from, created_by, created_at,
  (select count(*) from content_reports r where r.target_id = v.id and r.resolved_at is null)
  from directory_issue_variants v
  where review_status in ('pending', 'flagged')
    or exists (select 1 from content_reports r where r.target_id = v.id and r.resolved_at is null)
order by created_at;
revoke all on directory_review_queue from anon, authenticated;

create function get_directory_review_queue() returns setof directory_review_queue
language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce(is_admin(), false) then raise exception 'admin only'; end if;
  return query select * from directory_review_queue;
end $$;
revoke all on function get_directory_review_queue() from public, anon;
grant execute on function get_directory_review_queue() to authenticated;

-- Approve, reject or flag one record. Approval stamps verified_at (issues),
-- resolves open reports and can record the source URL. Rejection hides the
-- record (RLS drops rejected rows) and resolves its reports.
create function review_directory_record(
  p_kind text, p_id uuid, p_status review_status,
  p_note text default null, p_source_url text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' and not coalesce(is_admin(), false) then
    raise exception 'admin only';
  end if;
  if p_kind = 'issue' then
    update directory_issues set review_status = p_status, reviewed_at = now(),
      review_note = coalesce(p_note, review_note),
      source_url = coalesce(p_source_url, source_url),
      verified_at = case when p_status = 'approved' then now() else verified_at end
    where id = p_id;
  elsif p_kind = 'title' then
    update directory_titles set review_status = p_status, reviewed_at = now(),
      review_note = coalesce(p_note, review_note),
      verified_at = case when p_status = 'approved' then now() else verified_at end
    where id = p_id;
  elsif p_kind = 'publisher' then
    update directory_publishers set review_status = p_status, reviewed_at = now(),
      review_note = coalesce(p_note, review_note),
      website = coalesce(website, p_source_url)
    where id = p_id;
  elsif p_kind = 'variant' then
    update directory_issue_variants set review_status = p_status,
      source_url = coalesce(p_source_url, source_url)
    where id = p_id;
  else
    raise exception 'unknown kind %', p_kind;
  end if;
  if p_status in ('approved', 'rejected') then
    update content_reports set resolved_at = now()
    where target_kind = p_kind and target_id = p_id and resolved_at is null;
  end if;
end $$;
revoke all on function review_directory_record(text, uuid, review_status, text, text) from public, anon;
grant execute on function review_directory_record(text, uuid, review_status, text, text) to authenticated;

-- An alternate cover, edition or supplement submitted as a new issue moves
-- into directory_issue_variants; the issue row is merged into its parent so
-- any marks on it carry over.
create function issue_to_variant(p_issue_id uuid, p_parent_id uuid, p_kind variant_kind, p_label text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.role() <> 'service_role' and not coalesce(is_admin(), false) then
    raise exception 'admin only';
  end if;
  insert into directory_issue_variants (issue_id, kind, label, cover_image_path, barcode, source_url, created_from, created_by, review_status)
  select p_parent_id, p_kind, coalesce(p_label, issue_label), cover_image_path, barcode, source_url, created_from, created_by, 'approved'
  from directory_issues where id = p_issue_id
  returning id into v_id;
  perform merge_issue(p_issue_id, p_parent_id);
  return v_id;
end $$;
revoke all on function issue_to_variant(uuid, uuid, variant_kind, text) from public, anon;
grant execute on function issue_to_variant(uuid, uuid, variant_kind, text) to authenticated;

-- Fuzzy duplicate check for the add flow: candidates above 0.6 similarity.
create function directory_similar_titles(p_name text)
returns table (id uuid, name text, slug text, publisher_name text, similarity real)
language sql stable security invoker set search_path = public, extensions as $$
  select t.id, t.name, t.slug, p.name, extensions.similarity(t.name, p_name)
  from directory_titles t join directory_publishers p on p.id = t.publisher_id
  where extensions.similarity(t.name, p_name) > 0.6
  order by 5 desc limit 5
$$;
create function directory_similar_issues(p_title_id uuid, p_label text)
returns table (id uuid, issue_label text, similarity real)
language sql stable security invoker set search_path = public, extensions as $$
  select i.id, i.issue_label, extensions.similarity(i.issue_label, p_label)
  from directory_issues i
  where i.title_id = p_title_id and extensions.similarity(i.issue_label, p_label) > 0.6
  order by 3 desc limit 5
$$;
create function directory_similar_publishers(p_name text)
returns table (id uuid, name text, slug text, similarity real)
language sql stable security invoker set search_path = public, extensions as $$
  select p.id, p.name, p.slug, extensions.similarity(p.name, p_name)
  from directory_publishers p
  where extensions.similarity(p.name, p_name) > 0.6
  order by 4 desc limit 5
$$;

-- ---------------------------------------------------------------------------
-- Keep readers out of public.users and public.profiles, which belong to
-- spaces and publishers. Reader sign-ups carry role = 'reader' in their user
-- metadata (set by the /api/collect/auth route); for them the account trigger
-- does nothing and the collectors row is created on first sign-in instead.
-- The rest of handle_new_user is unchanged.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  user_role text;
  display_name text;
  base_username text;
  final_username text;
begin
  if new.raw_user_meta_data->>'role' = 'reader' then
    return new;
  end if;

  user_role := new.raw_user_meta_data->>'role';
  user_role := case
    when user_role = 'admin' then 'retailer'
    when user_role in ('publisher', 'retailer') then user_role
    else 'retailer'
  end;

  -- Prefer the business the person applied with, so usernames read like
  -- "bobbety" rather than "hello-7b2c". Any failure here falls back to the
  -- previous email-prefix logic so signups never break.
  begin
    display_name := coalesce(
      nullif(new.raw_user_meta_data->>'business_name', ''),
      nullif(new.raw_user_meta_data->>'shop_name', ''),
      (select coalesce(nullif(pa.business_name, ''), pa.magazine_title)
         from public.publisher_applications pa
        where lower(pa.email) = lower(new.email)
        order by pa.created_at desc limit 1),
      (select ra.shop_name
         from public.retailer_applications ra
        where lower(ra.buyer_email) = lower(new.email)
        order by ra.created_at desc limit 1)
    );
    final_username := public.suggest_username(display_name, new.email);
  exception when others then
    base_username := coalesce(nullif(split_part(new.email, '@', 1), ''), 'user');
    final_username := base_username;
    while exists (select 1 from public.users where username = final_username) loop
      final_username := base_username || '-' || substr(md5(random()::text), 1, 4);
    end loop;
  end;

  insert into public.users (id, email, username, role, password_hash, email_verified)
  values (
    new.id,
    new.email,
    final_username,
    user_role,
    'managed_by_supabase_auth',
    case when new.email_confirmed_at is not null then true else false end
  )
  on conflict (id) do nothing;

  insert into public.profiles (user_id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$function$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

-- Index tables: rejected and merged rows drop out of public reads.
alter policy directory_titles_public_read on directory_titles
  using (
    removed = false
    and merged_into is null
    and review_status <> 'rejected'
    and status in ('active','dormant')
    and exists (
      select 1 from directory_publishers p
      where p.id = directory_titles.publisher_id
        and p.removed = false
        and p.eligible = true
    )
  );
alter policy directory_publishers_public_read on directory_publishers
  using (
    removed = false and eligible = true and merged_into is null and review_status <> 'rejected'
  );

alter table directory_issues             enable row level security;
alter table directory_issue_variants     enable row level security;
alter table directory_issue_availability enable row level security;
alter table collectors                   enable row level security;
alter table collection_items             enable row level security;
alter table collector_titles             enable row level security;
alter table availability_requests        enable row level security;
alter table collection_events            enable row level security;
alter table content_reports              enable row level security;

create policy directory_issues_public_read on directory_issues
  for select using (
    not removed and merged_into is null and review_status <> 'rejected'
    and exists (select 1 from directory_titles t where t.id = directory_issues.title_id)
  );
create policy directory_issue_variants_public_read on directory_issue_variants
  for select using (
    review_status <> 'rejected'
    and exists (select 1 from directory_issues i where i.id = directory_issue_variants.issue_id)
  );

-- Reader additions go through /api/collect/add (service role) so the
-- duplicate, blocked-word, image and rate checks cannot be skipped. These
-- policies let a collector edit their own pending rows and nothing else.
create policy directory_issues_reader_edit on directory_issues
  for update to authenticated
  using (created_by = auth.uid() and created_from = 'reader_created' and review_status = 'pending')
  with check (created_by = auth.uid() and created_from = 'reader_created' and review_status = 'pending');
create policy directory_titles_reader_edit on directory_titles
  for update to authenticated
  using (created_by = auth.uid() and created_from = 'reader_created' and review_status = 'pending')
  with check (created_by = auth.uid() and created_from = 'reader_created' and review_status = 'pending');

create policy directory_issue_availability_public_read on directory_issue_availability
  for select using (expires_on >= current_date);

create policy collectors_owner on collectors
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy collection_items_owner on collection_items
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy collector_titles_owner on collector_titles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy availability_requests_owner on availability_requests
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- collection_events: no client policies. Triggers and server routes only.

create policy content_reports_insert on content_reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy content_reports_admin_read on content_reports
  for select to authenticated using (coalesce(is_admin(), false));

-- A collector may not lift their own add ban, or start out with one lifted.
create function collectors_guard_can_add() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'authenticated' and not coalesce(is_admin(), false) then
    if tg_op = 'INSERT' then
      new.can_add := true;
    else
      new.can_add := old.can_add;
    end if;
  end if;
  return new;
end $$;
create trigger collectors_guard_can_add
  before insert or update on collectors
  for each row execute function collectors_guard_can_add();

-- Admins can read and update the Index review columns from the portal.
create policy directory_issues_admin on directory_issues
  for all to authenticated using (coalesce(is_admin(), false)) with check (coalesce(is_admin(), false));
create policy directory_issue_variants_admin on directory_issue_variants
  for all to authenticated using (coalesce(is_admin(), false)) with check (coalesce(is_admin(), false));
create policy directory_issue_availability_admin on directory_issue_availability
  for all to authenticated using (coalesce(is_admin(), false)) with check (coalesce(is_admin(), false));
create policy content_reports_admin_update on content_reports
  for update to authenticated using (coalesce(is_admin(), false)) with check (coalesce(is_admin(), false));

-- Reader cover uploads wait in a private bucket until approved; approved
-- covers move into the public covers bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reader-uploads', 'reader-uploads', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Admin access for the Index review page in the admin portal: every Index
-- row (including rejected and removed ones), coverage edits, the add ban,
-- and reader cover uploads (read reader-uploads, write covers) so approved
-- covers can be moved into the public bucket.
create policy directory_titles_admin on directory_titles
  for all to authenticated using (coalesce(is_admin(), false)) with check (coalesce(is_admin(), false));
create policy directory_publishers_admin on directory_publishers
  for all to authenticated using (coalesce(is_admin(), false)) with check (coalesce(is_admin(), false));
create policy collectors_admin on collectors
  for all to authenticated using (coalesce(is_admin(), false)) with check (coalesce(is_admin(), false));
create policy reader_uploads_admin_read on storage.objects
  for select to authenticated using (bucket_id = 'reader-uploads' and coalesce(public.is_admin(), false));
create policy covers_admin_write on storage.objects
  for insert to authenticated with check (bucket_id = 'covers' and coalesce(public.is_admin(), false));
create policy covers_admin_update on storage.objects
  for update to authenticated using (bucket_id = 'covers' and coalesce(public.is_admin(), false));
-- Storage upserts read the existing object first.
create policy covers_admin_read on storage.objects
  for select to authenticated using (bucket_id = 'covers' and coalesce(public.is_admin(), false));
