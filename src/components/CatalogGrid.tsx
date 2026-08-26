'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

// Slim, public-only shape. The server page maps DB rows down to this before
// it crosses into the client, so nothing private ever reaches the HTML.
export interface CatalogItem {
  id: string;
  name: string;
  slug: string;
  cover: string | null;
  publisher: string;
  niches: string[];
  onNeesh: boolean;
}

// The live /explore treatment: pill filter bar (All plus every niche in the
// data, active pill inverted) over a 2/3/4-column cover grid. Filtering is
// instant and client-side; the cards link to the directory profiles.
const NEESH_TITLES = 'Neesh Titles';

export function CatalogGrid({ items }: { items: CatalogItem[] }) {
  const [active, setActive] = useState('All');

  // "Neesh Titles" is a synthetic filter, pinned right after All: every
  // title a space can order on Neesh today.
  const filters = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) for (const niche of item.niches) names.add(niche);
    const pinned = items.some((item) => item.onNeesh) ? [NEESH_TITLES] : [];
    return ['All', ...pinned, ...[...names].sort()];
  }, [items]);

  const visible =
    active === 'All'
      ? items
      : active === NEESH_TITLES
        ? items.filter((item) => item.onNeesh)
        : items.filter((item) => item.niches.includes(active));

  return (
    <>
      <div className="filter-bar" role="group" aria-label="Filter by niche">
        {filters.map((filter) => (
          <button
            key={filter}
            className={`filter-pill${active === filter ? ' on' : ''}`}
            onClick={() => setActive(filter)}
            aria-pressed={active === filter}
          >
            {filter}
          </button>
        ))}
      </div>

      {visible.length > 0 ? (
        <ul className="title-grid">
          {visible.map((item, index) => (
            <li className="title-card" key={item.id}>
              <Link href={`/titles/${item.slug}`} className="title-card-link">
                <div className="title-card-cover">
                  {item.cover ? (
                    <img
                      className="cover"
                      src={item.cover}
                      alt={`${item.name} cover`}
                      loading={index < 4 ? 'eager' : 'lazy'}
                    />
                  ) : (
                    <div className="cover-fallback">
                      <div>
                        <div className="fallback-bar" />
                        <div className="fallback-name">{item.name}</div>
                      </div>
                      <div className="fallback-meta">
                        {item.publisher}
                        <br />
                        Cover coming soon
                      </div>
                    </div>
                  )}
                  {index < 3 && active === 'All' && (
                    <span className="featured-badge">★ Featured</span>
                  )}
                </div>
                <div className="title-card-body">
                  <h3>{item.name}</h3>
                  <p className="title-card-meta">{item.publisher}</p>
                  {item.niches[0] && (
                    <span className="title-card-chip">{item.niches[0]}</span>
                  )}
                  {item.onNeesh && (
                    <span className="title-card-chip on-neesh">Order now</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted catalog-empty">
          {items.length === 0
            ? 'Niche pages are on their way as the index fills out.'
            : 'Nothing under this niche yet.'}
        </p>
      )}
    </>
  );
}
