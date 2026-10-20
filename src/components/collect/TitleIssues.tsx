'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ArrowIcon } from '@/components/Logo';
import type { Coverage, Issue } from '@/lib/collect/shared';
import { useCollect } from './CollectProvider';
import { AlertToggle } from './AlertToggle';
import { CoverageLine, IssueRow } from './parts';

// The issues block on a title page: Own and Want on every issue, newest
// first, closed by the coverage line. Server-rendered data, client toggles;
// marks work before sign-in.
export function TitleIssues({
  titleId,
  titleSlug,
  titleName,
  issues,
  coverage,
  pilot,
}: {
  titleId: string;
  titleSlug: string;
  titleName: string;
  issues: Issue[];
  coverage: Coverage;
  pilot: boolean;
}) {
  const { items, logEvent } = useCollect();

  useEffect(() => {
    logEvent('title_viewed', { title_id: titleId, surface: 'title_page' });
  }, [logEvent, titleId]);

  const owned = issues.filter((i) => items[i.id] === 'own').length;
  const addHref = `/collect/add?title=${encodeURIComponent(titleSlug)}`;

  return (
    <div id="issues" className="c-issues">
      <div className="c-issues-head">
        <span>Issues</span>
        {issues.length > 0 && (
          <span className="accent">
            {owned} of {issues.length} owned
          </span>
        )}
      </div>
      {issues.map((issue) => (
        <div key={issue.id}>
          <IssueRow issue={issue} titleId={titleId} titleName={titleName} surface="title_page" />
          {pilot && items[issue.id] === 'want' && <AlertToggle issueId={issue.id} />}
        </div>
      ))}
      <CoverageLine coverage={coverage} addHref={addHref} />
    </div>
  );
}

// Only one solid black button per page: the order button is solid unless
// the reader follows the title, when the filled Following pill is the one.
export function OrderCta({ titleId, titleSlug, listed }: { titleId: string; titleSlug: string; listed: boolean }) {
  const { titles } = useCollect();
  const following = titles[titleId]?.following ?? false;
  if (!listed) {
    return (
      <a className="c-btn" href="#stockists">
        Find shops
      </a>
    );
  }
  return (
    <div className="c-order">
      <Link href={`/order/${titleSlug}`} className={`btn ${following ? 'ghost' : 'solid'} c-order-btn`}>
        Order wholesale on Neesh
        <ArrowIcon />
      </Link>
      <span className="cta-note">Run a space? By the copy, no minimums.</span>
    </div>
  );
}
