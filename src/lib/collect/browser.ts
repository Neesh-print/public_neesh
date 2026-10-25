'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CollectionState, Utm } from './shared';
import { readConsent } from '@/lib/consent';

// Browser-side state for Your collection. Before sign-in, marks live in
// local storage on this device (the reader asked for them). The device id
// and the campaign tags of the first visit are analytics, so their cookies
// are only set once the visitor accepts cookies (src/lib/consent.ts).
// Everything here is best-effort: a blocked cookie or storage call never
// breaks the page.

const ANON_COOKIE = 'neesh_anon';
const UTM_COOKIE = 'neesh_collect_utm';
const MARKS_KEY = 'neesh_collect_marks';
const YEAR = 60 * 60 * 24 * 365;

let client: SupabaseClient | null = null;

// One Supabase client per tab, with its own storage key so a reader
// session never collides with anything else on the domain.
export function browserClient(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'neesh-collect-auth',
    },
  });
  return client;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const part = document.cookie.split('; ').find((p) => p.startsWith(`${name}=`));
    return part ? decodeURIComponent(part.slice(name.length + 1)) : null;
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string): void {
  try {
    document.cookie =
      `${name}=${encodeURIComponent(value)}; max-age=${YEAR}; path=/; SameSite=Lax` +
      (window.location.protocol === 'https:' ? '; Secure' : '');
  } catch {
    // best-effort
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The device id, created on first use once cookies are accepted. Null
// without consent: anonymous events are then not logged at all.
export function anonId(): string | null {
  // Checked before reading too: a cookie set before consent existed is
  // not used either.
  if (readConsent() !== 'granted') return null;
  const existing = readCookie(ANON_COOKIE);
  if (existing && UUID_RE.test(existing)) return existing;
  const id = crypto.randomUUID();
  writeCookie(ANON_COOKIE, id);
  return id;
}

// Keep the first campaign that brought this device here (poster, sticker).
export function captureUtm(): void {
  if (typeof window === 'undefined' || readCookie(UTM_COOKIE)) return;
  if (readConsent() !== 'granted') return;
  const params = new URLSearchParams(window.location.search);
  const utm: Utm = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const) {
    const v = params.get(key);
    if (v) utm[key] = v.slice(0, 120);
  }
  if (Object.keys(utm).length > 0) writeCookie(UTM_COOKIE, JSON.stringify(utm));
}

export function readUtm(): Utm {
  if (readConsent() !== 'granted') return {};
  try {
    return JSON.parse(readCookie(UTM_COOKIE) ?? '{}') as Utm;
  } catch {
    return {};
  }
}

export interface LocalMarks {
  items: Record<string, { state: CollectionState; title_id: string }>;
  titles: Record<string, { following: boolean; completing: boolean }>;
}

export function emptyMarks(): LocalMarks {
  return { items: {}, titles: {} };
}

export function readMarks(): LocalMarks {
  try {
    const raw = window.localStorage.getItem(MARKS_KEY);
    if (!raw) return emptyMarks();
    const parsed = JSON.parse(raw) as Partial<LocalMarks>;
    return { items: parsed.items ?? {}, titles: parsed.titles ?? {} };
  } catch {
    return emptyMarks();
  }
}

export function writeMarks(marks: LocalMarks): void {
  try {
    window.localStorage.setItem(MARKS_KEY, JSON.stringify(marks));
  } catch {
    // best-effort
  }
}

export function clearMarks(): void {
  try {
    window.localStorage.removeItem(MARKS_KEY);
  } catch {
    // best-effort
  }
}

export function hasMarks(marks: LocalMarks): boolean {
  return Object.keys(marks.items).length > 0 || Object.keys(marks.titles).length > 0;
}
