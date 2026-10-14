'use client';

import { useState } from 'react';

// City and shop search for long stockist lists. It filters the
// server-rendered list in place, so the full list stays in the HTML and the
// page works without JS; typing opens "Show all cities" so matches in
// collapsed cities show up too.
export function StockistFilter() {
  const [query, setQuery] = useState('');

  function apply(value: string) {
    setQuery(value);
    const root = document.getElementById('stockists');
    if (!root) return;
    const q = value.trim().toLowerCase();
    const more = root.querySelector<HTMLDetailsElement>('details.stockists-more');
    if (more && q) more.open = true;

    let anyVisible = false;
    root.querySelectorAll<HTMLElement>('.stockist-city').forEach((city) => {
      const cityMatch = !q || (city.dataset.city ?? '').includes(q);
      let shown = 0;
      city.querySelectorAll<HTMLElement>('li').forEach((li) => {
        const show = cityMatch || (li.dataset.shop ?? '').includes(q);
        li.hidden = !show;
        if (show) shown += 1;
      });
      city.hidden = shown === 0;
      if (shown > 0) anyVisible = true;
    });
    const empty = root.querySelector<HTMLElement>('[data-filter-empty]');
    if (empty) empty.hidden = anyVisible;
  }

  return (
    <label className="field stockist-filter">
      <span>Find a city or shop</span>
      <input
        type="search"
        value={query}
        onChange={(e) => apply(e.target.value)}
        placeholder="e.g. London"
        autoComplete="off"
      />
    </label>
  );
}
