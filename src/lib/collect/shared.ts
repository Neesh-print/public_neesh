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
  cover_image_path: string | null;
  created_from: string;
  review_status: ReviewStatus;
}

export const ISSUE_COLUMNS =
  'id, title_id, issue_label, issue_number, sort_order, published_on, cover_image_path, created_from, review_status';

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

// Issue list footer copy, by catalogue coverage.
export const COVERAGE_FOOTER: Record<Coverage, { text: string; link: string | null }> = {
  complete: { text: 'Every issue to date', link: null },
  partial: { text: 'Some issues not listed yet.', link: 'Add one' },
  unknown: { text: "We're still building this list.", link: 'Add an issue' },
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

export interface IssueAvailability {
  issue_id: string;
  shops: ShopAvailability[];
}

export const MAX_ADDITIONS_PER_DAY = 20;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// The pilot asks "Did you find it?" this many days after a stockist click.
export const FOUND_IT_AFTER_DAYS = 3;
