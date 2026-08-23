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

export function coverPublicUrl(coverImagePath: string | null): string | null {
  if (!coverImagePath || !url) return null;
  return `${url}/storage/v1/object/public/covers/${coverImagePath.replace(/^covers\//, '')}`;
}
