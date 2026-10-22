import { formatPrice, monthYear, plural } from '@/lib/format';
import { coverPublicUrl } from '@/lib/supabase';
import type { TitleIssue } from '@/lib/types';

// Back issues on a title page, newest first. Server rendered; long runs
// (The Paris Review has hundreds) show the latest few and fold the rest.

const EXPANDED_ISSUES = 12;

function issueLabel(issue: TitleIssue): string {
  if (issue.issue_label) return issue.issue_label;
  if (issue.issue_number != null) return `Issue ${issue.issue_number}`;
  return 'Issue';
}

function issueMeta(issue: TitleIssue): string | null {
  const date =
    monthYear(issue.published_on) ?? (issue.published_year ? String(issue.published_year) : null);
  const parts = [date, formatPrice(issue.cover_price, issue.currency)].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

function IssueCard({ issue, titleName }: { issue: TitleIssue; titleName: string }) {
  const src = coverPublicUrl(issue.cover_image_path);
  const label = issueLabel(issue);
  const meta = issueMeta(issue);
  return (
    <li className="issue-card">
      <div className="t-card-cover">
        {src ? (
          <img src={src} alt={`${titleName}, ${label} cover`} loading="lazy" />
        ) : (
          <div className="t-card-fallback">
            <span className="name">{titleName}</span>
            <div className="meta">
              <span className="soon">Cover coming soon</span>
            </div>
          </div>
        )}
      </div>
      <span className="issue-label">{label}</span>
      {meta && <span className="issue-meta">{meta}</span>}
    </li>
  );
}

export function IssuesSection({ titleName, issues }: { titleName: string; issues: TitleIssue[] }) {
  if (issues.length === 0) return null;
  const shown = issues.slice(0, EXPANDED_ISSUES);
  const rest = issues.slice(EXPANDED_ISSUES);

  return (
    <section id="issues" className="issues" aria-labelledby="issues-heading">
      <div className="wrap">
        <h2 id="issues-heading">Issues of {titleName}</h2>
        <p className="issues-count">{plural(issues.length, 'issue', 'issues')} in the index.</p>
        <ul className="issue-grid">
          {shown.map((issue) => (
            <IssueCard key={issue.id} issue={issue} titleName={titleName} />
          ))}
        </ul>
        {rest.length > 0 && (
          <details className="issues-more">
            <summary>Show {plural(rest.length, 'earlier issue', 'earlier issues')}</summary>
            <ul className="issue-grid">
              {rest.map((issue) => (
                <IssueCard key={issue.id} issue={issue} titleName={titleName} />
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}
