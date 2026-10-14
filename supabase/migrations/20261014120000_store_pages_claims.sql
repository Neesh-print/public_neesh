-- Stockists Phase 2: store pages and store claims (Neesh stockists build
-- spec). directory_stores is publicly readable, so nothing private goes on
-- it: claimant emails and the linked retailer account live on
-- directory_store_claims, which has no public access at all.

-- Fields a claimed space can fill in (via Neesh, after approval).
alter table directory_stores
  add column claimed     boolean not null default false,
  add column claimed_at  timestamptz,
  add column address     text,
  add column instagram   text,
  add column hours       text,
  add column description text;
-- website already exists on directory_stores.

create table directory_store_claims (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references directory_stores(id) on delete cascade,
  email       text not null,
  name        text,
  role        text,
  website     text,
  message     text,
  status      claim_status not null default 'pending',
  claim_method text,                 -- 'domain' or 'manual' once approved
  retailer_id uuid references retailers(id) on delete set null,
  admin_notes text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index directory_store_claims_pending_idx
  on directory_store_claims(store_id) where status = 'pending';
alter table directory_store_claims enable row level security;
-- No policies: anon and authenticated get nothing; the service role bypasses.

-- v_store_titles gains who listed the shop, so a store page can say when a
-- title comes from a publisher-wide list shared by several titles.
create or replace view v_store_titles with (security_invoker = true) as
select s.slug              as store_slug,
       t.id                as title_id,
       t.name              as title_name,
       t.slug              as title_slug,
       t.cover_image_path  as cover,
       t.available_on_neesh,
       p.name              as publisher_name,
       p.slug              as publisher_slug,
       case when k.title_id is null then 'publisher' else 'title' end as list_scope,
       k.source_url,
       k.collected_at
from directory_stores s
join directory_stockists k on k.store_id = s.id and k.is_current
join directory_titles t on t.publisher_id = k.publisher_id
                       and (k.title_id is null or k.title_id = t.id)
join directory_publishers p on p.id = k.publisher_id
where t.removed = false and t.status in ('active', 'dormant');

-- "Shops nearby": other stores in the same city, ranked by how many Index
-- titles they share with this one. Runs as the caller, so RLS applies.
create function directory_store_neighbors(p_slug text, p_limit int default 6)
returns table (store_slug text, store_name text, borough text, shared int)
language sql stable security invoker set search_path = public as $$
  with me as (
    select s.id, s.city, s.country from directory_stores s where s.slug = p_slug
  ), mine as (
    select distinct title_id from v_store_titles where store_slug = p_slug
  )
  select s.slug, s.name, s.borough, count(distinct v.title_id)::int as shared
  from me
  join directory_stores s on s.city = me.city and s.country = me.country and s.id <> me.id
  join v_store_titles v on v.store_slug = s.slug
  left join mine on mine.title_id = v.title_id
  where me.city is not null
  group by s.slug, s.name, s.borough
  order by count(distinct mine.title_id) desc, count(distinct v.title_id) desc, s.name
  limit greatest(1, least(p_limit, 24));
$$;
grant execute on function directory_store_neighbors(text, int) to anon, authenticated;

-- "Pitch next" for the claim welcome email: titles on Neesh that shops with
-- a similar shelf carry and this shop does not. Service role only.
create function directory_store_pitch_next(p_store_id uuid, p_limit int default 5)
returns table (title_id uuid, title_name text, title_slug text, shops int)
language sql stable security definer set search_path = public as $$
  with mine as (
    select t.id
    from directory_stockists k
    join directory_titles t on t.publisher_id = k.publisher_id
                           and (k.title_id is null or k.title_id = t.id)
    where k.store_id = p_store_id and k.is_current
  ), peers as (
    select k.store_id, count(distinct t.id) as overlap
    from directory_stockists k
    join directory_titles t on t.publisher_id = k.publisher_id
                           and (k.title_id is null or k.title_id = t.id)
    where k.is_current and k.store_id <> p_store_id and t.id in (select id from mine)
    group by k.store_id
  )
  select t.id, t.name, t.slug, count(distinct k.store_id)::int as shops
  from peers
  join directory_stockists k on k.store_id = peers.store_id and k.is_current
  join directory_titles t on t.publisher_id = k.publisher_id
                         and (k.title_id is null or k.title_id = t.id)
  where t.available_on_neesh and t.removed = false
    and t.id not in (select id from mine)
  group by t.id, t.name, t.slug
  order by sum(peers.overlap) desc, t.name
  limit p_limit;
$$;
revoke all on function directory_store_pitch_next(uuid, int) from public, anon, authenticated;
grant execute on function directory_store_pitch_next(uuid, int) to service_role;

-- Stores with at least one current, visible Index title, for the stores
-- sitemap. Paging v_store_titles as anon re-checks RLS on every row and
-- times out; this applies the same visibility predicate once, explicitly.
create function directory_listed_stores()
returns table (slug text, last_collected date)
language sql stable security definer set search_path = public as $$
  select s.slug, max(k.collected_at)
  from directory_stores s
  join directory_stockists k on k.store_id = s.id and k.is_current
  join directory_publishers p on p.id = k.publisher_id and p.removed = false and p.eligible = true
  join directory_titles t on t.publisher_id = p.id
                         and (k.title_id is null or k.title_id = t.id)
                         and t.removed = false and t.status in ('active', 'dormant')
  group by s.slug
  order by s.slug;
$$;
grant execute on function directory_listed_stores() to anon, authenticated;
