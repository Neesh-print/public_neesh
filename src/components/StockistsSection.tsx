import { monthYear, plural } from '@/lib/format';
import { isCityHidden } from '@/lib/queries';
import { countryName } from '@/lib/seo';
import type { TitleFull, TitleStockist } from '@/lib/types';
import type { ShopEvidence } from '@/lib/collect/server';
import { StockistGroups, type CityGroup, type ShopLine } from './collect/StockistGroups';
import { Honeypot } from './Honeypot';
import { TrackedLink } from './TrackedCta';

// "Find shops that carry this magazine" on a title page. Server rendered so
// the shop list is in the HTML crawlers see. Lists are kept per publisher,
// so a title shows its publisher's shops. Each row says exactly what we
// know: carries the magazine (stockist list), stocked an issue (reported),
// or in stock (confirmed), with dates.

const RANK = { confirmed: 0, reported: 1, carries: 2 } as const;

function groupByCity(stockists: TitleStockist[], evidence: ShopEvidence[]): { groups: CityGroup[]; unknown: ShopLine[] } {
  const byCity = new Map<string, CityGroup>();
  const unknown: ShopLine[] = [];
  const bySlug = new Map(evidence.map((e) => [e.store_slug, e]));
  const lines: (ShopLine & { country: string; city_slug: string | null })[] = stockists.map((s) => {
    const e = bySlug.get(s.store_slug);
    bySlug.delete(s.store_slug);
    return {
      store_slug: s.store_slug,
      store_name: s.store_name,
      borough: s.borough,
      city: s.city,
      country: s.country,
      city_slug: s.city_slug,
      level: e?.level ?? 'carries',
      observed_on: e?.observed_on ?? null,
      issue_label: e?.issue_label ?? null,
      publisher_wide: !e && s.list_scope === 'publisher',
    };
  });
  // Shops known only from an issue record still show.
  for (const e of bySlug.values()) {
    lines.push({
      store_slug: e.store_slug,
      store_name: e.store_name,
      borough: e.borough,
      city: e.city,
      country: e.country,
      city_slug: null,
      level: e.level,
      observed_on: e.observed_on,
      issue_label: e.issue_label,
      publisher_wide: false,
    });
  }
  for (const s of lines) {
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
        shortLabel: s.city,
        citySlug: isCityHidden(s.city_slug) ? null : s.city_slug,
        rawCitySlug: s.city_slug,
        shops: [],
      };
      byCity.set(key, group);
    }
    if (!group.rawCitySlug && s.city_slug) group.rawCitySlug = s.city_slug;
    group.shops.push(s);
  }
  const order = (a: ShopLine, b: ShopLine) =>
    RANK[a.level] - RANK[b.level] ||
    Number(a.publisher_wide) - Number(b.publisher_wide) ||
    a.store_name.localeCompare(b.store_name, 'en', { sensitivity: 'base' });
  const groups = [...byCity.values()]
    .map((g) => ({ ...g, shops: g.shops.sort(order) }))
    .sort((a, b) => b.shops.length - a.shops.length || a.label.localeCompare(b.label, 'en'));
  return { groups, unknown: unknown.sort(order) };
}

function SuggestShop({ title, prompt }: { title: TitleFull; prompt: string }) {
  return (
    <details className="stockist-suggest">
      <summary>{prompt}</summary>
      <form action="/api/suggest-stockist" method="post" className="want-form">
        <Honeypot />
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
          <button className="btn ghost" type="submit" style={{ padding: '14px 24px', fontSize: 15 }}>
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
  evidence = [],
  publisherTitleCount,
}: {
  title: TitleFull;
  stockists: TitleStockist[];
  evidence?: ShopEvidence[];
  publisherTitleCount: number;
}) {
  const publisher = title.publisher;
  // A publisher-wide list shared by several Index titles tells us a shop
  // sells something from the publisher, so the count names the publisher.
  const shared = publisherTitleCount > 1 && stockists.some((s) => s.list_scope === 'publisher');
  const { groups, unknown } = groupByCity(stockists, evidence);
  const shopCount = groups.reduce((n, g) => n + g.shops.length, 0) + unknown.length;
  const collected = monthYear(stockists[0]?.collected_at ?? publisher.stockist_checked_at);
  const cities = plural(groups.length, 'city', 'cities');

  return (
    <section id="stockists" className="stockists" aria-labelledby="stockists-heading">
      <div className="wrap">
        <span className="eyebrow dim">Where it&rsquo;s stocked</span>
        <h2 id="stockists-heading">
          <span className="c-only-m">Find shops that carry this magazine</span>
          <span className="c-only-d">Find shops that carry {title.name}</span>
        </h2>

        {shopCount > 0 ? (
          <>
            <p className="stockists-count">
              {shared ? (
                <>
                  {publisher.name} sells through {plural(shopCount, 'shop', 'shops')}
                  {groups.length > 0 && <> across {cities}</>}.
                </>
              ) : (
                <>
                  Stocked in {plural(shopCount, 'shop', 'shops')}
                  {groups.length > 0 && <> across {cities}</>}.
                </>
              )}{' '}
              Each row says exactly what we know.
            </p>

            <StockistGroups titleId={title.id} groups={groups} unknown={unknown} filter={shopCount > 50} />

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
            <SuggestShop title={title} prompt="Know another shop that carries it? Suggest it" />
          </>
        ) : (
          <>
            <p className="stockists-count">{publisher.name} doesn&rsquo;t publish a stockist list yet.</p>
            <SuggestShop title={title} prompt="Know a shop that carries it? Suggest it" />
          </>
        )}

        {title.available_on_neesh && (
          <p className="stockists-order">
            Run a space?{' '}
            <TrackedLink href={`/order/${title.slug}`} className="text-link" cta="stock_it" titleSlug={title.slug}>
              Order wholesale on Neesh
            </TrackedLink>
          </p>
        )}
      </div>
    </section>
  );
}
