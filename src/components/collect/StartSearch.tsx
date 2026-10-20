'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

// Shape returned by /api/title-search.
interface TitleSearchResult {
  name: string;
  slug: string;
  publisher: string;
  niche: string | null;
  cover: string | null;
}

export function useTitleSearch(q: string): { results: TitleSearchResult[]; searched: boolean } {
  const [results, setResults] = useState<TitleSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
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
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [q]);
  return { results, searched };
}

// "Find a magazine you own": search the Neesh Index, no sign-in needed.
// Results open title pages, where the Own and Want pills live. The header
// search on /collect focuses and fills this field.
export function StartSearch({
  autoFocus = false,
  onQuery,
}: {
  autoFocus?: boolean;
  onQuery?: (q: string) => void;
}) {
  const [q, setQ] = useState('');
  const { results, searched } = useTitleSearch(q);
  const input = useRef<HTMLInputElement>(null);

  function update(value: string) {
    setQ(value);
    onQuery?.(value);
  }

  useEffect(() => {
    if (autoFocus) input.current?.focus();
    const fromHeader = (event: Event) => {
      const value = (event as CustomEvent<string>).detail;
      if (typeof value === 'string') update(value);
      input.current?.focus();
    };
    window.addEventListener('neesh:collect-search', fromHeader);
    return () => window.removeEventListener('neesh:collect-search', fromHeader);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  const showResults = searched && q.trim().length >= 2;

  return (
    <div className="c-search" id="start">
      <label className="c-field big">
        <span>Find a magazine you own</span>
        <input
          ref={input}
          type="search"
          value={q}
          onChange={(event) => update(event.target.value)}
          placeholder="Search by title or publisher"
          autoComplete="off"
          enterKeyHint="search"
        />
      </label>
      {showResults && (
        <div className="c-results">
          <span className="c-mono muted">
            {results.length === 0
              ? 'No matches in the Index'
              : `${results.length} ${results.length === 1 ? 'magazine' : 'magazines'} in the Index`}
          </span>
          {results.map((r) => (
            <Link key={r.slug} href={`/titles/${r.slug}#issues`} className="c-result">
              {r.cover ? (
                <img src={r.cover} alt={`${r.name} cover`} className="c-result-cover" />
              ) : (
                <span className="c-result-cover c-cover-empty" />
              )}
              <span className="c-row-text">
                <span className="c-result-name">{r.name}</span>
                <span className="c-meta">{[r.publisher, r.niche].filter(Boolean).join(' · ')}</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          ))}
          <div className="c-rule" />
          {results.length === 0 && (
            <p className="c-muted c-results-none">
              Not in the Index yet.{' '}
              <Link href={`/collect/add?name=${encodeURIComponent(q.trim())}`} className="c-link">
                Add it
              </Link>{' '}
              and it&rsquo;s on your shelf in under a minute.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
