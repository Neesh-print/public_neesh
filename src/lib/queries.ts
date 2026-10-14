import { anonClient, hasSupabaseEnv } from './supabase';
import type {
  Publisher,
  Store,
  StoreNeighbor,
  StoreTitle,
  Tag,
  TagWithCount,
  Title,
  TitleFull,
  TitleStockist,
  TitleWithPublisher,
} from './types';

// A niche page publishes only when the tag has at least this many live
// titles. The launch data handoff moved this from the spec's 5 to 8: a
// six-title niche page is a thin programmatic page, the shape answer
// engines ignore. Identity tags never publish regardless of count; only
// category = 'subject' tags generate pages (see tagPublishes).
export const TAG_THRESHOLD = 8;
// Niche page size; also the ItemList JSON-LD cap.
export const PAGE_SIZE = 50;

// The visibility predicate (spec section 3) is enforced twice on purpose:
// explicitly in these queries and again by RLS on the anon key. The inner
// join on directory_publishers means titles whose publisher fails the
// publisher gate drop out via RLS even before the explicit filters.
// Public publisher columns only. contact_email, claimed_email, claim_method
// and eligibility_note are not readable by anon (column grants), so never
// select directory_publishers with *.
const PUBLISHER_COLUMNS =
  'id, name, slug, website, country, city, claimed, claimed_at, removed, eligible, stockist_page_url, stockist_status, stockist_checked_at, created_at, updated_at';
const TITLE_SELECT = `*, publisher:directory_publishers!inner(${PUBLISHER_COLUMNS})`;

function visibleTitles(client = anonClient()) {
  return client
    .from('directory_titles')
    .select(TITLE_SELECT)
    .eq('removed', false)
    .in('status', ['active', 'dormant']);
}

// Only subject tags at or over the threshold generate niche pages, enter
// the sitemap, or render as links. Identity tags store and can render as
// plain text on a profile, but get no page.
export function tagPublishes(tag: { category: string | null; live_count: number }): boolean {
  return tag.category === 'subject' && tag.live_count >= TAG_THRESHOLD;
}

export async function getFeaturedTitles(limit = 8): Promise<TitleWithPublisher[]> {
  if (!hasSupabaseEnv) return [];
  const { data } = await visibleTitles().order('updated_at', { ascending: false }).limit(limit);
  return (data as unknown as TitleWithPublisher[]) ?? [];
}

export async function getAllVisibleTitleSlugs(): Promise<
  { slug: string; updated_at: string }[]
> {
  if (!hasSupabaseEnv) return [];
  const { data } = await anonClient()
    .from('directory_titles')
    .select('slug, updated_at, publisher:directory_publishers!inner(id)')
    .eq('removed', false)
    .in('status', ['active', 'dormant'])
    .limit(10000);
  return (data ?? []).map((r) => ({ slug: r.slug, updated_at: r.updated_at }));
}

// Everything the catalog grid on the directory home needs, in one query.
export async function getCatalogTitles(limit = 400): Promise<TitleFull[]> {
  if (!hasSupabaseEnv) return [];
  const { data } = await anonClient()
    .from('directory_titles')
    .select(`${TITLE_SELECT}, directory_title_tags(tag:directory_tags(*))`)
    .eq('removed', false)
    .in('status', ['active', 'dormant'])
    .order('name')
    .limit(limit);
  return ((data as unknown as (TitleWithPublisher & {
    directory_title_tags: { tag: Tag }[];
  })[]) ?? []).map((row) => ({
    ...row,
    tags: sortSubjectFirst((row.directory_title_tags ?? []).map((t) => t.tag).filter(Boolean)),
  }));
}

export async function getTitleBySlug(slug: string): Promise<TitleFull | null> {
  if (!hasSupabaseEnv) return null;
  const { data } = await anonClient()
    .from('directory_titles')
    .select(`${TITLE_SELECT}, directory_title_tags(tag:directory_tags(*))`)
    .eq('slug', slug)
    .eq('removed', false)
    .in('status', ['active', 'dormant'])
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as TitleWithPublisher & {
    directory_title_tags: { tag: Tag }[];
  };
  return {
    ...row,
    tags: sortSubjectFirst((row.directory_title_tags ?? []).map((t) => t.tag).filter(Boolean)),
  };
}

// Every shop on the title's publisher's current stockist list. Read through
// v_title_stockists, a security_invoker view, so the stockists RLS (current
// links to eligible, non-removed publishers) applies. Paged because the
// largest list is close to PostgREST's default 1000-row cap.
export async function getTitleStockists(titleId: string): Promise<TitleStockist[]> {
  if (!hasSupabaseEnv) return [];
  const client = anonClient();
  const pageSize = 1000;
  const rows: TitleStockist[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from('v_title_stockists')
      .select('store_slug, store_name, city, borough, country, city_slug, source_url, collected_at, list_scope')
      .eq('title_id', titleId)
      .order('store_slug')
      .range(from, from + pageSize - 1);
    if (error || !data) break;
    rows.push(...(data as TitleStockist[]));
    if (data.length < pageSize) break;
  }
  // A shop can appear twice (publisher-wide and title-specific links);
  // keep one row, preferring the title-specific one.
  const byStore = new Map<string, TitleStockist>();
  for (const r of rows) {
    const seen = byStore.get(r.store_slug);
    if (!seen || (seen.list_scope === 'publisher' && r.list_scope === 'title')) byStore.set(r.store_slug, r);
  }
  return [...byStore.values()];
}

// How many visible titles a publisher has in the Index. A publisher-wide
// stockist list only needs a caveat when it is shared by more than one.
export async function countPublisherTitles(publisherId: string): Promise<number> {
  if (!hasSupabaseEnv) return 0;
  const { count } = await anonClient()
    .from('directory_titles')
    .select('id', { count: 'exact', head: true })
    .eq('publisher_id', publisherId)
    .eq('removed', false)
    .in('status', ['active', 'dormant']);
  return count ?? 0;
}

