'use client';

import Link from 'next/link';
import { CollectTabs } from '@/components/collect/CollectTabs';
import { useCollect } from '@/components/collect/CollectProvider';
import { LoadError, LoadingRows, PageHead, ShelfGrid } from '@/components/collect/parts';
import { useTitlesWithIssues } from '@/components/collect/useIndexData';
import { plural } from '@/lib/format';

// The shelf: owned covers grouped by magazine, newest issue first. Tapping
// a magazine opens its view, with the issues still missing.
export default function ShelfPage() {
  const { ready, items, itemTitles } = useCollect();
  const ownedIds = Object.keys(items).filter((id) => items[id] === 'own');
  const { loading, error, titles, retry } = useTitlesWithIssues(ownedIds.map((id) => itemTitles[id]).filter(Boolean));

  const groups = titles
    .map((t) => ({ title: t, owned: t.issues.filter((i) => items[i.id] === 'own') }))
    .filter((g) => g.owned.length > 0)
    .sort((a, b) => b.owned.length - a.owned.length || a.title.name.localeCompare(b.title.name, 'en', { sensitivity: 'base' }));
  const issueCount = groups.reduce((n, g) => n + g.owned.length, 0);
  const busy = !ready || (loading && ownedIds.length > 0);

  return (
    <section className="c-page">
      <div className="wrap">
        <CollectTabs />
        {error ? (
          <LoadError retry={retry} />
        ) : busy ? (
          <LoadingRows />
        ) : (
          <div className="c-shelf">
            <aside className="c-shelf-side">
              <PageHead
                title="Shelf"
                count={
                  groups.length
                    ? `${plural(issueCount, 'issue', 'issues')} · ${plural(groups.length, 'magazine', 'magazines')}`
                    : undefined
                }
              />
              {groups.length > 0 && (
                <>
                  <p className="c-muted c-only-d">Grouped by magazine, newest issue first. Tap a magazine to see what&rsquo;s missing.</p>
                  <ul className="c-shelf-index c-only-d">
                    {groups.map(({ title, owned }) => (
                      <li key={title.id}>
                        <Link href={`/collect/shelf/${title.slug}`}>{title.name}</Link>
                        <span className="c-mono muted">
                          {owned.length} of {title.issues.length}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="c-fine c-only-d">
                    Missing something?{' '}
                    <Link href="/collect#start" className="c-link">
                      Find a magazine you own
                    </Link>
                  </p>
                </>
              )}
            </aside>

            <div className="c-shelf-main">
              {groups.length === 0 ? (
                <div className="c-stack">
                  <h2 className="c-h2 sm">Your shelf is empty. For now.</h2>
                  <p className="c-muted">Search for a magazine you own and start marking issues.</p>
                  <Link href="/collect#start" className="c-btn solid">
                    Find a magazine you own
                  </Link>
                </div>
              ) : (
                <>
                  {groups.map(({ title, owned }) => {
                    const href = `/collect/shelf/${title.slug}`;
                    return (
                      <div key={title.id} className="c-group">
                        <Link href={href} className="c-group-head">
                          <span className="c-group-name">{title.name}</span>
                          <span className="c-mono accent">
                            {owned.length} of {title.issues.length}
                            <span className="c-only-d"> issues</span>
                          </span>
                        </Link>
                        <ShelfGrid issues={owned} titleName={title.name} href={href} />
                      </div>
                    );
                  })}
                  <p className="c-fine c-only-m">
                    Missing something?{' '}
                    <Link href="/collect#start" className="c-link">
                      Find a magazine you own
                    </Link>{' '}
                    or{' '}
                    <Link href="/collect/add" className="c-link">
                      add one to the Index
                    </Link>
                    .
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
