-- Your collection: fixes from the October 2026 review of /collect.
--
-- 1. Reports. Two open reports flagged a record, but nothing said they had
--    to come from different people, so one account could flag any title by
--    reporting it twice (and a flagged title used to drop out of search).
--    Now: one open report per reader per record, flagging needs two
--    different readers, a reader can file at most 20 reports a day, and the
--    note is capped at 1000 characters.
-- 2. The reader-edit policies on directory_titles and directory_issues let
--    a reader update any column of their own pending rows straight through
--    the API, skipping the blocked-word, link and duplicate checks in
--    /api/collect/add. No client code uses them; they are dropped. Readers
--    change a pending addition by reporting it or adding it again.
-- 3. The duplicate-check functions run with the service role, which skips
--    RLS, so they suggested removed, merged and rejected records, including
--    titles taken down at the publisher's request. They now apply the same
--    visibility rules as the public pages.
-- 4. claim_anonymous_activity attached every event with the caller's anon
--    id to their account. The id comes from the caller, so a signed-in user
--    who learned another device's id could take its history. Claims are now
--    limited to the last 30 days, which covers sign-in after browsing.

-- 1. Reports -----------------------------------------------------------------

-- Collapse existing duplicates (keep each reader's first open report per
-- record) so the unique index can be built.
update content_reports set resolved_at = now()
where id in (
  select id from (
    select id, row_number() over (
      partition by reporter_id, target_kind, target_id order by created_at, id
    ) as n
    from content_reports
    where resolved_at is null and reporter_id is not null
  ) ranked
  where n > 1
);

create unique index content_reports_one_open_per_reader
  on content_reports (reporter_id, target_kind, target_id)
  where resolved_at is null and reporter_id is not null;

alter table content_reports
  add constraint content_reports_note_length
  check (note is null or char_length(note) <= 1000) not valid;

-- Counting has to bypass RLS (readers cannot see reports), hence definer.
create function content_reports_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.reporter_id is not null and (
    select count(*) from content_reports
    where reporter_id = new.reporter_id and created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'report limit reached' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger content_reports_rate_limit
  before insert on content_reports
  for each row execute function content_reports_rate_limit();
revoke execute on function content_reports_rate_limit() from public, anon, authenticated;

-- Two open reports from two different readers set a record to flagged.
create or replace function content_reports_flag() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  open_reporters int;
begin
  select count(distinct reporter_id) into open_reporters from content_reports
  where target_id = new.target_id and target_kind = new.target_kind
    and resolved_at is null and reporter_id is not null;
  if open_reporters >= 2 then
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

-- 2. Reader edits -------------------------------------------------------------

drop policy if exists directory_issues_reader_edit on directory_issues;
drop policy if exists directory_titles_reader_edit on directory_titles;

-- 3. Duplicate checks ---------------------------------------------------------

create or replace function directory_similar_titles(p_name text)
returns table (id uuid, name text, slug text, publisher_name text, similarity real)
language sql stable security invoker set search_path = public, extensions as $$
  select t.id, t.name, t.slug, p.name, extensions.similarity(t.name, p_name)
  from directory_titles t join directory_publishers p on p.id = t.publisher_id
  where extensions.similarity(t.name, p_name) > 0.6
    and not t.removed and t.merged_into is null and t.review_status <> 'rejected'
    and t.status in ('active', 'dormant')
    and not p.removed and p.eligible and p.merged_into is null and p.review_status <> 'rejected'
  order by 5 desc limit 5
$$;

create or replace function directory_similar_issues(p_title_id uuid, p_label text)
returns table (id uuid, issue_label text, similarity real)
language sql stable security invoker set search_path = public, extensions as $$
  select i.id, i.issue_label, extensions.similarity(i.issue_label, p_label)
  from directory_issues i
  where i.title_id = p_title_id and extensions.similarity(i.issue_label, p_label) > 0.6
    and not i.removed and i.merged_into is null and i.review_status <> 'rejected'
  order by 3 desc limit 5
$$;

create or replace function directory_similar_publishers(p_name text)
returns table (id uuid, name text, slug text, similarity real)
language sql stable security invoker set search_path = public, extensions as $$
  select p.id, p.name, p.slug, extensions.similarity(p.name, p_name)
  from directory_publishers p
  where extensions.similarity(p.name, p_name) > 0.6
    and not p.removed and p.eligible and p.merged_into is null and p.review_status <> 'rejected'
  order by 4 desc limit 5
$$;

-- 4. Anonymous activity claims ------------------------------------------------

create or replace function claim_anonymous_activity(
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
    where anon_id = p_anon_id and user_id is null
      and created_at > now() - interval '30 days';
  end if;
end $$;
