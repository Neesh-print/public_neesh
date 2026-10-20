'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { COVERAGE_FOOTER, isReaderAdded, type Coverage, type Issue } from '@/lib/collect/shared';
import { useCollect } from './CollectProvider';
import { ReportButton } from './ReportButton';
import { AlertToggle } from './AlertToggle';

// The issue list on a title page: Own and Want per issue, coverage status in
// the footer, and Report on every record. Server-rendered issue data, client
// toggles; marks work before sign-in.

export interface IssueRow extends Issue {
  cover: string | null;
}

function dateLabel(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function IssueList({
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
  issues: IssueRow[];
  coverage: Coverage;
  pilot: boolean;
}) {
  const { items, setIssueState, notice, logEvent } = useCollect();

  useEffect(() => {
    logEvent('title_viewed', { title_id: titleId, surface: 'title_page' });
  }, [logEvent, titleId]);

  async function toggle(issue: IssueRow, state: 'own' | 'want') {
    const current = items[issue.id] ?? null;
    const next = current === state ? null : state;
    const ok = await setIssueState(issue.id, titleId, next, 'title_page');
    if (!ok) notice('That didn’t save. Try again.');
    else if (next) notice('Saved to your collection');
  }

  const footer = COVERAGE_FOOTER[coverage];
  const addHref = `/collect/add?title=${encodeURIComponent(titleSlug)}`;

  return (
    <section id="issues" className="collect-issues" aria-labelledby="issues-heading">
      <div className="wrap">
        <span className="eyebrow dim">Your collection</span>
        <h2 id="issues-heading">Issues of {titleName}</h2>

        {issues.length === 0 ? (
          <p className="collect-issues-empty">
            No issues listed yet.{' '}
            <Link href={addHref} className="text-link">
              Add an issue
            </Link>
          </p>
        ) : (
          <ol className="issue-list">
            {issues.map((issue) => {
              const state = items[issue.id] ?? null;
              const date = dateLabel(issue.published_on);
              return (
                <li key={issue.id} className="issue-row">
                  <div className="issue-thumb" aria-hidden="true">
                    {issue.cover ? <img src={issue.cover} alt="" loading="lazy" /> : <span>{issue.issue_label.slice(0, 2)}</span>}
                  </div>
                  <div className="issue-meta">
                    <span className="issue-label">{issue.issue_label}</span>
                    <span className="issue-sub">
                      {date}
                      {isReaderAdded(issue) && <span className="reader-tag">Reader-added</span>}
                    </span>
                    {pilot && state === 'want' && <AlertToggle issueId={issue.id} titleId={titleId} />}
                  </div>
                  <div className="issue-toggles" role="group" aria-label={`${issue.issue_label} in your collection`}>
                    <button
                      type="button"
                      className={`toggle${state === 'own' ? ' on' : ''}`}
                      aria-pressed={state === 'own'}
                      onClick={() => toggle(issue, 'own')}
                    >
                      Own
                    </button>
                    <button
                      type="button"
                      className={`toggle${state === 'want' ? ' on' : ''}`}
                      aria-pressed={state === 'want'}
                      onClick={() => toggle(issue, 'want')}
                    >
                      Want
                    </button>
                    <ReportButton targetKind="issue" targetId={issue.id} label={issue.issue_label} />
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <p className="issue-footer">
          {footer.text}
          {footer.link && (
            <>
              {' '}
              <Link href={addHref} className="text-link">
                {footer.link}
              </Link>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
