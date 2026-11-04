import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from '../supabase';
import { makeToken, readToken } from '../collect/tokens';

// Who may edit which Index listing. A publisher owns its listing once it is
// claimed: claimed_email is the address the claim was approved for, or the
// Neesh account email for publishers that joined through the platform (the
// Index sync fills it in). The platform account email also counts on its
// own, through directory_neesh_links, so a publisher whose claim email has
// changed can still get in with the address they sign in to Neesh with.

export const SESSION_COOKIE = 'neesh_listing';
export const LINK_DAYS = 1;
export const SESSION_DAYS = 7;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ilike with the wildcards escaped is a case-insensitive equality.
function ilikeExact(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Ids of the claimed, live Index publishers this address may edit. */
export async function ownedPublisherIds(email: string, db: SupabaseClient = serviceClient()): Promise<string[]> {
  const address = normalizeEmail(email);
  const ids = new Set<string>();

  const { data: claimed } = await db
    .from('directory_publishers')
    .select('id')
    .eq('claimed', true)
    .eq('removed', false)
    .ilike('claimed_email', ilikeExact(address));
  for (const row of claimed ?? []) ids.add(row.id as string);

  // Neesh platform account: users -> publishers -> magazines -> linked titles.
  const { data: users } = await db.from('users').select('id').ilike('email', ilikeExact(address));
  const userIds = (users ?? []).map((u) => u.id as string);
  if (userIds.length) {
    const { data: accounts } = await db.from('publishers').select('id').in('user_id', userIds);
    const accountIds = (accounts ?? []).map((p) => p.id as string);
    if (accountIds.length) {
      const { data: mags } = await db.from('magazines').select('id').in('publisher_id', accountIds);
      const magIds = (mags ?? []).map((m) => m.id as string);
      if (magIds.length) {
        const { data: links } = await db
          .from('directory_neesh_links')
          .select('title:directory_titles!inner(publisher:directory_publishers!inner(id, removed))')
          .in('magazine_id', magIds);
        for (const link of (links ?? []) as unknown as {
          title: { publisher: { id: string; removed: boolean } };
        }[]) {
          if (!link.title.publisher.removed) ids.add(link.title.publisher.id);
        }
      }
    }
  }
  return [...ids];
}

export function linkToken(email: string): string {
  return makeToken('listing-link', normalizeEmail(email), LINK_DAYS);
}

export function sessionToken(email: string): string {
  return makeToken('listing-session', normalizeEmail(email), SESSION_DAYS);
}

export function emailFromLinkToken(token: string | null | undefined): string | null {
  return readToken(token, 'listing-link');
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // Lax keeps the cookie off cross-site POSTs, so another site cannot
    // submit an edit form on a signed-in publisher's behalf.
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

/** The signed-in editor's email, from the session cookie. */
export async function sessionEmail(): Promise<string | null> {
  const store = await cookies();
  return readToken(store.get(SESSION_COOKIE)?.value, 'listing-session');
}

/** The editor and the publishers they own, or null when not signed in. */
export async function currentEditor(): Promise<{ email: string; publisherIds: string[] } | null> {
  const email = await sessionEmail();
  if (!email) return null;
  return { email, publisherIds: await ownedPublisherIds(email) };
}

/**
 * Where an edit form sends the publisher afterwards: back to the editor,
 * scrolled to the form they used, with a saved or error notice. The error
 * text is always ours (from the schema), never echoed input.
 */
export function editorUrl(base: string, anchor: string, notice: { saved: true } | { error: string }): URL {
  const url = new URL('/listing/edit', base);
  if ('saved' in notice) url.searchParams.set('saved', anchor);
  else {
    url.searchParams.set('error', notice.error.slice(0, 200));
    url.searchParams.set('for', anchor);
  }
  url.hash = anchor;
  return url;
}

/** Form posts must come from this site; the session cookie is Lax already. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // older browsers omit it on same-origin posts
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

/** Audit row for one save. Never blocks the save itself. */
export async function recordEdit(
  db: SupabaseClient,
  row: { publisher_id: string; title_id: string | null; editor_email: string; changes: Record<string, unknown> }
): Promise<void> {
  const { error } = await db.from('directory_listing_edits').insert(row);
  if (error) console.warn(JSON.stringify({ level: 'warn', event: 'listing_edit.audit_failed', error: error.message }));
}
