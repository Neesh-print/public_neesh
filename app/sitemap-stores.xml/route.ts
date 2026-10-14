import { getAllListedStoreSlugs } from '@/lib/queries';
import { canonical } from '@/lib/seo';

// Store pages get their own sitemap (stockists spec) so they can be watched
// separately in Search Console. Only stores with a current Index title are
// listed; the rest stay reachable but noindexed.
export const dynamic = 'force-dynamic';

export async function GET() {
  const stores = await getAllListedStoreSlugs();
  const urls = stores
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map(
      (s) =>
        `<url><loc>${canonical(`/stores/${s.slug}`)}</loc>` +
        `<lastmod>${new Date(`${s.collected_at.slice(0, 10)}T00:00:00Z`).toISOString()}</lastmod></url>`
    );
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls.join('') +
    `</urlset>`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}
