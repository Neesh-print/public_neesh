import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Minimal .env loader so scripts run outside Next without extra deps.
export function loadEnv(): void {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, '');
    }
  }
}

export function scriptServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.'
    );
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// Slug collisions get a numeric suffix from day one (spec 1.7). `taken` maps
// slug -> owner name; the same owner keeps its slug on re-import.
export function uniqueSlug(name: string, taken: Map<string, string>): string {
  const base = slugify(name) || 'untitled';
  let candidate = base;
  let suffix = 2;
  while (taken.has(candidate) && taken.get(candidate) !== name) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  taken.set(candidate, name);
  return candidate;
}

export function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
