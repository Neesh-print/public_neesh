'use client';

import Link from 'next/link';
import { coverPublicUrl } from '@/lib/supabase';
import {
  COVERAGE_LINE,
  evidenceLabel,
  issueCaption,
  issueMeta,
  isReaderAdded,
  type Coverage,
  type Issue,
  type ShopAvailability,
} from '@/lib/collect/shared';
import { useCollect } from './CollectProvider';

// The new components from the design handoff (component sheet): Own / Want
// pills, Follow pill, issue row, coverage line, shelf grid, shop row with
// evidence, and the loading and error states. Everything else reuses the
// site's existing recipes.

export function OwnWantPills({
  issueId,
  titleId,
  surface,
}: {
  issueId: string;
  titleId: string;
  surface: string;
}) {
  const { items, markIssue } = useCollect();
  const state = items[issueId] ?? null;
  return (
    <div className="c-pair">
      {(['own', 'want'] as const).map((kind) => {
        const on = state === kind;
        const label = kind === 'own' ? 'Own' : 'Want';
        return (
          <button
            key={kind}
            type="button"
            className={`c-pill${on ? ' on' : ''}`}
            aria-pressed={on}
            aria-label={`${label}, ${on ? 'selected' : 'not selected'}`}
            onClick={() => markIssue(issueId, titleId, kind, surface)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function FollowPill({ titleId, surface, note }: { titleId: string; surface: string; note?: boolean }) {
  const { titles, toggleFollow } = useCollect();
  const following = titles[titleId]?.following ?? false;
  return (
    <div className="c-follow">
      <button
        type="button"
        className={`c-pill wide${following ? ' on' : ''}`}
        aria-pressed={following}
        onClick={() => toggleFollow(titleId, surface)}
      >
        {following ? 'Following' : 'Follow'}
      </button>
      {note && following && <span className="c-follow-note">You&rsquo;ll hear when the next issue is out.</span>}
    </div>
  );
}

export function issueCover(issue: Pick<Issue, 'cover_image_path'>): string | null {
  return coverPublicUrl(issue.cover_image_path);
}

export function Cover({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className: string;
}) {
  // Missing cover: reserve the space, hide the image.
  return src ? (
    <img className={className} src={src} alt={alt} loading="lazy" />
  ) : (
    <span className={`${className} c-cover-empty`} role="img" aria-label={alt} />
  );
}

export function ReaderAdded() {
  return <span className="c-chip">Reader-added</span>;
}

export function IssueRow({
  issue,
  titleId,
  titleName,
  surface,
  showCover = true,
}: {
  issue: Issue;
  titleId: string;
  titleName: string;
  surface: string;
  showCover?: boolean;
}) {
  return (
    <div className="c-row">
      {showCover && (
        <Cover className="c-row-cover" src={issueCover(issue)} alt={`${titleName}, ${issue.issue_label}`} />
      )}
      <div className="c-row-text">
        <span className="c-row-label">
          {issue.issue_label}
          {isReaderAdded(issue) && <ReaderAdded />}
        </span>
        {issueMeta(issue) && <span className="c-meta">{issueMeta(issue)}</span>}
      </div>
      <OwnWantPills issueId={issue.id} titleId={titleId} surface={surface} />
    </div>
  );
}

export function CoverageLine({ coverage, addHref }: { coverage: Coverage; addHref: string }) {
  return (
    <div className="c-coverage">
      <span>{COVERAGE_LINE[coverage]}</span>
      <Link href={addHref}>Add an issue</Link>
    </div>
  );
}

// Covers in hairline cells. The last row is padded with empty cells so the
// black grid background never shows; columns change at the breakpoint, so
// padding covers both (3 and 6).
export function ShelfGrid({
  issues,
  titleName,
  href,
}: {
  issues: Issue[];
  titleName: string;
  href?: string;
}) {
  const pad = (n: number, cols: number) => (cols - (n % cols)) % cols;
  const mobilePad = pad(issues.length, 3);
  const desktopPad = pad(issues.length, 6);
  const cells = issues.map((issue) => {
    const inner = (
      <>
        <Cover className="c-cell-cover" src={issueCover(issue)} alt={`${titleName}, ${issue.issue_label}`} />
        <span className="c-cell-caption">{issueCaption(issue)}</span>
      </>
    );
    return href ? (
      <Link key={issue.id} href={href} className="c-cell">
        {inner}
      </Link>
    ) : (
      <div key={issue.id} className="c-cell">
        {inner}
      </div>
    );
  });
  return (
    <div className="c-grid">
      {cells}
      {Array.from({ length: Math.max(mobilePad, desktopPad) }, (_, i) => (
        <div
          key={`pad-${i}`}
          className={`c-cell pad${i < mobilePad ? ' m' : ''}${i < desktopPad ? ' d' : ''}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function ShopRow({
  shop,
  issueLabel,
  onClick,
  compact = false,
}: {
  shop: ShopAvailability;
  issueLabel: string | null;
  onClick?: () => void;
  compact?: boolean;
}) {
  const evidence = evidenceLabel(shop, issueLabel);
  const place = compact ? [shop.city, shop.borough].filter(Boolean).join(', ') : shop.borough;
  return (
    <div className={`c-shop${compact ? ' compact' : ''}`}>
      <span className="c-shop-name">
        <Link href={`/stores/${shop.store_slug}`} onClick={onClick}>
          {shop.store_name}
        </Link>
        {place && <span className="c-shop-place">{place}</span>}
      </span>
      <span className={`c-evidence${evidence.strong ? ' strong' : ''}`}>{evidence.text}</span>
    </div>
  );
}

export function LoadingRows() {
  return (
    <div className="c-loading" aria-busy="true">
      <div className="c-skel-title" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="c-skel-row">
          <div className="c-skel-cover" />
          <div className="c-skel-lines">
            <div />
            <div />
          </div>
          <div className="c-skel-pill" />
          <div className="c-skel-pill wide" />
        </div>
      ))}
      <div className="c-rule" />
      <p className="c-mono muted">Loading</p>
    </div>
  );
}

export function LoadError({ retry }: { retry: () => void }) {
  return (
    <div className="c-stack c-error-state">
      <h2 className="c-h2">We couldn&rsquo;t load this.</h2>
      <p className="c-muted">Nothing you&rsquo;ve marked is lost. Check your connection and try again.</p>
      <button type="button" className="c-btn" onClick={retry}>
        Try again
      </button>
    </div>
  );
}

export function PageHead({ title, count }: { title: string; count?: string }) {
  return (
    <div className="c-head">
      <h1 className="c-h1">{title}</h1>
      {count && <span className="c-mono accent">{count}</span>}
    </div>
  );
}
