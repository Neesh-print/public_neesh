'use client';

import Link from 'next/link';
import { evidenceLabel } from '@/lib/collect/shared';
import { plural } from '@/lib/format';
import { StockistFilter } from '../StockistFilter';
import { useCollectOptional } from './CollectProvider';

// City groups of shop rows with evidence lines. The reader's home city
// comes first, labelled HOME; within a group the strongest evidence leads.
// A shop click logs stockist_click.

export interface ShopLine {
  store_slug: string;
  store_name: string;
  borough: string | null;
  city: string | null;
  level: 'confirmed' | 'reported' | 'carries';
  observed_on: string | null;
  issue_label: string | null;
  publisher_wide: boolean;
}

export interface CityGroup {
  key: string;
  label: string;
  shortLabel: string;
  citySlug: string | null;
  rawCitySlug: string | null;
  shops: ShopLine[];
}

const EXPANDED_CITIES = 6;

function CityList({ group, home, onShop }: { group: CityGroup; home: boolean; onShop: () => void }) {
  return (
    <div className="stockist-city" data-city={group.label.toLowerCase()}>
      <h3>
        <span>
          {group.citySlug ? <Link href={`/cities/${group.citySlug}`}>{group.shortLabel}</Link> : group.shortLabel}
          {home && <> &middot; Home</>}
        </span>
        <span className="count">{plural(group.shops.length, 'shop', 'shops')}</span>
      </h3>
      <ul>
        {group.shops.map((s) => {
          const evidence = evidenceLabel(
            { level: s.level, observed_on: s.observed_on, last_reported_on: null, publisher_wide: s.publisher_wide },
            s.issue_label
          );
          return (
            <li key={s.store_slug} data-shop={s.store_name.toLowerCase()}>
              <span className="c-shop-name">
                <Link href={`/stores/${s.store_slug}`} onClick={onShop}>
                  {s.store_name}
                </Link>
                {s.borough && <span className="borough">{s.borough}</span>}
              </span>
              <span className={`c-evidence${evidence.strong ? ' strong' : ''}`}>{evidence.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StockistGroups({
  titleId,
  groups,
  unknown,
  filter,
}: {
  titleId: string;
  groups: CityGroup[];
  unknown: ShopLine[];
  filter: boolean;
}) {
  const collect = useCollectOptional();
  const homeSlug = collect?.homeCity?.slug ?? null;
  const sorted = homeSlug
    ? [...groups].sort((a, b) => Number(b.rawCitySlug === homeSlug) - Number(a.rawCitySlug === homeSlug))
    : groups;
  const head = sorted.slice(0, EXPANDED_CITIES);
  const rest = sorted.slice(EXPANDED_CITIES);
  const onShop = () => collect?.logEvent('stockist_click', { title_id: titleId, surface: 'title_page' });

  return (
    <>
      {filter && <StockistFilter />}
      <div className="stockist-cities">
        {head.map((g) => (
          <CityList key={g.key} group={g} home={g.rawCitySlug === homeSlug && !!homeSlug} onShop={onShop} />
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
              <CityList key={g.key} group={g} home={false} onShop={onShop} />
            ))}
            {unknown.length > 0 && (
              <CityList
                group={{ key: 'unknown', label: 'City unknown', shortLabel: 'City unknown', citySlug: null, rawCitySlug: null, shops: unknown }}
                home={false}
                onShop={onShop}
              />
            )}
          </div>
        </details>
      )}
      <p className="stockists-empty" data-filter-empty hidden>
        No shops match that search.
      </p>
    </>
  );
}
