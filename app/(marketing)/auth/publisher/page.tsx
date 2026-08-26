'use client';

import { useState } from 'react';
import { appUrl } from '@/lib/seo';
import { ArrowIcon } from '@/components/Logo';

interface TitleSearchResult {
  name: string;
  slug: string;
  frequency: string | null;
  country: string | null;
  publisher: string;
  claimed: boolean;
  niche: string | null;
  cover: string | null;
}

type Phase = 'search' | 'found' | 'near' | 'none';

// The publisher path, v2: search the index first. An exact match asks "Is
// this you?", near matches prevent duplicate records, and the empty result
// celebrates the gap before converting. Claim CTAs carry the slug so the
// application prefills.
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
      const data: { exact: TitleSearchResult | null; near: TitleSearchResult[] } = await res.json();
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

  function claimUrl(result: TitleSearchResult) {
    return appUrl(
      `/apply/publisher?title=${encodeURIComponent(result.name)}&claim=${encodeURIComponent(result.slug)}`
    );
  }

  function MatchCard({ result }: { result: TitleSearchResult }) {
    return (
      <div className="match-card">
        {result.cover ? (
          <div
            className="match-cover"
            role="img"
            aria-label={result.name}
            style={{ backgroundImage: `url(${result.cover})` }}
          />
        ) : (
          <div className="match-cover" />
        )}
        <div className="match-body">
          <span className="match-name">{result.name}</span>
          <span className="match-meta">
            {result.publisher}
            {result.niche ? ` · ${result.niche}` : ''}
          </span>
          {result.claimed ? (
            <span className="claimed-line">
              Already claimed. If this is your title,{' '}
              <a href="mailto:hi@neesh.art" className="text-link">
                email us
              </a>{' '}
              and we will sort it out.
            </span>
          ) : (
            <a href={claimUrl(result)} className="btn accent" style={{ padding: '14px 24px', fontSize: 15 }}>
              Yes, claim it
              <ArrowIcon size={16} />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <section>
      <div className="utility-page roomy">
        {phase === 'search' && (
          <>
            <span className="eyebrow">For publishers</span>
            <h1>Find your magazine</h1>
            <p className="sub">It may already be in the index. Claiming beats starting over.</p>
            <form className="search-row" onSubmit={search}>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Your magazine or publisher name"
                aria-label="Your magazine or publisher name"
              />
              <button type="submit" className="btn solid" disabled={busy}>
                Search
              </button>
            </form>
          </>
        )}

        {phase === 'found' && exact && (
          <>
            <h1>Is this you?</h1>
            <MatchCard result={exact} />
            {near.slice(0, 2).map((result) => (
              <MatchCard key={result.slug} result={result} />
            ))}
            <button type="button" onClick={reset} className="text-link" style={{ background: 'none', border: 'none', padding: 0, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
              No, search again
            </button>
          </>
        )}

        {phase === 'near' && (
          <>
            <h1>Is one of these yours?</h1>
            <p className="sub">Claim the one you publish and we will prefill the rest.</p>
            {near.map((result) => (
              <MatchCard key={result.slug} result={result} />
            ))}
            <div className="inline-actions">
              <a href={addUrl} className="btn solid">
                None of these are mine
                <ArrowIcon />
              </a>
              <button type="button" onClick={reset} className="text-link" style={{ background: 'none', border: 'none', padding: 0, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                Search again
              </button>
            </div>
          </>
        )}

        {phase === 'none' && (
          <>
            <span className="eyebrow">A gap in the index</span>
            <h1>We do not have it yet. Good.</h1>
            <p className="sub">
              Nobody else is carrying it either. Add it and you are the first shelf it lands on.
            </p>
            <div className="inline-actions" style={{ marginTop: 8 }}>
              <a href={addUrl} className="btn accent" style={{ padding: '14px 24px', fontSize: 15 }}>
                Add it to the index
                <ArrowIcon size={16} />
              </a>
              <button type="button" onClick={reset} className="text-link" style={{ background: 'none', border: 'none', padding: 0, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                Search again
              </button>
            </div>
            <p className="small">We review every claim by hand.</p>
          </>
        )}
      </div>
    </section>
  );
}
