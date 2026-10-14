import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCityFor, getStoreBySlug, getStoreNeighbors, getStoreTitles } from '@/lib/queries';
import { listJoin, monthYear, plural } from '@/lib/format';
import { canonical, countryName } from '@/lib/seo';
import { coverPublicUrl } from '@/lib/supabase';
import type { Store, StoreTitle } from '@/lib/types';
import { JsonLd } from '@/components/JsonLd';
import { StoreClaim } from '@/components/StoreClaim';
import { SubmittedNotice } from '@/components/SubmittedNotice';
import { TitleGridCard } from '@/components/TitleGridCard';

// Store pages (stockists spec, Phase 2): every shop on a publisher's
// stockist list gets a page showing its shelf of Index titles. Rendered on
// first request and cached; ~5,400 pages are not worth building up front.
export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

function placeLine(store: Store): string | null {
  const country = countryName(store.country);
  return [store.borough, store.city, country].filter(Boolean).join(', ') || null;
}

function instagramUrl(handle: string): string {
  return handle.startsWith('http')
    ? handle
    : `https://www.instagram.com/${handle.replace(/^@/, '')}/`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [store, titles] = await Promise.all([getStoreBySlug(slug), getStoreTitles(slug)]);
  if (!store) return { title: 'Not found | Neesh' };
  const where = store.city ?? countryName(store.country);
  const metaTitle = `Magazines at ${store.name}${where ? `, ${where}` : ''} | Neesh Index`;
  const names = titles.slice(0, 3).map((t) => t.title_name);
  const more = titles.length - names.length;
  const description = titles.length
    ? `Independent magazines from the Neesh Index at ${store.name}${where ? ` in ${where}` : ''}: ` +
      `${listJoin(more > 0 ? [...names, `${more} more`] : names)}.`
    : `${store.name}${where ? ` in ${where}` : ''} on the Neesh Index.`;
  return {
    title: metaTitle,
    description,
    alternates: { canonical: canonical(`/stores/${store.slug}`) },
    // A shop with no current Index titles stays reachable but out of search.
    robots: titles.length ? undefined : { index: false },
    openGraph: { title: metaTitle, description, url: canonical(`/stores/${store.slug}`) },
  };
}

