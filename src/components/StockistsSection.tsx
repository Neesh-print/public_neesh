import Link from 'next/link';
import { monthYear, plural } from '@/lib/format';
import { countryName } from '@/lib/seo';
import type { TitleFull, TitleStockist } from '@/lib/types';
import { StockistFilter } from './StockistFilter';

// "Where it's stocked" on a title page (stockists spec, Phase 1). Server
// rendered so the shop list is in the HTML crawlers see. Lists are kept per
// publisher, so a title shows its publisher's shops.

const EXPANDED_CITIES = 5;
const FILTER_THRESHOLD = 50;

interface CityGroup {
  key: string;
  label: string;
  citySlug: string | null;
  shops: TitleStockist[];
}

function groupByCity(stockists: TitleStockist[]): { groups: CityGroup[]; unknown: TitleStockist[] } {
  const byCity = new Map<string, CityGroup>();
  const unknown: TitleStockist[] = [];
  for (const s of stockists) {
    if (!s.city) {
      unknown.push(s);
      continue;
    }
    const key = `${s.city}|${s.country}`;
    let group = byCity.get(key);
    if (!group) {
      const country = countryName(s.country);
      group = {
        key,
        label: country ? `${s.city}, ${country}` : s.city,
        citySlug: s.city_slug,
        shops: [],
      };
      byCity.set(key, group);
    }
    group.shops.push(s);
  }
  const byName = (a: TitleStockist, b: TitleStockist) =>
    a.store_name.localeCompare(b.store_name, 'en', { sensitivity: 'base' });
  const groups = [...byCity.values()]
    .map((g) => ({ ...g, shops: g.shops.sort(byName) }))
    .sort((a, b) => b.shops.length - a.shops.length || a.label.localeCompare(b.label, 'en'));
  return { groups, unknown: unknown.sort(byName) };
}

function CityList({ group }: { group: CityGroup }) {
  return (
    <div className="stockist-city" data-city={group.label.toLowerCase()}>
      <h3>
        {group.citySlug ? <Link href={`/cities/${group.citySlug}`}>{group.label}</Link> : group.label}{' '}
        <span className="count">{group.shops.length}</span>
      </h3>
      <ul>
        {group.shops.map((s) => (
          <li key={s.store_slug} data-shop={s.store_name.toLowerCase()}>
            <Link href={`/stores/${s.store_slug}`}>{s.store_name}</Link>
            {s.borough && <span className="borough">{s.borough}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SuggestShop({ title, prompt }: { title: TitleFull; prompt: string }) {
  return (
    <details className="stockist-suggest">
      <summary>{prompt}</summary>
      <form action="/api/suggest-stockist" method="post" className="want-form">
        <input type="hidden" name="title_id" value={title.id} />
        <label className="field">
          <span>Shop name</span>
          <input name="shop_name" required maxLength={200} placeholder="e.g. Do You Read Me?!" />
        </label>
        <label className="field">
          <span>City</span>
          <input name="city" required maxLength={120} placeholder="e.g. Berlin" />
        </label>
        <label className="field">
          <span>Email (optional)</span>
          <input name="email" type="email" maxLength={320} placeholder="So we can thank you" />
        </label>
        <div className="inline-actions">
          <button className="btn solid" type="submit" style={{ padding: '14px 24px', fontSize: 15 }}>
            Suggest this shop
          </button>
        </div>
      </form>
    </details>
  );
}

export function StockistsSection({
  title,
  stockists,
  publisherTitleCount,
}: {
  title: TitleFull;
  stockists: TitleStockist[];
  publisherTitleCount: number;
}) {
  const publisher = title.publisher;
  // A publisher-wide list shared by several Index titles tells us a shop
  // sells something from the publisher, not that it has this title. Say so,
  // so nobody makes a wasted trip.
  const shared =
    publisherTitleCount > 1 && stockists.some((s) => s.list_scope === 'publisher');
  const { groups, unknown } = groupByCity(stockists);
  const shopCount = stockists.length;
  const collected = monthYear(stockists[0]?.collected_at ?? publisher.stockist_checked_at);
  const head = groups.slice(0, EXPANDED_CITIES);
  const rest = groups.slice(EXPANDED_CITIES);

  return (
    <section id="stockists" className="stockists" aria-labelledby="stockists-heading">
      <div className="wrap">
        <span className="eyebrow dim">Where it&rsquo;s stocked</span>
        <h2 id="stockists-heading">Where to find {title.name}</h2>

        {title.available_on_neesh && (
          <p className="stockists-order">
            Run a space?{' '}
            <Link href={`/order/${title.slug}`} className="text-link">
              Order wholesale on Neesh
            </Link>
          </p>
        )}

        {shopCount > 0 ? (
          <>
            {shared ? (
              <>
                <p className="stockists-count">
                  {publisher.name} sells through {plural(shopCount, 'shop', 'shops')}
                  {groups.length > 0 && <> across {plural(groups.length, 'city', 'cities')}</>}.
                </p>
                <p className="stockists-caveat">
                  {publisher.name} publishes {publisherTitleCount} titles in the Index and keeps one
                  stockist list for all of them, so check a shop has {title.name} before you go.
                </p>
              </>
            ) : (
              <p className="stockists-count">
                Stocked in {plural(shopCount, 'shop', 'shops')}
                {groups.length > 0 && <> across {plural(groups.length, 'city', 'cities')}</>}.
              </p>
            )}

            {shopCount > FILTER_THRESHOLD && <StockistFilter />}

            <div className="stockist-cities">
              {head.map((g) => (
                <CityList key={g.key} group={g} />
              ))}
            </div>

            {(rest.length > 0 || unknown.length > 0) && (
              <details className="stockists-more">
                <summary>
                  Show all {plural(groups.length, 'city', 'cities')}
                  {unknown.length > 0 && <> and {plural(unknown.length, 'shop', 'shops')} without a city</>}
                </summary>
                <div className="stockist-cities">
                  {rest.map((g) => (
                    <CityList key={g.key} group={g} />
                  ))}
                  {unknown.length > 0 && (
                    <CityList group={{ key: 'unknown', label: 'City unknown', citySlug: null, shops: unknown }} />
                  )}
                </div>
              </details>
            )}
            <p className="stockists-empty" data-filter-empty hidden>
              No shops match that search.
            </p>

            <p className="stockists-source">
              From{' '}
              {publisher.stockist_page_url ? (
                <a href={publisher.stockist_page_url} className="text-link" target="_blank" rel="nofollow noopener">
                  {publisher.name}&rsquo;s stockist list
                </a>
              ) : (
                <>{publisher.name}&rsquo;s stockist list</>
              )}
              {collected && <>, collected {collected}</>}.
            </p>
            <SuggestShop title={title} prompt="Know another shop that carries it?" />
          </>
        ) : (
          <>
            <p className="stockists-count">
              {publisher.name} doesn&rsquo;t publish a stockist list yet.
            </p>
            <SuggestShop title={title} prompt="Know a shop that carries it?" />
          </>
        )}
      </div>
    </section>
  );
}
