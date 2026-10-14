import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedCities } from '@/lib/queries';
import { monthYear } from '@/lib/format';
import { canonical, countryName } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

// The city index (stockists spec, Phase 3): every published city ranked by
// how many shops carry Index titles. The live version of the cities post.
export const revalidate = 86400;

const TITLE = 'Where to buy independent magazines, city by city | Neesh Index';
const DESCRIPTION =
  'Cities ranked by the number of shops that carry titles from the Neesh Index, from the publishers’ own stockist lists.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: canonical('/cities') },
  openGraph: { title: TITLE, description: DESCRIPTION, url: canonical('/cities') },
};

export default async function CitiesPage() {
  const cities = await getPublishedCities();
  const updated = monthYear(
    cities.reduce<string | null>((max, c) => (!max || c.updated_at > max ? c.updated_at : max), null)
  );

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Where to buy independent magazines, city by city',
          numberOfItems: cities.length,
          itemListElement: cities.slice(0, 100).map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: canonical(`/cities/${c.slug}`),
            name: c.name,
          })),
        }}
      />

      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/index">Index</Link>
        <span>/</span>
        <span className="here">Cities</span>
      </nav>

      <section>
        <div className="wrap listing-page">
          <h1>Where to buy independent magazines</h1>
          <p className="intro">
            Cities ranked by the number of spaces that carry titles from the Neesh Index, from the
            publishers&rsquo; own stockist lists{updated && <>, collected {updated}</>}.
          </p>

          <table className="city-table">
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">City</th>
                <th scope="col" className="num">Shops</th>
                <th scope="col" className="num">Index titles</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((c, i) => (
                <tr key={c.slug}>
                  <td className="rank">{i + 1}</td>
                  <td>
                    <Link href={`/cities/${c.slug}`}>{c.name}</Link>
                    <span className="country">{countryName(c.country) ?? c.country}</span>
                  </td>
                  <td className="num">{c.store_count.toLocaleString('en')}</td>
                  <td className="num">{c.title_count.toLocaleString('en')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
