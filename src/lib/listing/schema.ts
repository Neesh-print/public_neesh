import { z } from 'zod';
import type { Frequency, TitleStatus } from '../types';

// Validation for publisher edits to their own Index listing. Pure, so the
// tests can import it without Supabase or Next.
//
// Every form field is prefilled with the current value, so a blank field
// means "clear it" (null), except the names, which are required. Slugs are
// never editable: renaming a title keeps its URL.

export const FREQUENCIES: Frequency[] = [
  'weekly',
  'monthly',
  'bimonthly',
  'quarterly',
  'triannual',
  'biannual',
  'annual',
  'irregular',
  'evergreen',
];

export const STATUSES: TitleStatus[] = ['active', 'dormant', 'ceased'];

export const MAX_SUBJECT_TAGS = 3;
export const MAX_COVER_BYTES = 4 * 1024 * 1024; // Vercel caps a request body at 4.5 MB

const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(blank, schema.optional()).transform((v) => (v === undefined ? null : v));

const httpUrl = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
  .pipe(z.url({ protocol: /^https?$/ }));

const country = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, 'Pick a country from the list');

export const publisherSchema = z.object({
  name: z.string().trim().min(1, 'The publisher needs a name').max(200),
  website: optional(httpUrl),
  city: optional(z.string().trim().max(100)),
  country: optional(country),
  stockist_page_url: optional(httpUrl),
});
export type PublisherEdit = z.output<typeof publisherSchema>;

export const titleSchema = z
  .object({
    name: z.string().trim().min(1, 'The title needs a name').max(200),
    description: optional(z.string().trim().max(3000, 'Keep the description under 3,000 characters')),
    frequency: optional(z.enum(FREQUENCIES)),
    cover_price: optional(z.coerce.number().min(0).max(10_000)),
    currency: optional(z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Use a three-letter currency code, like USD')),
    trim_size: optional(z.string().trim().max(60)),
    page_count: optional(z.coerce.number().int().min(1).max(5000)),
    country: optional(country),
    city: optional(z.string().trim().max(100)),
    status: z.enum(STATUSES),
    last_issue_date: optional(z.iso.date()),
    subscribe_url: optional(httpUrl),
    primary_tag: z.uuid({ message: 'Choose the niche the title belongs in' }),
    subject_tags: z.array(z.uuid()).max(MAX_SUBJECT_TAGS * 2),
    identity_tags: z.array(z.uuid()).max(20),
  })
  .refine((t) => t.cover_price === null || t.currency !== null, {
    path: ['currency'],
    message: 'Add the currency for the cover price',
  });
export type TitleEdit = z.output<typeof titleSchema>;

/** The subject tags to store: the primary first, de-duplicated, capped. */
export function subjectSelection(primary: string, others: string[]): string[] {
  return [...new Set([primary, ...others])].slice(0, MAX_SUBJECT_TAGS);
}

/** The first problem, worded for a person. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Something in the form was not right.';
  if (issue.message && !issue.message.startsWith('Invalid') && !issue.message.startsWith('Too')) {
    return issue.message;
  }
  const field = String(issue.path[0] ?? 'a field').replace(/_/g, ' ');
  return `Check the ${field} field.`;
}

/** Changed fields as { field: { from, to } }; unchanged ones are left out. */
export function diff(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const [key, to] of Object.entries(after)) {
    const from = before[key] ?? null;
    const same =
      Array.isArray(from) && Array.isArray(to)
        ? from.length === to.length && from.every((v, i) => v === to[i])
        : from === to || (from != null && to != null && String(from) === String(to));
    if (!same) out[key] = { from, to };
  }
  return out;
}

// Cover uploads: JPEG, PNG or WebP, recognised by their first bytes rather
// than the browser's say-so.
export function imageType(bytes: Uint8Array): { ext: string; mime: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { ext: 'png', mime: 'image/png' };
  }
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}
