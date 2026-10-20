'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

// Shape returned by /api/title-search.
interface TitleSearchResult {
  name: string;
  slug: string;
  publisher: string;
  cover: string | null;
}

// "Start your collection": search the Index, no sign-in needed. Results link
// to title pages, where the issue toggles live.
export function StartSearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<TitleSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) input.current?.focus();
    const focus = () => input.current?.focus();
    window.addEventListener('neesh:collect-search', focus);
    return () => window.removeEventListener('neesh:collect-search', focus);
  }, [autoFocus]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/title-search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: { exact: TitleSearchResult | null; near: TitleSearchResult[] }) => {
          setResults([...(data.exact ? [data.exact] : []), ...data.near]);
          setSearched(true);
        })
        .catch(() => {});
    }, 200);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [q]);

  return (
    <div className="collect-search" id="start">
      <label className="field">
        <span>Find a magazine you own</span>
        <input
          ref={input}
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search by title or publisher"
          autoComplete="off"
        />
      </label>
      {results.length > 0 && (
        <ul className="collect-results">
          {results.map((r) => (
            <li key={r.slug}>
              <Link href={`/titles/${r.slug}#issues`}>
                {r.cover ? <img src={r.cover} alt="" /> : <span className="collect-results-blank" />}
                <span>
                  <strong>{r.name}</strong>
                  <em>{r.publisher}</em>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {searched && results.length === 0 && (
        <p className="collect-results-none">
          Not on Neesh yet.{' '}
          <Link href={`/collect/add?name=${encodeURIComponent(q.trim())}`} className="text-link">
            Add it
          </Link>
        </p>
      )}
    </div>
  );
}
