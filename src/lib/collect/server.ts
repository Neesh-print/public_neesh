import type { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { anonClient, hasSupabaseEnv, serviceClient } from '@/lib/supabase';
import { compareIssues, ISSUE_COLUMNS, type Issue, type Utm } from './shared';

// Server-only helpers for Your collection. Never import from a client
// component: these use the service role key.

// The reader behind a request, from the Supabase access token the browser
// sends as a bearer token. Null when signed out or the token is bad.
export async function readerFromRequest(req: NextRequest): Promise<User | null> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const { data, error } = await serviceClient().auth.getUser(token);
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

const clipUtm = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 120) : null);

export function cleanUtm(raw: Utm | undefined | null) {
  return {
    utm_source: clipUtm(raw?.utm_source),
    utm_medium: clipUtm(raw?.utm_medium),
    utm_campaign: clipUtm(raw?.utm_campaign),
    utm_content: clipUtm(raw?.utm_content),
  };
}

// Blocked words for reader additions, checked on every text field. Kept
// short and specific on purpose: the three-day sweep catches the rest, and
// a long list blocks real magazine names. Matching is on word boundaries.
const BLOCKED_WORDS = [
  'nigger',
  'nigga',
  'faggot',
  'fag',
  'kike',
  'spic',
  'chink',
  'tranny',
  'retard',
  'cunt',
  'whore',
  'rape',
  'nazi',
  'porn',
  'xxx',
  'viagra',
  'cialis',
  'casino',
  'crypto',
  'bitcoin',
  'loan',
  'escort',
];
const BLOCKED_RE = new RegExp(`\\b(${BLOCKED_WORDS.join('|')})s?\\b`, 'i');
const URL_IN_TEXT_RE = /https?:\/\/|www\./i;

export function hasBlockedText(...values: (string | null | undefined)[]): boolean {
  return values.some((v) => typeof v === 'string' && BLOCKED_RE.test(v));
}

// Labels and names should not carry links (link spam lives there first).
export function hasLinkInText(...values: (string | null | undefined)[]): boolean {
  return values.some((v) => typeof v === 'string' && URL_IN_TEXT_RE.test(v));
}

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// A free slug in the given table, adding -2, -3... on collision.
export async function freeSlug(table: 'directory_titles' | 'directory_publishers', base: string): Promise<string> {
  const root = base || 'untitled';
  const { data } = await serviceClient().from(table).select('slug').like('slug', `${root}%`).limit(200);
  const taken = new Set((data ?? []).map((r) => r.slug as string));
  if (!taken.has(root)) return root;
  for (let n = 2; n < 1000; n++) {
    if (!taken.has(`${root}-${n}`)) return `${root}-${n}`;
  }
  return `${root}-${Date.now()}`;
}

// Issues for a title page, newest first. RLS drops removed, merged and
// rejected rows; the explicit filters say the same thing.
export async function getTitleIssues(titleId: string): Promise<Issue[]> {
  if (!hasSupabaseEnv) return [];
  const { data, error } = await anonClient()
    .from('directory_issues')
    .select(ISSUE_COLUMNS)
    .eq('title_id', titleId)
    .eq('removed', false)
    .is('merged_into', null)
    .neq('review_status', 'rejected')
    .limit(500);
  if (error || !data) return [];
  return (data as Issue[]).sort(compareIssues);
}
