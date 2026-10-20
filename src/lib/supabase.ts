import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseEnv = Boolean(url && anonKey);

// Public reads. RLS enforces the visibility predicate on top of the explicit
// filters in queries.ts.
export function anonClient(): SupabaseClient {
  if (!url || !anonKey) throw new Error('Supabase env missing');
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

// Server-side writes only (signal ingest, claims). Never import from a
// client component.
export function serviceClient(): SupabaseClient {
  if (!url || !serviceKey) throw new Error('Supabase service env missing');
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

// Reader cover uploads sit in the private reader-uploads bucket until a
// review approves them and moves them into covers, so they have no public
// URL before then.
export function coverPublicUrl(coverImagePath: string | null): string | null {
  if (!coverImagePath || !url || coverImagePath.startsWith('reader-uploads/')) return null;
  // Issues seeded from the platform or a checked CSV can point at a full URL.
  if (/^https?:\/\//.test(coverImagePath)) return coverImagePath;
  return `${url}/storage/v1/object/public/covers/${coverImagePath.replace(/^covers\//, '')}`;
}
