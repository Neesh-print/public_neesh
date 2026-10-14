import { getPublishedCities } from '@/lib/queries';
import { canonical } from '@/lib/seo';

// City pages get their own sitemap (stockists spec), published cities only
// (CITY_THRESHOLD shops or more), so search engines never see the hundreds
// of one-shop cities.
export const dynamic = 'force-dynamic';

export async function GET() {
  const cities = await getPublishedCities();
  const urls = [
    `<url><loc>${canonical('/cities')}</loc></url>`,
    ...cities.map(
      (c) =>
        `<url><loc>${canonical(`/cities/${c.slug}`)}</loc>` +
        `<lastmod>${new Date(c.updated_at).toISOString()}</lastmod></url>`
    ),
  ];
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
