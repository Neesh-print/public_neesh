'use client';

import { useState } from 'react';
import { appUrl, countryName, FREQUENCY_LABELS } from '@/lib/seo';

interface TitleSearchResult {
  name: string;
  slug: string;
  frequency: string | null;
  country: string | null;
  publisher: string;
  claimed: boolean;
  niche: string | null;
}

type Phase = 'search' | 'found' | 'near' | 'none';

// The publisher path (handoff section 7): search the index first. Exact
// match goes to the claim flow, near matches prevent duplicate records, and
// the no-results screen names the exact query and converts.
export default function AuthPublisherPage() {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const [phase, setPhase] = useState<Phase>('search');
  const [exact, setExact] = useState<TitleSearchResult | null>(null);
  const [near, setNear] = useState<TitleSearchResult[]>([]);
  const [busy, setBusy] = useState(false);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/title-search?q=${encodeURIComponent(q)}`);
      const data: { exact: TitleSearchResult | null; near: TitleSearchResult[] } =
        await res.json();
      setSearched(q);
      setExact(data.exact);
      setNear(data.near);
      setPhase(data.exact ? 'found' : data.near.length > 0 ? 'near' : 'none');
    } catch {
      setSearched(q);
      setExact(null);
      setNear([]);
      setPhase('none');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPhase('search');
    setQuery('');
  }

  const addUrl = appUrl(`/apply/publisher?title=${encodeURIComponent(searched)}`);

  function MatchCard({ result }: { result: TitleSearchResult }) {
    const meta = [
      result.niche,
      countryName(result.country),
      result.frequency ? FREQUENCY_LABELS[result.frequency] : null,
    ]
      .filter(Boolean)
      .join(' · ');
    return (
      <div className="match-card">
        <p className="match-name">
          <strong>{result.name}</strong> by {result.publisher}
        </p>
        {meta && <p className="muted">{meta}</p>}
        {result.claimed ? (
          <div className="already-claimed">
            <h3>{result.name} is already claimed</h3>
            <p>
              Someone has verified this page. If that&apos;s a mistake, or if the magazine
              has changed hands, reply to hi@neesh.art and we&apos;ll sort it out.
            </p>
            <a className="button ghost" href="mailto:hi@neesh.art">
              Email us
            </a>
          </div>
        ) : (
          <a
            className="button"
            href={appUrl(
              `/apply/publisher?title=${encodeURIComponent(result.name)}&claim=${result.slug}`
            )}
          >
            Yes, claim it
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="auth-page container">
      {phase === 'search' && (
        <>
          <h1>Find your magazine</h1>
          <p className="lede">
            Your title is probably already in our index. Search for it and claim the page.
          </p>
          <form onSubmit={search} className="auth-search">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title or publisher"
              aria-label="Search by title or publisher"
              required
            />
            <button className="button" type="submit" disabled={busy}>
              {busy ? 'Searching' : 'Search'}
            </button>
          </form>
        </>
      )}

      {phase === 'found' && exact && (
        <>
          <h1>Is this you?</h1>
          <MatchCard result={exact} />
          <p>
            <button className="linklike" onClick={reset}>
              That&apos;s not it, search again
            </button>
          </p>
        </>
      )}

      {phase === 'near' && (
        <>
          <h2>Close, but not exact</h2>
          <p className="lede">
            We found a few titles that look similar. If one of these is yours, claim it
            instead of adding a duplicate.
          </p>
          {near.map((result) => (
            <MatchCard key={result.slug} result={result} />
          ))}
          <p>
            <button className="linklike" onClick={() => setPhase('none')}>
              None of these are mine
            </button>
          </p>
        </>
      )}

      {phase === 'none' && (
        <>
          <h1>We don&apos;t have {searched} yet.</h1>
          <p className="lede">
            That&apos;s on us. Add it and it&apos;ll be live today, free, with a page you
            control.
          </p>
          <p>
            <a className="button" href={addUrl}>
              Add {searched} to the index
            </a>
          </p>
          <p className="muted">
            <em>Searched for something else?</em>{' '}
            <button className="linklike" onClick={reset}>
              Try another title
            </button>
          </p>
        </>
      )}
    </div>
  );
}
