// Small display helpers shared by the stockist surfaces and the index cards.

import { FREQUENCY_LABELS, placeLabel } from './seo';
import type { Frequency } from './types';

// "2026-10-13" -> "October 2026"
export function monthYear(date: string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// plural(3, 'shop', 'shops') -> "3 shops"
export function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString('en')} ${n === 1 ? one : many}`;
}

// ["A", "B", "C"] -> "A, B and C"
export function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// Short frequency label for compact UI: "quarterly" -> "Quarterly".
export function frequencyLabel(frequency: Frequency | string | null | undefined): string | null {
  if (!frequency) return null;
  return FREQUENCY_LABELS[frequency] ?? null;
}

// The mono meta line on an index card: where it is from and how often it
// comes out, "London, United Kingdom · Quarterly". Origin falls back from the
// title's own city and country to the publisher's.
export function titleCardMeta(title: {
  city: string | null;
  country: string | null;
  frequency: Frequency | null;
  publisher?: { city: string | null; country: string | null } | null;
}): string | null {
  const place =
    placeLabel(title.city, title.country) ??
    placeLabel(title.publisher?.city ?? null, title.publisher?.country ?? null);
  const parts = [place, frequencyLabel(title.frequency)].filter(Boolean);
  return parts.length ? parts.join(' \u00b7 ') : null;
}
