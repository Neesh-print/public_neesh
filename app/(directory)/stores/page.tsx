import type { Metadata } from 'next';
import Link from 'next/link';
import { countListedStores, getOnNeeshStoreSlugs, getStoreRanking, STORE_RANK_MIN } from '@/lib/queries';
import { breadcrumbLd, canonical, countryName } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { RankFilter } from '@/components/RankFilter';

// The spaces index: every space carrying STORE_RANK_MIN or more Index titles,
// ranked by how many it carries. Spaces with fewer live on their city page.
export const revalidate = 86400;

const TITLE = 'Where to buy independent magazines, space by space | Neesh Index';
const DESCRIPTION =
  'The bookshops, newsagents and spaces that carry the most titles from the Neesh Index, from the publishers’ own stockist lists.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: canonical('/stores') },
  openGraph: { title: TITLE, description: DESCRIPTION, url: canonical('/stores') },
};

export default async function StoresPage() {
  const [stores, total, onNeesh] = await Promise.all([
    getStoreRanking(),
    countListedStores(),
    getOnNeeshStoreSlugs(),
  ]);
  const rest = Math.max(0, total - stores.length);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Where to buy independent magazines, space by space',
          url: canonical('/stores'),
          numberOfItems: stores.length,
          itemListElement: stores.slice(0, 100).map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: canonical(`/stores/${s.store_slug}`),
            name: s.store_name,
          })),
        }}
      />

      <JsonLd
        data={breadcrumbLd([
          { name: 'Index', path: '/index' },
          { name: 'Spaces', path: '/stores' },
        ])}
      />

      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/index">Index</Link>
        <span>/</span>
        <span className="here">Spaces</span>
      </nav>

      <section>
        <div className="wrap listing-page">
          <h1>Spaces that sell independent magazines</h1>
          <p className="intro">
            The spaces that carry the most titles from the Neesh Index, from the publishers&rsquo;
            own stockist lists.
          </p>

          <RankFilter tableId="space-ranking" />

          <table className="city-table" id="space-ranking">
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Space</th>
                <th scope="col" className="num">Index titles</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s, i) => {
                const country = countryName(s.country) ?? s.country;
                const place = s.city ? `${s.city}, ${country}` : country;
                return (
                  <tr
                    key={s.store_slug}
                    data-search={`${s.store_name} ${s.city ?? ''} ${country}`.toLowerCase()}
                  >
                    <td className="rank">{i + 1}</td>
                    <td>
                      <Link href={`/stores/${s.store_slug}`}>{s.store_name}</Link>
                      <span className="country">
                        {s.city_slug ? <Link href={`/cities/${s.city_slug}`}>{place}</Link> : place}
                      </span>
                      {onNeesh.has(s.store_slug) && <span className="on-neesh-tag">On Neesh</span>}
                    </td>
                    <td className="num">{s.title_count.toLocaleString('en')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="stockists-empty" data-filter-empty="space-ranking" hidden>
            No spaces match that search.
          </p>

          {rest > 0 && (
            <p className="stockists-source" style={{ marginTop: 24 }}>
              This list shows spaces carrying {STORE_RANK_MIN} or more Index titles. Another{' '}
              {rest.toLocaleString('en')} spaces carry one or two, listed on their{' '}
              <Link href="/cities" className="text-link">
                city&rsquo;s page
              </Link>
              .
            </p>
          )}
        </div>
      </section>
    </>
  );
}
