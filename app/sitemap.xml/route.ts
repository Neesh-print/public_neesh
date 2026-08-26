import {
  getAllVisiblePublisherSlugs,
  getAllVisibleTitleSlugs,
  getTagsWithCounts,
  tagPublishes,
} from '@/lib/queries';
import { canonical } from '@/lib/seo';

// Generated from the database on request, not as a build artifact (spec 1.7).
// Removed and excluded profiles drop out automatically because these queries
// run through the visibility predicate.
export const dynamic = 'force-dynamic';

function entry(path: string, lastmod?: string): string {
  const lm = lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : '';
  return `<url><loc>${canonical(path)}</loc>${lm}</url>`;
}

export async function GET() {
  const [titles, publishers, tags] = await Promise.all([
    getAllVisibleTitleSlugs(),
    getAllVisiblePublisherSlugs(),
    getTagsWithCounts(),
  ]);

  // Static marketing routes alongside the DB-driven directory entries
  // (handoff section 11).
  const urls: string[] = [
    entry('/'),
    entry('/index'),
    entry('/publishers'),
    entry('/spaces'),
    entry('/packs'),
    entry('/journal'),
    entry('/about'),
    entry('/faq'),
  ];
  for (const tag of tags) {
    if (tagPublishes(tag)) urls.push(entry(`/magazines/${tag.slug}`));
  }
  for (const t of titles) urls.push(entry(`/titles/${t.slug}`, t.updated_at));
  for (const p of publishers) urls.push(entry(`/publishers/${p.slug}`, p.updated_at));

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls.join('') +
    `</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
