import { NextRequest, NextResponse } from 'next/server';
import { anonClient, hasSupabaseEnv, serviceClient } from '@/lib/supabase';
import { limitRequest } from '@/lib/rate-limit';
import { LEVEL_RANK, type IssueAvailability, type ShopAvailability } from '@/lib/collect/shared';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface StoreRow {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  borough: string | null;
  country: string;
}

// Shops for the issues on a want list, labelled by what is actually known
// (spec: Availability). Title-level "carries" comes from the stockist lists;
// issue-level "reported" and "confirmed" from dated records. Expired records
// are read here (the public RLS hides them) so they can fall back a level
// with their date as history instead of vanishing. Home city first.
//
// Which issues and shops may be shown is decided by the public RLS: issues
// and stockist links are read with the anon key, so removed, rejected and
// excluded titles never come back. Only the dated records, for issues that
// passed that check, are read with the service role.
export async function GET(req: NextRequest) {
  if (!(await limitRequest(req, 'collect-availability', 60, 60))) {
    return NextResponse.json({ issues: [] }, { status: 429 });
  }
  const ids = (req.nextUrl.searchParams.get('issue_ids') ?? '')
    .split(',')
    .filter((id) => UUID_RE.test(id))
    .slice(0, 100);
  const homeCity = req.nextUrl.searchParams.get('city');
  if (ids.length === 0 || !hasSupabaseEnv) return NextResponse.json({ issues: [] });

  const supabase = serviceClient();
  const publicDb = anonClient();
  const { data: issues } = await publicDb
    .from('directory_issues')
    .select('id, title_id')
    .in('id', ids)
    .eq('removed', false)
    .is('merged_into', null);
  const titleIds = [...new Set((issues ?? []).map((i) => i.title_id as string))];
  const visibleIds = (issues ?? []).map((i) => i.id as string);
  if (visibleIds.length === 0) return NextResponse.json({ issues: [] });

  const [stockistRes, recordRes] = await Promise.all([
    titleIds.length
      ? publicDb
          .from('v_title_stockists')
          .select('title_id, store_slug, store_name, city, borough, city_slug, list_scope')
          .in('title_id', titleIds)
          .limit(5000)
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from('directory_issue_availability')
      .select('issue_id, store_id, level, observed_on, expires_on')
      .in('issue_id', visibleIds)
      .order('observed_on', { ascending: false }),
  ]);

  const stockists = (stockistRes.data ?? []) as {
    title_id: string;
    store_slug: string;
    store_name: string;
    city: string | null;
    borough: string | null;
    city_slug: string | null;
    list_scope: 'title' | 'publisher';
  }[];
  const records = (recordRes.data ?? []) as {
    issue_id: string;
    store_id: string;
    level: 'reported' | 'confirmed';
    observed_on: string;
    expires_on: string;
  }[];

  // Store ids and details for every shop either source names.
  const slugs = [...new Set(stockists.map((s) => s.store_slug))];
  const recordStoreIds = [...new Set(records.map((r) => r.store_id))];
  const [bySlugRes, byIdRes] = await Promise.all([
    slugs.length
      ? supabase.from('directory_stores').select('id, slug, name, city, borough, country').in('slug', slugs)
      : Promise.resolve({ data: [] as StoreRow[] }),
    recordStoreIds.length
      ? supabase.from('directory_stores').select('id, slug, name, city, borough, country').in('id', recordStoreIds)
      : Promise.resolve({ data: [] as StoreRow[] }),
  ]);
  const storeBySlug = new Map(((bySlugRes.data ?? []) as StoreRow[]).map((s) => [s.slug, s]));
  const storeById = new Map(((byIdRes.data ?? []) as StoreRow[]).map((s) => [s.id, s]));
  const citySlugByName = new Map(stockists.filter((s) => s.city_slug).map((s) => [s.city, s.city_slug]));

  const today = new Date().toISOString().slice(0, 10);
  const result: IssueAvailability[] = [];

  for (const issue of issues ?? []) {
    const shops = new Map<string, ShopAvailability>();

    for (const s of stockists.filter((row) => row.title_id === issue.title_id)) {
      const seen = shops.get(s.store_slug);
      // Prefer the title-specific link when a shop is on both lists.
      if (seen && !(seen.publisher_wide && s.list_scope === 'title')) continue;
      shops.set(s.store_slug, {
        store_id: storeBySlug.get(s.store_slug)?.id ?? null,
        store_slug: s.store_slug,
        store_name: s.store_name,
        city: s.city,
        city_slug: s.city_slug,
        borough: s.borough,
        level: 'carries',
        publisher_wide: s.list_scope === 'publisher',
        observed_on: null,
        last_reported_on: null,
      });
    }

    // Records arrive newest first; the first live record per shop wins.
    for (const r of records.filter((row) => row.issue_id === issue.id)) {
      const store = storeById.get(r.store_id);
      if (!store) continue;
      const live = r.expires_on >= today;
      const current = shops.get(store.slug);
      if (live) {
        if (current && current.observed_on && LEVEL_RANK[current.level] <= LEVEL_RANK[r.level]) continue;
        shops.set(store.slug, {
          store_id: store.id,
          store_slug: store.slug,
          store_name: store.name,
          city: store.city,
          city_slug: store.city ? citySlugByName.get(store.city) ?? null : null,
          borough: store.borough,
          level: r.level,
          publisher_wide: false,
          observed_on: r.observed_on,
          last_reported_on: null,
        });
      } else if (!current) {
        shops.set(store.slug, {
          store_id: store.id,
          store_slug: store.slug,
          store_name: store.name,
          city: store.city,
          city_slug: store.city ? citySlugByName.get(store.city) ?? null : null,
          borough: store.borough,
          level: 'lapsed',
          publisher_wide: false,
          observed_on: null,
          last_reported_on: r.observed_on,
        });
      } else if (current.level === 'carries' && !current.last_reported_on) {
        current.last_reported_on = r.observed_on;
      }
    }

    const list = [...shops.values()].sort((a, b) => {
      const homeA = homeCity && a.city_slug === homeCity ? 0 : 1;
      const homeB = homeCity && b.city_slug === homeCity ? 0 : 1;
      if (homeA !== homeB) return homeA - homeB;
      if (LEVEL_RANK[a.level] !== LEVEL_RANK[b.level]) return LEVEL_RANK[a.level] - LEVEL_RANK[b.level];
      if (a.publisher_wide !== b.publisher_wide) return a.publisher_wide ? 1 : -1;
      return a.store_name.localeCompare(b.store_name, 'en', { sensitivity: 'base' });
    });
    result.push({ issue_id: issue.id as string, shops: list });
  }

  return NextResponse.json({ issues: result });
}
