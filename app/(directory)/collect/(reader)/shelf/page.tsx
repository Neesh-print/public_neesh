'use client';

import Link from 'next/link';
import { CollectTabs } from '@/components/collect/CollectTabs';
import { useCollect } from '@/components/collect/CollectProvider';
import { useTitlesWithIssues } from '@/components/collect/useIndexData';
import { StartSearch } from '@/components/collect/StartSearch';

// Owned issues by title. Under each, the title's other issues group as "Not
// in your collection", or "Missing" once the reader turns on Complete this
// title.
export default function ShelfPage() {
  const { ready, items, itemTitles, titles: flags, setTitleFlags, setIssueState, notice } = useCollect();
  const ownedIssueIds = Object.entries(items)
    .filter(([, state]) => state === 'own')
    .map(([id]) => id);
  const titleIds = ownedIssueIds.map((id) => itemTitles[id]).filter(Boolean);
  const { loading, titles } = useTitlesWithIssues(titleIds);

  const empty = ready && !loading && titles.length === 0;

  return (
    <section className="collect-page">
      <div className="wrap">
        <CollectTabs />
        <h1>Shelf</h1>

        {empty && (
          <div className="collect-empty">
            <h2>Your shelf is empty. For now.</h2>
            <p>Search for a magazine you own and start marking issues.</p>
            <StartSearch />
          </div>
        )}

        {titles.map((title) => {
          const owned = title.issues.filter((i) => items[i.id] === 'own');
          if (owned.length === 0) return null;
          const rest = title.issues.filter((i) => items[i.id] !== 'own');
          const completing = flags[title.id]?.completing ?? false;
          return (
            <article key={title.id} className="shelf-title">
              <header>
                <h2>
                  <Link href={`/titles/${title.slug}`}>{title.name}</Link>
                </h2>
                <span className="shelf-count">
                  {owned.length} of {title.issues.length}
                </span>
              </header>
              <ul className="shelf-issues">
                {owned.map((i) => (
                  <li key={i.id} className="own">
                    {i.issue_label}
                  </li>
                ))}
              </ul>
              {rest.length > 0 && (
                <>
                  <h3 className="shelf-group">{completing ? 'Missing' : 'Not in your collection'}</h3>
                  <ul className="shelf-issues">
                    {rest.map((i) => (
                      <li key={i.id} className={items[i.id] === 'want' ? 'want' : undefined}>
                        <span>{i.issue_label}</span>
                        {items[i.id] === 'want' ? (
                          <span className="shelf-want">Want</span>
                        ) : (
                          <button
                            type="button"
                            className="text-link"
                            onClick={async () => {
                              if (await setIssueState(i.id, title.id, 'want', 'shelf')) notice('Saved to your collection');
                            }}
                          >
                            Want
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <label className="collect-check">
                <input
                  type="checkbox"
                  checked={completing}
                  onChange={(event) => setTitleFlags(title.id, { completing: event.target.checked }, 'shelf')}
                />
                <span>Complete this title</span>
              </label>
            </article>
          );
        })}
      </div>
    </section>
  );
}
