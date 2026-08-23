import { anonClient, hasSupabaseEnv } from './supabase';
import type {
  Publisher,
  Tag,
  TagWithCount,
  Title,
  TitleFull,
  TitleWithPublisher,
} from './types';

// A niche page publishes only when the tag has at least this many live titles.
export const TAG_THRESHOLD = 5;
// Niche page size; also the ItemList JSON-LD cap.
export const PAGE_SIZE = 50;

// The visibility predicate (spec section 3) is enforced twice on purpose:
// explicitly in these queries and again by RLS on the anon key. The inner
// join on directory_publishers means titles whose publisher fails the
// publisher gate drop out via RLS even before the explicit filters.
const TITLE_SELECT = '*, publisher:directory_publishers!inner(*)';

function visibleTitles(client = anonClient()) {
  return client
    .from('directory_titles')
    .select(TITLE_SELECT)
    .eq('removed', false)
    .in('status', ['active', 'dormant']);
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
    tags: (row.directory_title_tags ?? []).map((t) => t.tag).filter(Boolean),
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
    tags: (row.directory_title_tags ?? []).map((t) => t.tag).filter(Boolean),
  };
}

export async function getPublisherBySlug(
  slug: string
): Promise<{ publisher: Publisher; titles: Title[] } | null> {
  if (!hasSupabaseEnv) return null;
  const client = anonClient();
  const { data: publisher } = await client
    .from('directory_publishers')
    .select('*')
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
