'use client';

import Link from 'next/link';
import { CollectTabs } from '@/components/collect/CollectTabs';
import { useCollect } from '@/components/collect/CollectProvider';
import { useTitlesWithIssues } from '@/components/collect/useIndexData';

// Followed titles and their latest issues.
export default function FollowingPage() {
  const { ready, items, titles: flags, setTitleFlags, setIssueState, notice } = useCollect();
  const followed = Object.entries(flags)
    .filter(([, f]) => f.following)
    .map(([id]) => id);
  const { loading, titles } = useTitlesWithIssues(followed);

  return (
    <section className="collect-page">
      <div className="wrap">
        <CollectTabs />
        <h1>Following</h1>
        {ready && !loading && titles.length === 0 && (
          <div className="collect-empty">
            <h2>You&rsquo;re not following anything yet.</h2>
            <p>
              Follow a magazine on its title page and hear when the next issue is out.{' '}
              <Link href="/index" className="text-link">
                Explore magazines
              </Link>
            </p>
          </div>
        )}
        <ul className="following-list">
          {titles
            .filter((t) => flags[t.id]?.following)
            .map((title) => {
              const latest = title.issues.slice(0, 3);
              return (
                <li key={title.id} className="following-item">
                  <header>
                    <Link href={`/titles/${title.slug}`} className="want-title">
                      {title.name}
                    </Link>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => setTitleFlags(title.id, { following: false }, 'following')}
                    >
                      Unfollow
                    </button>
                  </header>
                  {latest.length === 0 ? (
                    <p className="want-shops-none">No issues listed yet.</p>
                  ) : (
                    <ul className="shelf-issues">
                      {latest.map((i) => {
                        const state = items[i.id];
                        return (
                          <li key={i.id} className={state}>
                            <span>{i.issue_label}</span>
                            {state ? (
                              <span className="shelf-want">{state === 'own' ? 'Own' : 'Want'}</span>
                            ) : (
                              <button
                                type="button"
                                className="text-link"
                                onClick={async () => {
                                  if (await setIssueState(i.id, title.id, 'want', 'following')) {
                                    notice('Saved to your collection');
                                  }
                                }}
                              >
                                Want
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
        </ul>
      </div>
    </section>
  );
}
