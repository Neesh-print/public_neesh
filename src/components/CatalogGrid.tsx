'use client';

import { useEffect, useMemo, useState } from 'react';
import { TitleGridCard } from './TitleGridCard';

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
  // The three most recently Neesh-listed titles carry the Featured badge.
  featured: boolean;
}

// v2 index: centered niche pills (All + Neesh Titles pinned), a count row
// with Clear filters, and the card grid. The directory header's search box
// filters this grid live via the neesh:index-q event; ?q= deep links work
// on load.
const NEESH_TITLES = 'Neesh Titles';

export function CatalogGrid({ items }: { items: CatalogItem[] }) {
  const [active, setActive] = useState('All');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('q');
    if (initial) setQuery(initial);
    function onSearch(event: Event) {
      setQuery((event as CustomEvent<string>).detail ?? '');
    }
    window.addEventListener('neesh:index-q', onSearch);
    return () => window.removeEventListener('neesh:index-q', onSearch);
  }, []);

  const filters = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) for (const niche of item.niches) names.add(niche);
    const pinned = items.some((item) => item.onNeesh) ? [NEESH_TITLES] : [];
    return ['All', ...pinned, ...[...names].sort()];
  }, [items]);

  const needle = query.trim().toLowerCase();
  const visible = items.filter((item) => {
    if (active === NEESH_TITLES && !item.onNeesh) return false;
    if (active !== 'All' && active !== NEESH_TITLES && !item.niches.includes(active)) return false;
    if (
      needle &&
      !`${item.name} ${item.publisher} ${item.niches.join(' ')}`.toLowerCase().includes(needle)
    )
      return false;
    return true;
  });

  const count = `${visible.length} ${visible.length === 1 ? 'title' : 'titles'}`;
  const filtered = active !== 'All' || needle.length > 0;

  return (
    <>
      <div className="pill-bar" role="group" aria-label="Filter by niche">
        {filters.map((filter) => (
          <button
            key={filter}
            className={`pill${active === filter ? ' on' : ''}`}
            onClick={() => setActive(filter)}
            aria-pressed={active === filter}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="count-row">
        <span className="count">{count}</span>
        {filtered && (
          <button
            type="button"
            className="linkish"
            onClick={() => {
              setActive('All');
              setQuery('');
              window.dispatchEvent(new CustomEvent('neesh:index-q', { detail: '' }));
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {visible.length > 0 ? (
        <div className="card-grid">
          {visible.map((item, index) => (
            <TitleGridCard
              key={item.id}
              eager={index < 4}
              item={{
                id: item.id,
                name: item.name,
                slug: item.slug,
                cover: item.cover,
                publisher: item.publisher,
                niche: item.niches[0] ?? null,
                onNeesh: item.onNeesh,
                featured: item.featured,
              }}
            />
          ))}
        </div>
      ) : (
        <p className="index-empty">
          Nothing matches that yet. Try another category, or{' '}
          <a href="mailto:hi@neesh.art" className="text-link">
            tell us what we&rsquo;re missing
          </a>
          .
        </p>
      )}
    </>
  );
}
