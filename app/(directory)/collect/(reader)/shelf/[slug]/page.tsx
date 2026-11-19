'use client';

import Link from 'next/link';
import { use } from 'react';
import { useCollect } from '@/components/collect/CollectProvider';
import { IssueRow, LoadError, LoadingRows, ShelfGrid } from '@/components/collect/parts';
import { useTitlesWithIssues } from '@/components/collect/useIndexData';

// One magazine from the shelf: owned covers, then the issues still missing
// ("Missing" once the reader turns on Complete this title).
export default function ShelfMagazinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { ready, items, titles: flags, setTitleFlags } = useCollect();
  const { loading, error, titles, retry } = useTitlesWithIssues([], slug);
  const title = titles[0];

  if (error) {
    return (
      <section className="c-page">
        <div className="wrap">
          <LoadError retry={retry} />
        </div>
      </section>
    );
  }
  if (!ready || loading) {
    return (
      <section className="c-page">
        <div className="wrap">
          <LoadingRows />
        </div>
      </section>
    );
  }
  if (!title) {
    return (
      <section className="c-page">
        <div className="wrap c-stack">
          <Link href="/collect/shelf" className="c-back">
            &larr; Shelf
          </Link>
          <h1 className="c-h2">We couldn&rsquo;t find that magazine.</h1>
        </div>
      </section>
    );
  }

  const owned = title.issues.filter((i) => items[i.id] === 'own');
  const missing = title.issues.filter((i) => items[i.id] !== 'own');
  const completing = flags[title.id]?.completing ?? false;

  return (
    <section className="c-page">
      <div className="wrap c-detail">
        <Link href="/collect/shelf" className="c-back">
          &larr; Shelf
        </Link>
        <div className="c-head">
          <h1 className="c-h1 mag">{title.name}</h1>
          <span className="c-mono accent">
            {owned.length} of {title.issues.length} issues
          </span>
        </div>
        {owned.length > 0 && <ShelfGrid issues={owned} titleName={title.name} />}
        {missing.length > 0 && (
          <div>
            <span className="c-mono muted c-label">{completing ? 'Missing' : 'Not in your collection'}</span>
            {missing.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                titleId={title.id}
                titleName={title.name}
                surface="shelf"
                showCover={false}
              />
            ))}
            <div className="c-rule" />
          </div>
        )}
        {title.issues.length > 1 && (
          <label className="c-check">
            <input
              type="checkbox"
              checked={completing}
              onChange={(event) => setTitleFlags(title.id, { completing: event.target.checked }, 'shelf')}
            />
            <span>Complete this title. Unowned issues show as Missing.</span>
          </label>
        )}
        <Link href={`/titles/${title.slug}`} className="c-btn">
          Open the title page
        </Link>
      </div>
    </section>
  );
}