const STORE_COLUMNS =
  'id, slug, name, city, borough, country, website, claimed, claimed_at, address, instagram, hours, description';

export async function getStoreBySlug(slug: string): Promise<Store | null> {
  if (!hasSupabaseEnv) return null;
  const { data } = await anonClient()
    .from('directory_stores')
    .select(STORE_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();
  return (data as Store | null) ?? null;
}

// Every Index title on a shop's shelf, one row per title (a title can come
// from both a publisher-wide and a title-specific link; keep the specific).
export async function getStoreTitles(slug: string): Promise<StoreTitle[]> {
  if (!hasSupabaseEnv) return [];
  const { data } = await anonClient()
    .from('v_store_titles')
    .select(
      'title_id, title_name, title_slug, cover, available_on_neesh, publisher_name, publisher_slug, list_scope, source_url, collected_at'
    )
    .eq('store_slug', slug)
    .order('title_name')
    .limit(1000);
  const byTitle = new Map<string, StoreTitle>();
  for (const row of (data as StoreTitle[]) ?? []) {
    const seen = byTitle.get(row.title_id);
    if (!seen || (seen.list_scope === 'publisher' && row.list_scope === 'title')) {
      byTitle.set(row.title_id, row);
    }
  }
  return [...byTitle.values()];
}

export async function getStoreNeighbors(slug: string, limit = 6): Promise<StoreNeighbor[]> {
  if (!hasSupabaseEnv) return [];
  const { data } = await anonClient().rpc('directory_store_neighbors', {
    p_slug: slug,
    p_limit: limit,
  });
  return (data as StoreNeighbor[]) ?? [];
}

// Slugs of stores with at least one current, visible Index title, for the
// stores sitemap. directory_listed_stores applies the visibility predicate
// in one pass; paging v_store_titles as anon times out. Throws on error so a
// partial sitemap is never served.
export async function getAllListedStoreSlugs(): Promise<{ slug: string; collected_at: string }[]> {
  if (!hasSupabaseEnv) return [];
  const client = anonClient();
  const pageSize = 1000;
  const rows: { slug: string; collected_at: string }[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .rpc('directory_listed_stores')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`directory_listed_stores failed: ${error.message}`);
    const page = (data as { slug: string; last_collected: string }[]) ?? [];
    rows.push(...page.map((r) => ({ slug: r.slug, collected_at: r.last_collected })));
    if (page.length < pageSize) break;
  }
  return rows;
}

// Subject tags ahead of identity tags, so tags[0] is always the primary niche.
function sortSubjectFirst(tags: Tag[]): Tag[] {
  return [...tags].sort((a, b) =>
    (a.category === 'subject' ? 0 : 1) - (b.category === 'subject' ? 0 : 1)
  );
}

export async function getPublisherBySlug(
  slug: string
): Promise<{ publisher: Publisher; titles: Title[] } | null> {
  if (!hasSupabaseEnv) return null;
  const client = anonClient();
  const { data: publisher } = await client
    .from('directory_publishers')
    .select(PUBLISHER_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();
  if (!publisher) return null;
  const { data: titles } = await client
    .from('directory_titles')
    .select('*')
    .eq('publisher_id', publisher.id)
    .eq('removed', false)
    .in('status', ['active', 'dormant'])
    .order('name');
  return { publisher: publisher as Publisher, titles: (titles as Title[]) ?? [] };
}

export async function getAllVisiblePublisherSlugs(): Promise<
  { slug: string; updated_at: string }[]
> {
  if (!hasSupabaseEnv) return [];
  const { data } = await anonClient()
    .from('directory_publishers')
    .select('slug, updated_at')
    .eq('removed', false)
    .eq('eligible', true)
    .limit(10000);
  return data ?? [];
}

// Tag counts come through the RLS-filtered title_tags rows, so live_count is
// the count of visible titles, which is what the 5-title threshold needs.
export async function getTagsWithCounts(): Promise<TagWithCount[]> {
  if (!hasSupabaseEnv) return [];
  const { data } = await anonClient()
    .from('directory_tags')
    .select('*, directory_title_tags(count)')
    .order('name');
  return (data ?? []).map((t) => {
    const { directory_title_tags, ...tag } = t as Tag & {
      directory_title_tags: { count: number }[];
    };
    return { ...tag, live_count: directory_title_tags?.[0]?.count ?? 0 };
  });
}

export async function getTagBySlug(slug: string): Promise<TagWithCount | null> {
  if (!hasSupabaseEnv) return null;
  const { data } = await anonClient()
    .from('directory_tags')
    .select('*, directory_title_tags(count)')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return null;
  const { directory_title_tags, ...tag } = data as Tag & {
    directory_title_tags: { count: number }[];
  };
  return { ...tag, live_count: directory_title_tags?.[0]?.count ?? 0 };
}

export async function getTitlesForTag(
  tagId: string,
  page: number
): Promise<{ titles: TitleWithPublisher[]; total: number }> {
  if (!hasSupabaseEnv) return { titles: [], total: 0 };
  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await anonClient()
    .from('directory_titles')
    .select(`${TITLE_SELECT}, directory_title_tags!inner(tag_id)`, { count: 'exact' })
    .eq('directory_title_tags.tag_id', tagId)
    .eq('removed', false)
    .in('status', ['active', 'dormant'])
    .order('name')
    .range(from, from + PAGE_SIZE - 1);
  return { titles: (data as unknown as TitleWithPublisher[]) ?? [], total: count ?? 0 };
}
