'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CollectTabs } from '@/components/collect/CollectTabs';
import { useCollect } from '@/components/collect/CollectProvider';
import { Cover, issueCover, LoadError, LoadingRows, PageHead } from '@/components/collect/parts';
import { useTitlesWithIssues } from '@/components/collect/useIndexData';
import { coverPublicUrl } from '@/lib/supabase';
import { issueDate } from '@/lib/collect/shared';
import { plural } from '@/lib/format';

// Followed magazines and their latest issue. One job: see what's new. NEW
// marks issues added to the Index since this page was last opened on this
// device.

const SEEN_KEY = 'neesh_collect_following_seen';

export default function FollowingPage() {
  const { ready, titles: flags, toggleFollow } = useCollect();
  const followed = Object.keys(flags).filter((id) => flags[id].following);
  const { loading, error, titles, retry } = useTitlesWithIssues(followed);
  const [lastVisit, setLastVisit] = useState<number | null>(null);

  useEffect(() => {
    let previous = 0;
    try {
      previous = Number(window.localStorage.getItem(SEEN_KEY) ?? 0);
      window.localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch {
      // without storage nothing shows as new
    }
    setLastVisit(previous);
  }, []);

  const rows = titles
    .filter((t) => flags[t.id]?.following)
    .map((t) => {
      const latest = t.issues[0] ?? null;
      const isNew = Boolean(latest && lastVisit && Date.parse(latest.created_at) > lastVisit);
      return { title: t, latest, isNew };
    })
    .sort(
      (a, b) =>
        Number(b.isNew) - Number(a.isNew) ||
        (b.latest?.published_on ?? b.latest?.created_at ?? '').localeCompare(a.latest?.published_on ?? a.latest?.created_at ?? '')
    );
  const busy = !ready || (loading && followed.length > 0);

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
            <PageHead title="Following" count={plural(rows.length, 'magazine', 'magazines')} />
            {rows.length === 0 ? (
              <div className="c-stack">
                <h2 className="c-h2 sm">You&rsquo;re not following anything yet.</h2>
                <p className="c-muted">
                  Follow a magazine on its title page and hear when the next issue is out.{' '}
                  <Link href="/index" className="c-link">
                    Explore magazines
                  </Link>
                </p>
              </div>
            ) : (
              <>
                <div>
                  {rows.map(({ title, latest, isNew }) => (
                    <div key={title.id} className="c-row follow">
                      <Link href={`/titles/${title.slug}#issues`} className="c-row-link">
                        <Cover
                          className="c-want-cover"
                          src={latest ? issueCover(latest) ?? coverPublicUrl(title.cover_image_path) : coverPublicUrl(title.cover_image_path)}
                          alt={latest ? `${title.name}, ${latest.issue_label}` : `${title.name} cover`}
                        />
                        <span className="c-row-text">
                          <span className="c-result-name">{title.name}</span>
                          <span className="c-meta">
                            {latest ? [latest.issue_label, issueDate(latest)].filter(Boolean).join(' · ') : 'No issues listed yet'}
                            {isNew && <span className="c-chip new">New</span>}
                          </span>
                        </span>
                      </Link>
                      <button
                        type="button"
                        className="c-pill on"
                        aria-pressed
                        aria-label={`Following ${title.name}. Tap to unfollow`}
                        onClick={() => toggleFollow(title.id, 'following')}
                      >
                        Following
                      </button>
                    </div>
                  ))}
                  <div className="c-rule" />
                </div>
                <p className="c-fine">Newest first. New marks issues since your last visit.</p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
