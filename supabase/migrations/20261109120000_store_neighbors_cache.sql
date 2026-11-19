-- Precompute "Nearby spaces" on store pages.
--
-- directory_store_neighbors() was ~98% of the directory's database time
-- (pg_stat_statements, Nov 9: ~7,300 calls, 256 ms mean, 3 s max). To pick
-- six neighbours it joined every store in the same city against
-- v_store_titles, about 9,700 buffer reads per call even for one store.
-- Alone that is ~19 ms; during the Nov 7/8 crawls a few hundred at once
-- saturated the database.
--
-- The answer only changes when stockist lists or titles change, so it is
-- computed once for every store (about one second for all ~5,400) into
-- directory_store_neighbor_cache, refreshed hourly. The function keeps its
-- name, arguments and output, so the site needs no change, and now reads at
-- most 24 indexed rows.
--
-- Same rules as before: neighbours share the store's city and country,
-- carry at least one visible Index title, and are ranked by titles in
-- common, then by how many titles they carry, then by name. The `shared`
-- output column has always held the neighbour's title count (the page shows
-- it as "N Index titles"), and still does. Visibility applies the public
-- read policies explicitly, because the refresh runs as the table owner.
--
-- Also: none of directory_stores, directory_stockists, directory_titles or
-- directory_publishers had ever been analyzed, so the planner had no column
-- statistics and guessed 1-2 rows for filters that return thousands. The
-- ANALYZE at the end fixes that for every query on these tables.

create table if not exists public.directory_store_neighbor_cache (
  store_id uuid not null references public.directory_stores (id) on delete cascade,
  rank smallint not null,
  neighbor_id uuid not null references public.directory_stores (id) on delete cascade,
  shared integer not null,
  total integer not null,
  primary key (store_id, rank)
);

comment on table public.directory_store_neighbor_cache is
  'Top 24 nearby stores per store, precomputed by directory_refresh_store_neighbors() (hourly). Read through directory_store_neighbors().';

alter table public.directory_store_neighbor_cache enable row level security;

drop policy if exists directory_store_neighbor_cache_public_read on public.directory_store_neighbor_cache;
create policy directory_store_neighbor_cache_public_read
  on public.directory_store_neighbor_cache
  for select
  to public
  using (true);

revoke all on public.directory_store_neighbor_cache from anon, authenticated;
grant select on public.directory_store_neighbor_cache to anon, authenticated;

-- Rebuilds the whole cache. Set-based, with temporary tables so the planner
-- has real row counts at each step (pairing stores by shared title within
-- the same city first keeps the self-join small). Returns the row count.
create or replace function public.directory_refresh_store_neighbors()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  drop table if exists pg_temp._dsn_st, pg_temp._dsn_tot, pg_temp._dsn_sh;

  create temp table _dsn_st on commit drop as
    select distinct s.id as store_id, s.city, s.country, t.id as title_id
    from public.directory_stores s
    join public.directory_stockists k on k.store_id = s.id and k.is_current
    join public.directory_publishers p
      on p.id = k.publisher_id
     and p.removed = false and p.eligible = true and p.merged_into is null
     and p.review_status <> 'rejected'
    join public.directory_titles t
      on t.publisher_id = k.publisher_id and (k.title_id is null or k.title_id = t.id)
    where t.removed = false and t.merged_into is null and t.review_status <> 'rejected'
      and t.status in ('active', 'dormant')
      and s.city is not null;
  analyze pg_temp._dsn_st;

  create temp table _dsn_tot on commit drop as
    select store_id, count(*)::int as total from pg_temp._dsn_st group by store_id;
  analyze pg_temp._dsn_tot;

  create temp table _dsn_sh on commit drop as
    select a.store_id, b.store_id as neighbor_id, count(*)::int as shared
    from pg_temp._dsn_st a
    join pg_temp._dsn_st b
      on b.title_id = a.title_id and b.city = a.city and b.country = a.country
     and b.store_id <> a.store_id
    group by 1, 2;
  analyze pg_temp._dsn_sh;

  delete from public.directory_store_neighbor_cache;

  insert into public.directory_store_neighbor_cache (store_id, rank, neighbor_id, shared, total)
  select store_id, rank, neighbor_id, shared, total
  from (
    select me.id as store_id,
           n.id as neighbor_id,
           coalesce(sh.shared, 0) as shared,
           tt.total,
           row_number() over (
             partition by me.id
             order by coalesce(sh.shared, 0) desc, tt.total desc, n.name
           ) as rank
    from public.directory_stores me
    join public.directory_stores n
      on n.city = me.city and n.country = me.country and n.id <> me.id
    join pg_temp._dsn_tot tt on tt.store_id = n.id
    left join pg_temp._dsn_sh sh on sh.store_id = me.id and sh.neighbor_id = n.id
    where me.city is not null
  ) ranked
  where rank <= 24;

  get diagnostics v_rows = row_count;
  return v_rows;
end $$;

revoke all on function public.directory_refresh_store_neighbors() from public, anon, authenticated;
grant execute on function public.directory_refresh_store_neighbors() to service_role;

-- Same name, arguments and output as before; now a lookup.
create or replace function public.directory_store_neighbors(p_slug text, p_limit integer default 6)
returns table(store_slug text, store_name text, borough text, shared integer)
language sql
stable
set search_path to 'public'
as $$
  select n.slug, n.name, n.borough, c.total
  from directory_stores me
  join directory_store_neighbor_cache c on c.store_id = me.id
  join directory_stores n on n.id = c.neighbor_id
  where me.slug = p_slug and me.city is not null
  order by c.rank
  limit greatest(1, least(p_limit, 24));
$$;

-- Fill it now, then hourly. Stockist lists change through imports, so an
-- hour is the most a new list waits to show up in Nearby spaces.
select public.directory_refresh_store_neighbors();

do $$
begin
  if exists (select 1 from cron.job where jobname = 'directory-refresh-store-neighbors') then
    perform cron.unschedule('directory-refresh-store-neighbors');
  end if;
  perform cron.schedule(
    'directory-refresh-store-neighbors',
    '7 * * * *',
    'select public.directory_refresh_store_neighbors()'
  );
end $$;

analyze public.directory_stores;
analyze public.directory_stockists;
analyze public.directory_titles;
analyze public.directory_publishers;