// Titles that only reach this shop through a publisher-wide list shared by
// several titles: say so, so a reader checks before making the trip.
function sharedListNote(titles: StoreTitle[]): string | null {
  const byPublisher = new Map<string, string[]>();
  for (const t of titles) {
    if (t.list_scope !== 'publisher') continue;
    byPublisher.set(t.publisher_name, [...(byPublisher.get(t.publisher_name) ?? []), t.title_name]);
  }
  const notes = [...byPublisher.entries()]
    .filter(([, names]) => names.length > 1)
    .map(
      ([publisher, names]) =>
        `${listJoin(names)} come from ${publisher}'s stockist list, which covers all its titles`
    );
  return notes.length ? `${notes.join('. ')}. Ask which ones are on the shelf before you go.` : null;
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();
  const [titles, neighbors, city] = await Promise.all([
    getStoreTitles(slug),
    getStoreNeighbors(slug),
    store.city ? getCityFor(store.city, store.country) : Promise.resolve(null),
  ]);

  const place = placeLine(store);
  const publishers = [...new Set(titles.map((t) => t.publisher_name))].sort((a, b) =>
    a.localeCompare(b, 'en')
  );
  const collected = monthYear(
    titles.reduce<string | null>((max, t) => (!max || t.collected_at > max ? t.collected_at : max), null)
  );
  const sharedNote = sharedListNote(titles);
  const onNeesh = titles.filter((t) => t.available_on_neesh).length;

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Store',
          name: store.name,
          url: canonical(`/stores/${store.slug}`),
          address: {
            '@type': 'PostalAddress',
            ...(store.address ? { streetAddress: store.address } : {}),
            ...(store.city ? { addressLocality: store.city } : {}),
            addressCountry: store.country,
          },
          ...(store.website || store.instagram
            ? {
                sameAs: [
                  ...(store.website ? [store.website] : []),
                  ...(store.instagram ? [instagramUrl(store.instagram)] : []),
                ],
              }
            : {}),
        }}
      />

      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/index">Index</Link>
        <span>/</span>
        {city ? (
          <Link href={`/cities/${city.slug}`}>{city.name}</Link>
        ) : (
          <span>{store.city ?? countryName(store.country) ?? 'Shops'}</span>
        )}
        <span>/</span>
        <span className="here">{store.name}</span>
      </nav>

      <section>
        <div className="wrap store-page">
          <div className="store-head">
            <span className="eyebrow dim">Where to buy independent magazines</span>
            {store.claimed && (
              <span className="verified-pill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                Verified by the shop
              </span>
            )}
            {store.on_neesh && <span className="verified-pill">Stocks through Neesh</span>}
            <h1>{store.name}</h1>
            {place && <p className="publisher-line">{place}</p>}
          </div>

          <SubmittedNotice />

          {store.description && <p className="title-desc">{store.description}</p>}

          {(store.address || store.hours || store.website || store.instagram) && (
            <dl className="spec-rows">
              {store.address && (
                <div className="spec-row">
                  <dt>Address</dt>
                  <dd>{store.address}</dd>
                </div>
              )}
              {store.hours && (
                <div className="spec-row">
                  <dt>Hours</dt>
                  <dd>{store.hours}</dd>
                </div>
              )}
              {store.website && (
                <div className="spec-row">
                  <dt>Website</dt>
                  <dd>
                    <a href={store.website} className="text-link" target="_blank" rel="nofollow noopener">
                      {store.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                    </a>
                  </dd>
                </div>
              )}
              {store.instagram && (
                <div className="spec-row">
                  <dt>Instagram</dt>
                  <dd>
                    <a href={instagramUrl(store.instagram)} className="text-link" target="_blank" rel="nofollow noopener">
                      @{store.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          )}

          <div className="store-shelf">
            <h2 className="titles-label">Index titles on this shelf</h2>
            {titles.length > 0 ? (
              <>
                <p className="stockists-count">
                  {plural(titles.length, 'title', 'titles')} from the Neesh Index
                  {onNeesh > 0 && <>, {onNeesh} of them orderable wholesale on Neesh</>}.
                </p>
                {sharedNote && <p className="stockists-caveat">{sharedNote}</p>}
                <div className="card-grid">
                  {titles.map((t, index) => (
                    <TitleGridCard
                      key={t.title_id}
                      eager={index < 4}
                      item={{
                        id: t.title_id,
                        name: t.title_name,
                        slug: t.title_slug,
                        cover: coverPublicUrl(t.cover),
                        publisher: t.publisher_name,
                        niche: null,
                        onNeesh: t.available_on_neesh,
                        featured: false,
                      }}
                    />
                  ))}
                </div>
                <p className="stockists-source">
                  From the stockist {publishers.length === 1 ? 'list' : 'lists'} of {listJoin(publishers)}
                  {collected && <>, collected {collected}</>}.
                </p>
              </>
            ) : (
              <p className="stockists-count">
                No publisher in the Index lists {store.name} on a current stockist list.
              </p>
            )}
          </div>

          {neighbors.length > 0 && (
            <div className="store-nearby">
              <h2 className="titles-label">Shops nearby</h2>
              <ul>
                {neighbors.map((n) => (
                  <li key={n.store_slug}>
                    <Link href={`/stores/${n.store_slug}`}>{n.store_name}</Link>
                    {n.borough && <span className="borough">{n.borough}</span>}
                    <span className="count">{plural(n.shared, 'Index title', 'Index titles')}</span>
                  </li>
                ))}
              </ul>
              {city && city.store_count > neighbors.length + 1 && (
                <p className="stockists-source" style={{ marginTop: 16 }}>
                  <Link href={`/cities/${city.slug}`} className="text-link">
                    All {plural(city.store_count, 'shop', 'shops')} in {city.name}
                  </Link>
                </p>
              )}
            </div>
          )}

          {!store.claimed && <StoreClaim storeId={store.id} storeName={store.name} />}
        </div>
      </section>
    </>
  );
}
