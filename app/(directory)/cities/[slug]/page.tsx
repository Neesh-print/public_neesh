import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  CITY_THRESHOLD,
  getCityBySlug,
  getCityStores,
  getCityTopItems,
} from '@/lib/queries';
import { monthYear, plural } from '@/lib/format';
import { canonical, countryName } from '@/lib/seo';
import { coverPublicUrl } from '@/lib/supabase';
import type { CityStore, CityTopItem } from '@/lib/types';
import { JsonLd } from '@/components/JsonLd';

// City pages (stockists spec, Phase 3): where to buy independent magazines
// in a city, from the publishers' own stockist lists. Rendered on first
// request and cached. Cities under CITY_THRESHOLD shops render but stay out
// of search and the city index.
export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const city = await getCityBySlug(slug);
  if (!city) return { title: 'Not found | Neesh' };
  const metaTitle = `Where to buy independent magazines in ${city.name} | Neesh Index`;
  const description =
    `${plural(city.store_count, 'shop', 'shops')} in ${city.name} carry ` +
    `${plural(city.title_count, 'title', 'titles')} from the Neesh Index of independent magazines.`;
  return {
    title: metaTitle,
    description,
    alternates: { canonical: canonical(`/cities/${city.slug}`) },
    robots: city.store_count >= CITY_THRESHOLD ? undefined : { index: false },
    openGraph: { title: metaTitle, description, url: canonical(`/cities/${city.slug}`) },
  };
}

// Group by borough or neighbourhood when the lists give enough of them to be
// useful (New York); otherwise one list, most titles first.
function groupStores(stores: CityStore[]): { label: string | null; stores: CityStore[] }[] {
  const withBorough = stores.filter((s) => s.borough);
  const boroughs = new Set(withBorough.map((s) => s.borough));
  if (boroughs.size < 2 || withBorough.length < stores.length * 0.25) {
    return [{ label: null, stores }];
  }
  const groups = new Map<string, CityStore[]>();
  for (const s of withBorough) groups.set(s.borough!, [...(groups.get(s.borough!) ?? []), s]);
  const ordered = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'en'))
    .map(([label, list]) => ({ label, stores: list }));
  const rest = stores.filter((s) => !s.borough);
  return rest.length ? [...ordered, { label: 'Elsewhere in the city', stores: rest }] : ordered;
}

function TopItem({ item, rank }: { item: CityTopItem; rank: number }) {
  const shops = plural(item.shops, 'shop', 'shops');
  if (item.kind === 'title' && item.title_slug) {
    const cover = coverPublicUrl(item.cover);
    return (
      <li className="city-top-item">
        <span className="rank">{rank}</span>
        <Link href={`/titles/${item.title_slug}`} className="city-top-cover" aria-hidden tabIndex={-1}>
          {cover ? <img src={cover} alt="" loading="lazy" /> : <span className="fallback" />}
        </Link>
        <span className="city-top-text">
          <Link href={`/titles/${item.title_slug}`} className="name">
            {item.title_name}
          </Link>
          <span className="meta">
            {shops}
            {item.available_on_neesh && <span className="chip order">Order now</span>}
          </span>
        </span>
      </li>
    );
  }
  const titles = item.titles ?? [];
  const cover = coverPublicUrl(item.cover);
  return (
    <li className="city-top-item">
      <span className="rank">{rank}</span>
      <span className="city-top-cover">
        {cover ? <img src={cover} alt="" loading="lazy" /> : <span className="fallback" />}
      </span>
      <span className="city-top-text">
        <span className="name">
          {titles.map((t, i) => (
            <span key={t.slug}>
              {i > 0 && (i === titles.length - 1 ? ' and ' : ', ')}
              <Link href={`/titles/${t.slug}`}>{t.name}</Link>
            </span>
          ))}
        </span>
        <span className="meta">
          {shops} sell titles from {item.publisher_name.replace(/\s+mag(azine)?$/i, '')}
        </span>
      </span>
    </li>
  );
}

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = await getCityBySlug(slug);
  if (!city) notFound();
  const [stores, top] = await Promise.all([getCityStores(slug), getCityTopItems(slug)]);
  const country = countryName(city.country);
  const groups = groupStores(stores);
  const updated = monthYear(city.updated_at);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `Where to buy independent magazines in ${city.name}`,
          numberOfItems: stores.length,
          itemListElement: stores.slice(0, 100).map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: canonical(`/stores/${s.store_slug}`),
            name: s.store_name,
          })),
        }}
      />

      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/index">Index</Link>
        <span>/</span>
        <Link href="/cities">Cities</Link>
        <span>/</span>
        <span className="here">{city.name}</span>
      </nav>

      <section>
        <div className="wrap store-page city-page">
          <div className="store-head">
            <span className="eyebrow dim">Where to buy independent magazines</span>
            <h1>{city.name}</h1>
            {country && <p className="publisher-line">{country}</p>}
          </div>

          <p className="city-lead">
            {plural(city.store_count, 'shop', 'shops')} in {city.name} carry{' '}
            {plural(city.title_count, 'title', 'titles')} from the Neesh Index.
          </p>

          {top.length > 0 && (
            <div className="store-shelf">
              <h2 className="titles-label">Most stocked here</h2>
              <ol className="city-top">
                {top.map((item, i) => (
                  <TopItem key={`${item.kind}-${item.title_slug ?? item.publisher_slug}`} item={item} rank={i + 1} />
                ))}
              </ol>
            </div>
          )}

          <div className="store-nearby city-stores">
            <h2 className="titles-label">Shops in {city.name}</h2>
            {groups.map((g) => (
              <div key={g.label ?? 'all'} className="city-store-group">
                {g.label && (
                  <h3>
                    {g.label} <span className="count">{g.stores.length}</span>
                  </h3>
                )}
                <ul>
                  {g.stores.map((s) => (
                    <li key={s.store_slug}>
                      <Link href={`/stores/${s.store_slug}`}>{s.store_name}</Link>
                      {!g.label && s.borough && <span className="borough">{s.borough}</span>}
                      <span className="count">{plural(s.title_count, 'Index title', 'Index titles')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="stockists-source">
            From the publishers&rsquo; own stockist lists{updated && <>, collected {updated}</>}.{' '}
            <Link href="/cities" className="text-link">
              See every city
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
