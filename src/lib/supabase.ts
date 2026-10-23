import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseEnv = Boolean(url && anonKey);

// Every Supabase call gets a deadline so a stalled database fails the
// request (error page, or the route's own fallback) instead of hanging the
// function until the platform kills it. Generous enough for the large paged
// reads that run during static generation.
const REQUEST_TIMEOUT_MS = 15_000;

const fetchWithTimeout: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) });

const options = { auth: { persistSession: false }, global: { fetch: fetchWithTimeout } };

// Public reads. RLS enforces the visibility predicate on top of the explicit
// filters in queries.ts.
export function anonClient(): SupabaseClient {
  if (!url || !anonKey) throw new Error('Supabase env missing');
  return createClient(url, anonKey, options);
}

// Server-side writes only (signal ingest, claims). Never import from a
// client component.
export function serviceClient(): SupabaseClient {
  if (!url || !serviceKey) throw new Error('Supabase service env missing');
  return createClient(url, serviceKey, options);
}

export function coverPublicUrl(coverImagePath: string | null): string | null {
  if (!coverImagePath || !url) return null;
  return `${url}/storage/v1/object/public/covers/${coverImagePath.replace(/^covers\//, '')}`;
}
