import type { SupabaseClient } from '@supabase/supabase-js';

// The Index pages a publisher's portal edit can change, so
// /api/revalidate-listing refreshes those and nothing else. Refreshing the
// whole site after one edit sent every page back to the database on its next
// visit, which is the load a crawl then multiplied.
//
// A publisher's details and titles appear on: their publisher page; each
// title's page and order page; the niche pages of those titles' tags; the
// catalog; every store page that lists them; those stores' city pages; the
// store and city indexes; and the homepage (featured titles).

export interface ListingRows {
  publisherSlugs: string[];
  titleSlugs: string[];
  tagSlugs: string[];
  storeSlugs: string[];
  citySlugs: string[];
}

// Routes are the app's file paths, not the public URLs: /index/<niche> is a
// rewrite to /catalog/<niche>, and revalidatePath matches the route.
export const NICHE_PAGINATION_ROUTE = '/catalog/[niche]/page/[n]';

export function listingPaths(rows: ListingRows): string[] {
  const paths = new Set<string>(['/', '/catalog', '/stores', '/cities']);
  for (const slug of rows.publisherSlugs) paths.add(`/publishers/${slug}`);
  for (const slug of rows.titleSlugs) {
    paths.add(`/titles/${slug}`);
    paths.add(`/order/${slug}`);
  }
  for (const slug of rows.tagSlugs) paths.add(`/catalog/${slug}`);
  for (const slug of rows.storeSlugs) paths.add(`/stores/${slug}`);
  for (const slug of rows.citySlugs) paths.add(`/cities/${slug}`);
  return [...paths];
}

const uniq = (values: (string | null | undefined)[]) =>
  [...new Set(values.filter((v): v is string => typeof v === 'string' && v.length > 0))];

// Reads, with the service client, what the given Index publishers touch.
// Removed and hidden rows are included on purpose: a page that just lost a
// title needs refreshing too.
export async function loadListingRows(db: SupabaseClient, publisherIds: string[]): Promise<ListingRows> {
  if (publisherIds.length === 0) {
    return { publisherSlugs: [], titleSlugs: [], tagSlugs: [], storeSlugs: [], citySlugs: [] };
  }

  const [publishers, titles, stockists] = await Promise.all([
    db.from('directory_publishers').select('slug').in('id', publisherIds),
    db.from('directory_titles').select('id, slug').in('publisher_id', publisherIds),
    db.from('directory_stockists').select('store_id').in('publisher_id', publisherIds).eq('is_current', true),
  ]);
  for (const r of [publishers, titles, stockists]) if (r.error) throw r.error;

  const titleRows = (titles.data ?? []) as { id: string; slug: string }[];
  const storeIds = uniq(((stockists.data ?? []) as { store_id: string }[]).map((s) => s.store_id));

  const [tags, stores] = await Promise.all([
    titleRows.length
      ? db.from('directory_title_tags').select('tag:directory_tags(slug)').in('title_id', titleRows.map((t) => t.id))
      : Promise.resolve({ data: [], error: null }),
    storeIds.length
      ? db.from('directory_stores').select('slug, city, country').in('id', storeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const r of [tags, stores]) if (r.error) throw r.error;

  const storeRows = (stores.data ?? []) as { slug: string; city: string | null; country: string | null }[];
  const countries = uniq(storeRows.map((s) => s.country));
  let citySlugs: string[] = [];
  if (countries.length) {
    const cities = await db.from('directory_cities').select('slug, name, country').in('country', countries);
    if (cities.error) throw cities.error;
    const wanted = new Set(storeRows.filter((s) => s.city && s.country).map((s) => `${s.country}|${s.city}`));
    citySlugs = uniq(
      ((cities.data ?? []) as { slug: string; name: string; country: string }[])
        .filter((c) => wanted.has(`${c.country}|${c.name}`))
        .map((c) => c.slug)
    );
  }

  return {
    publisherSlugs: uniq(((publishers.data ?? []) as { slug: string }[]).map((p) => p.slug)),
    titleSlugs: uniq(titleRows.map((t) => t.slug)),
    tagSlugs: uniq(((tags.data ?? []) as unknown as { tag: { slug: string } | null }[]).map((t) => t.tag?.slug)),
    storeSlugs: uniq(storeRows.map((s) => s.slug)),
    citySlugs,
  };
}
