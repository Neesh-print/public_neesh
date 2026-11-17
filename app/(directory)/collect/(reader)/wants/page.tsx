'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CollectTabs } from '@/components/collect/CollectTabs';
import { useCollect } from '@/components/collect/CollectProvider';
import { Cover, issueCover, LoadError, LoadingRows, PageHead, ShopRow } from '@/components/collect/parts';
import { useTitlesWithIssues } from '@/components/collect/useIndexData';
import { FOUND_IT_AFTER_DAYS, issueMeta, TOAST, type IssueAvailability, type ShopAvailability } from '@/lib/collect/shared';
import { plural } from '@/lib/format';

// The want list. One job: get you to a shop. Each issue shows its nearest
// shops with what we know about them, home city first. A shop click logs
// stockist_click; a few days later the issue asks "Did you find it?".

const CLICKS_KEY = 'neesh_collect_clicks';
const SHOPS_SHOWN = 2;

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

export default function WantsPage() {
  const { ready, session, items, itemTitles, homeCity, setIssueState, logEvent, notice } = useCollect();
  const wantIds = useMemo(() => Object.keys(items).filter((id) => items[id] === 'want'), [items]);
  const { loading, error, titles, retry } = useTitlesWithIssues(wantIds.map((id) => itemTitles[id]).filter(Boolean));
  const [availability, setAvailability] = useState<Record<string, ShopAvailability[]>>({});
  const [clicks, setClicks] = useState<Record<string, string>>({});

  useEffect(() => setClicks(readClicks()), []);

  const idsKey = [...wantIds].sort().join(',');
  useEffect(() => {
    if (!idsKey) return;
    const params = new URLSearchParams({ issue_ids: idsKey });
    if (homeCity) params.set('city', homeCity.slug);
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

  async function gotIt(issueId: string, titleId: string, confirmed: boolean) {
    if (confirmed) logEvent('acquired_confirmed', { issue_id: issueId, title_id: titleId, surface: 'wants' });
    const ok = await setIssueState(issueId, titleId, 'own', 'wants');
    notice(ok ? TOAST.ownAdded : TOAST.failed);
    const next = readClicks();
    delete next[issueId];
    writeClicks(next);
    setClicks(next);
  }

  function notYet(issueId: string) {
    const next = readClicks();
    delete next[issueId];
    writeClicks(next);
    setClicks(next);
  }

  const askAfter = Date.now() - FOUND_IT_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const rows = titles.flatMap((title) =>
    title.issues.filter((i) => items[i.id] === 'want').map((issue) => ({ title, issue }))
  );
  const busy = !ready || (loading && wantIds.length > 0);

  return (
    <section className="c-page">
      <div className="wrap c-narrow-wide">
        <CollectTabs />
        {error ? (
          <LoadError retry={retry} />
        ) : busy ? (
          <LoadingRows />
        ) : (
          <div className="c-stack lg">
            <PageHead title="Wants" count={`${plural(rows.length, 'issue', 'issues')} on your list`} />
            {rows.length === 0 ? (
              <div className="c-stack">
                <h2 className="c-h2 sm">Nothing on your list yet.</h2>
                <p className="c-muted">
                  Mark an issue Want on any title page and it shows up here with the shops that carry it.{' '}
                  <Link href="/index" className="c-link">
                    Explore magazines
                  </Link>
                </p>
              </div>
            ) : (
              <>
                <div>
                  {rows.map(({ title, issue }) => {
                    const shops = availability[issue.id];
                    const click = clicks[issue.id];
                    const ask = !!session && !!click && Date.parse(click) < askAfter;
                    return (
                      <div key={issue.id} className="c-want">
                        <div className="c-want-top">
                          <Cover className="c-want-cover" src={issueCover(issue)} alt={`${title.name}, ${issue.issue_label}`} />
                          <div className="c-row-text">
                            <Link href={`/titles/${title.slug}#issues`} className="c-result-name">
                              {title.name} &middot; {issue.issue_label}
                            </Link>
                            {issueMeta(issue) && <span className="c-meta">{issueMeta(issue)}</span>}
                          </div>
                          <button
                            type="button"
                            className="c-pill"
                            aria-pressed={false}
                            aria-label={`Own ${title.name}, ${issue.issue_label}`}
                            onClick={() => gotIt(issue.id, title.id, false)}
                          >
                            Own
                          </button>
                        </div>
                        <div className="c-want-shops">
                          {ask && (
                            <div className="c-found">
                              <span>Did you find it?</span>
                              <button type="button" className="c-pill" onClick={() => gotIt(issue.id, title.id, true)}>
                                Yes
                              </button>
                              <button type="button" className="c-textbtn" onClick={() => notYet(issue.id)}>
                                Not yet
                              </button>
                            </div>
                          )}
                          {shops?.slice(0, SHOPS_SHOWN).map((shop) => (
                            <ShopRow
                              key={shop.store_slug}
                              shop={shop}
                              issueLabel={issue.issue_label}
                              compact
                              onClick={() => shopClick(issue.id, title.id, shop)}
                            />
                          ))}
                          <Link href={`/titles/${title.slug}#stockists`} className="c-mono accent c-find">
                            {shops && shops.length > SHOPS_SHOWN ? `All ${shops.length} shops` : 'Find shops'}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                  <div className="c-rule" />
                </div>
                <p className="c-fine">
                  {homeCity ? <>Shops nearest {homeCity.name} first. </> : <>Set a home city to see nearby shops first. </>}
                  <Link href="/collect/settings" className="c-link">
                    {homeCity ? 'Change home city' : 'Set home city'}
                  </Link>
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
