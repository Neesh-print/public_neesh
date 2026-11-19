import { NextRequest, NextResponse } from 'next/server';
import { isGone, type ProfileFlags } from '@/lib/gone';

// Removed and excluded profiles must return 410 Gone, not 404 (spec 6.3).
// App Router pages cannot set a 410 status, so this middleware checks the
// flags and rewrites to the /gone route handler. It runs only on the two
// profile path shapes, fails open on any error or on a lookup slower than
// LOOKUP_TIMEOUT_MS, and at directory scale one indexed lookup per profile
// request is acceptable. If traffic outgrows that, swap the lookup for an
// Edge Config or KV list of removed slugs.
export const config = {
  matcher: ['/titles/:slug', '/publishers/:slug'],
};

const LOOKUP_TIMEOUT_MS = 2500;

export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.next();

  const [, kind, slug] = req.nextUrl.pathname.split('/');
  if (!slug) return NextResponse.next();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const isTitle = kind === 'titles';
    const table = isTitle ? 'directory_titles' : 'directory_publishers';
    const select = isTitle
      ? 'removed,status,review_status,merged_into,publisher:directory_publishers(removed,eligible)'
      : 'removed,eligible,review_status,merged_into';
    const res = await fetch(
      `${url}/rest/v1/${table}?slug=eq.${encodeURIComponent(slug)}&select=${encodeURIComponent(select)}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: controller.signal }
    );
    if (!res.ok) return NextResponse.next();
    const rows: ProfileFlags[] = await res.json();
    if (rows.length === 0) return NextResponse.next(); // unknown slug: let the page 404

    const row = rows[0];

    // A merged duplicate points at the record it was merged into.
    if (row.merged_into) {
      const target = await fetch(
        `${url}/rest/v1/${table}?id=eq.${encodeURIComponent(row.merged_into)}&select=slug`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: controller.signal }
      );
      const [merged] = target.ok ? ((await target.json()) as { slug: string }[]) : [];
      if (merged?.slug) return NextResponse.redirect(new URL(`/${kind}/${merged.slug}`, req.url), 301);
    }
    if (isGone(isTitle ? 'titles' : 'publishers', row)) {
      return NextResponse.rewrite(new URL('/gone', req.url));
    }
  } catch {
    // fail open: serving the page beats blocking on the check
  } finally {
    clearTimeout(timer);
  }
  return NextResponse.next();
}
