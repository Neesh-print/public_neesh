// Your collection on Neesh: types and constants shared by the server routes
// and the browser. Safe to import from client components.

export type CollectionState = 'own' | 'want';
export type Coverage = 'complete' | 'partial' | 'unknown';
export type ReviewStatus = 'approved' | 'pending' | 'flagged' | 'rejected';

// One row of directory_issues as the public pages read it.
export interface Issue {
  id: string;
  title_id: string;
  issue_label: string;
  issue_number: number | null;
  sort_order: number | null;
  published_on: string | null;
  published_year: number | null;
  cover_image_path: string | null;
  created_from: string;
  review_status: ReviewStatus;
  created_at: string;
}

// Where to send a reader after sign-in. Only a path on this site: a bare
// "/x" check lets "/\evil.com" through, which browsers read as
// "//evil.com". Anything else falls back to the shelf.
export function safeNextPath(raw: string | null | undefined, fallback = '/collect/shelf'): string {
  if (!raw || raw.length > 500 || !raw.startsWith('/')) return fallback;
  if (raw.startsWith('//') || raw.includes('\\') || /[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  try {
    const base = 'https://neesh.invalid';
    const url = new URL(raw, base);
    return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}

// A reader-added record nobody has checked yet. It shows on the site with a
// Reader-added tag, but stays out of search, the sitemap and outbound
// redirects until a person approves it.
export function isUnreviewedReaderRecord(r: { created_from?: string | null; review_status?: string | null }): boolean {
  return r.created_from === 'reader_created' && r.review_status !== 'approved';
}

export const ISSUE_COLUMNS =
  'id, title_id, issue_label, issue_number, sort_order, published_on, published_year, cover_image_path, created_from, review_status, created_at';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "OCT 2026", or "2026" when only the year is known.
export function issueDate(issue: Pick<Issue, 'published_on' | 'published_year'>): string | null {
  if (issue.published_on) {
    const [y, m] = issue.published_on.split('-');
    return `${MONTHS[Number(m) - 1] ?? ''} ${y}`.trim();
  }
  return issue.published_year ? String(issue.published_year) : null;
}

// "NO. 04" from the issue number; null for unnumbered issues.
export function issueNumberLabel(issue: Pick<Issue, 'issue_number'>): string | null {
  if (issue.issue_number == null) return null;
  const n = Number(issue.issue_number);
  return `No. ${Number.isInteger(n) && n < 10 ? `0${n}` : n}`;
}

// Row metadata: "NO. 04 · OCT 2026" (rendered uppercase).
export function issueMeta(issue: Pick<Issue, 'issue_number' | 'published_on' | 'published_year'>): string {
  return [issueNumberLabel(issue), issueDate(issue)].filter(Boolean).join(' · ');
}

// Shelf cell caption: the number when there is one, else the label.
export function issueCaption(issue: Pick<Issue, 'issue_number' | 'issue_label'>): string {
  return issueNumberLabel(issue) ?? issue.issue_label;
}

// Confirmation toasts (set in mono caps).
export const TOAST = {
  ownAdded: 'Saved to your collection',
  ownRemoved: 'Removed from your collection',
  wantAdded: 'Added to your wants',
  wantRemoved: 'Removed from your wants',
  followed: "You're following this magazine on Neesh",
  unfollowed: 'Unfollowed',
  indexed: 'Added to the Index',
  linkSent: 'Link sent. Check your inbox',
  failed: "Couldn't save. Try again",
} as const;

// Newest first: manual order wins, then number, then date, then label.
export function compareIssues(a: Issue, b: Issue): number {
  const key = (i: Issue) => i.sort_order ?? i.issue_number ?? null;
  const ka = key(a);
  const kb = key(b);
  if (ka != null && kb != null && ka !== kb) return kb - ka;
  if (a.published_on && b.published_on && a.published_on !== b.published_on) {
    return b.published_on.localeCompare(a.published_on);
  }
  if (ka != null && kb == null) return -1;
  if (ka == null && kb != null) return 1;
  return b.issue_label.localeCompare(a.issue_label, 'en', { numeric: true });
}

export function isReaderAdded(row: { created_from: string; review_status: ReviewStatus }): boolean {
  return row.created_from === 'reader_created' && row.review_status !== 'approved';
}

// Coverage line under every issue list. Fixed strings only.
export const COVERAGE_LINE: Record<Coverage, string> = {
  complete: 'Every issue to date',
  partial: 'Some issues not listed yet',
  unknown: "We're still building this list",
};

// Event types a browser may log. Before sign-in the state changes are
// logged here too, with the device's anon_id; after sign-in the database
// triggers log them instead.
export const CLIENT_EVENT_TYPES = [
  'own_added',
  'own_removed',
  'want_added',
  'want_removed',
  'follow_added',
  'follow_removed',
  'complete_on',
  'complete_off',
  'stockist_click',
  'purchase_click',
  'acquired_confirmed',
  'issue_viewed',
  'title_viewed',
] as const;
export type ClientEventType = (typeof CLIENT_EVENT_TYPES)[number];

export const STATE_EVENT_TYPES: ReadonlySet<string> = new Set([
  'own_added',
  'own_removed',
  'want_added',
  'want_removed',
  'follow_added',
  'follow_removed',
  'complete_on',
  'complete_off',
]);

export interface Utm {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
}

// Availability, per the spec's three levels. 'carries' comes from the
// title-level stockist lists; 'reported' and 'confirmed' are dated issue
// records that expire after 60 and 14 days. An expired record falls back to
// the level below; a shop that is on no stockist list keeps showing as
// 'lapsed' with its last date, so it never disappears silently and never
// reads as current.
export type AvailabilityLevel = 'confirmed' | 'reported' | 'carries' | 'lapsed';

export const LEVEL_RANK: Record<AvailabilityLevel, number> = { confirmed: 0, reported: 1, carries: 2, lapsed: 3 };

export interface ShopAvailability {
  store_id: string | null;
  store_slug: string;
  store_name: string;
  city: string | null;
  city_slug: string | null;
  borough: string | null;
  level: AvailabilityLevel;
  // 'carries' from a publisher-wide list: the shop sells something from the
  // publisher, not necessarily this title.
  publisher_wide: boolean;
  observed_on: string | null;
  // Set when a dated record for this issue and shop has expired; the shop
  // then shows at the level below with this date as history, never as
  // current.
  last_reported_on: string | null;
}

// Evidence line on a shop row. Fixed strings, set in mono caps; only
// confirmed and reported records read in ink.
export function evidenceLabel(
  shop: Pick<ShopAvailability, 'level' | 'observed_on' | 'last_reported_on' | 'publisher_wide'>,
  issueLabel: string | null
): { text: string; strong: boolean } {
  const day = (d: string) => {
    const [, m, dd] = d.split('-');
    return `${Number(dd)} ${MONTHS[Number(m) - 1]}`;
  };
  switch (shop.level) {
    case 'confirmed':
      return { text: `In stock as of ${day(shop.observed_on!)}`, strong: true };
    case 'reported':
      return { text: `Stocked ${issueLabel ?? 'this issue'} as of ${day(shop.observed_on!)}`, strong: true };
    case 'lapsed':
      return { text: `Reported ${issueLabel ?? 'this issue'} on ${day(shop.last_reported_on!)}, not rechecked`, strong: false };
    default:
      return { text: shop.publisher_wide ? 'Carries this publisher' : 'Carries this magazine', strong: false };
  }
}

export interface IssueAvailability {
  issue_id: string;
  shops: ShopAvailability[];
}

export const MAX_ADDITIONS_PER_DAY = 20;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// The pilot asks "Did you find it?" this many days after a stockist click.
export const FOUND_IT_AFTER_DAYS = 3;
