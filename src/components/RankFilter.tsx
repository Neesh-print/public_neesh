'use client';

import { useState } from 'react';

// Name and city search for the spaces ranking. It filters the
// server-rendered table rows in place, so the full list stays in the HTML
// and the page works without JS.
export function RankFilter({ tableId }: { tableId: string }) {
  const [query, setQuery] = useState('');

  function apply(value: string) {
    setQuery(value);
    const table = document.getElementById(tableId);
    if (!table) return;
    const q = value.trim().toLowerCase();
    let anyVisible = false;
    table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach((row) => {
      const show = !q || (row.dataset.search ?? '').includes(q);
      row.hidden = !show;
      if (show) anyVisible = true;
    });
    const empty = document.querySelector<HTMLElement>(`[data-filter-empty="${tableId}"]`);
    if (empty) empty.hidden = anyVisible;
  }

  return (
    <label className="field stockist-filter">
      <span>Find a space or city</span>
      <input
        type="search"
        value={query}
        onChange={(e) => apply(e.target.value)}
        placeholder="e.g. Berlin"
        autoComplete="off"
      />
    </label>
  );
}
