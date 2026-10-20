'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CollectTabs } from '@/components/collect/CollectTabs';
import { useCollect } from '@/components/collect/CollectProvider';
import { useTitlesWithIssues, type TitleWithIssues } from '@/components/collect/useIndexData';
import { browserClient } from '@/lib/collect/browser';
import {
  FOUND_IT_AFTER_DAYS,
  type Issue,
  type IssueAvailability,
  type ShopAvailability,
} from '@/lib/collect/shared';

// The want list. Each issue shows the shops that may have it, labelled only
// as far as the evidence goes (spec: Availability), home city first. A shop
// click logs stockist_click; a few days later the issue asks "Did you find
// it?".

const CLICKS_KEY = 'neesh_collect_clicks';
const SHOPS_SHOWN = 5;

function readClicks(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(CLICKS_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function writeClicks(clicks: Record<string, string>) {
  try {
    window.localStorage.setItem(CLICKS_KEY, JSON.stringify(clicks));
  } catch {
    // best-effort
  }
}

function shortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function shopLabel(shop: ShopAvailability, issue: Issue, title: TitleWithIssues): string {
  switch (shop.level) {
    case 'confirmed':
      return `In stock as of ${shortDate(shop.observed_on!)}`;
    case 'reported':
      return `Stocked ${issue.issue_label} as of ${shortDate(shop.observed_on!)}`;
    case 'lapsed':
      return `Reported stocking ${issue.issue_label} on ${shortDate(shop.last_reported_on!)}, not rechecked since`;
    default:
      return shop.publisher_wide && title.publisher
        ? `Sells magazines from ${title.publisher.name}`
        : `Carries ${title.name}`;
  }
}

export default function WantsPage() {
  const { ready, session, items, itemTitles, setIssueState, logEvent, notice } = useCollect();
  const wantIds = useMemo(
    () =>
      Object.entries(items)
        .filter(([, state]) => state === 'want')
        .map(([id]) => id),
    [items]
  );
  const { loading, titles } = useTitlesWithIssues(wantIds.map((id) => itemTitles[id]).filter(Boolean));
  const [availability, setAvailability] = useState<Record<string, ShopAvailability[]>>({});
  const [homeCity, setHomeCity] = useState<string | null>(null);
  const [clicks, setClicks] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => setClicks(readClicks()), []);

  useEffect(() => {
    const supabase = browserClient();
    if (!session || !supabase) return;
    supabase
      .from('collectors')
      .select('city:directory_cities(slug)')
      .maybeSingle()
      .then(({ data }) => setHomeCity((data?.city as unknown as { slug: string } | null)?.slug ?? null));
  }, [session]);

  const idsKey = [...wantIds].sort().join(',');
  useEffect(() => {
    if (!idsKey) return;
    const params = new URLSearchParams({ issue_ids: idsKey });
    if (homeCity) params.set('city', homeCity);
    fetch(`/api/collect/availability?${params}`)
      .then((res) => res.json())
      .then((data: { issues: IssueAvailability[] }) => {
        const next: Record<string, ShopAvailability[]> = {};
        for (const a of data.issues) next[a.issue_id] = a.shops;
        setAvailability(next);
      })
      .catch(() => {});
  }, [idsKey, homeCity]);

  function shopClick(issueId: string, titleId: string, shop: ShopAvailability) {
    logEvent('stockist_click', { issue_id: issueId, title_id: titleId, store_id: shop.store_id, surface: 'wants' });
    const next = { ...readClicks(), [issueId]: new Date().toISOString() };
    writeClicks(next);
    setClicks(next);
  }

  function answerFound(issueId: string, titleId: string, found: boolean) {
    if (found) logEvent('acquired_confirmed', { issue_id: issueId, title_id: titleId, surface: 'wants' });
    const next = readClicks();
    if (found) next[issueId] = 'found';
    else delete next[issueId];
    writeClicks(next);
    setClicks(next);
  }

  const askAfter = Date.now() - FOUND_IT_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const rows = titles.flatMap((title) =>
    title.issues.filter((i) => items[i.id] === 'want').map((issue) => ({ title, issue }))
  );

  return (
    <section className="collect-page">
      <div className="wrap">
        <CollectTabs />
        <h1>Wants</h1>
        {ready && !loading && rows.length === 0 && (
          <div className="collect-empty">
            <h2>Nothing on your list yet.</h2>
            <p>
              Mark an issue Want on any title page and it shows up here with the shops that carry it.{' '}
              <Link href="/index" className="text-link">
                Explore magazines
              </Link>
            </p>
          </div>
        )}

        <ul className="wants-list">
          {rows.map(({ title, issue }) => {
            const shops = availability[issue.id];
            const click = clicks[issue.id];
            const ask = !!session && click && click !== 'found' && Date.parse(click) < askAfter;
            const shown = expanded[issue.id] ? shops : shops?.slice(0, SHOPS_SHOWN);
            return (
              <li key={issue.id} className="want-item">
                <header>
                  <div>
                    <Link href={`/titles/${title.slug}#issues`} className="want-title">
                      {title.name}
                    </Link>
                    <span className="want-issue">{issue.issue_label}</span>
                  </div>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setIssueState(issue.id, title.id, null, 'wants')}
                  >
                    Remove
                  </button>
                </header>

                {ask && (
                  <div className="found-it">
                    <span>Did you find it?</span>
                    <button type="button" className="toggle" onClick={() => answerFound(issue.id, title.id, true)}>
                      Yes
                    </button>
                    <button type="button" className="toggle" onClick={() => answerFound(issue.id, title.id, false)}>
                      Not yet
                    </button>
                  </div>
                )}
                {click === 'found' && (
                  <div className="found-it">
                    <span>Got it. Move it to Own?</span>
                    <button
                      type="button"
                      className="toggle on"
                      onClick={async () => {
                        if (await setIssueState(issue.id, title.id, 'own', 'wants')) notice('Saved to your collection');
                      }}
                    >
                      Move to Own
                    </button>
                  </div>
                )}

                <p className="want-shops-head">Find shops that carry this magazine</p>
                {!shops ? (
                  <p className="want-shops-none">Looking for shops</p>
                ) : shops.length === 0 ? (
                  <p className="want-shops-none">
                    We don&rsquo;t know a shop for this one yet.{' '}
                    <Link href={`/titles/${title.slug}#stockists`} className="text-link">
                      Know one?
                    </Link>
                  </p>
                ) : (
                  <>
                    <ul className="want-shops">
                      {shown!.map((shop) => (
                        <li key={shop.store_slug} className={`level-${shop.level}`}>
                          <Link href={`/stores/${shop.store_slug}`} onClick={() => shopClick(issue.id, title.id, shop)}>
                            {shop.store_name}
                          </Link>
                          <span className="want-shop-place">
                            {[shop.borough, shop.city].filter(Boolean).join(', ')}
                          </span>
                          <span className="want-shop-level">
                            {shopLabel(shop, issue, title)}
                            {shop.level === 'carries' && shop.last_reported_on && (
                              <> &middot; reported stocking {issue.issue_label} on {shortDate(shop.last_reported_on)}</>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {shops.length > SHOPS_SHOWN && !expanded[issue.id] && (
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => setExpanded((cur) => ({ ...cur, [issue.id]: true }))}
                      >
                        Show all {shops.length} shops
                      </button>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
