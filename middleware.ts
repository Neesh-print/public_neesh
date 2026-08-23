import { NextRequest, NextResponse } from 'next/server';

// Removed and excluded profiles must return 410 Gone, not 404 (spec 6.3).
// App Router pages cannot set a 410 status, so this middleware checks the
// flags and rewrites to the /gone route handler. It runs only on the two
// profile path shapes, fails open on any error, and at directory scale one
// indexed lookup per profile request is acceptable. If traffic outgrows
// that, swap the lookup for an Edge Config or KV list of removed slugs.
export const config = {
  matcher: ['/titles/:slug', '/publishers/:slug'],
};

export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.next();

  const [, kind, slug] = req.nextUrl.pathname.split('/');
  if (!slug) return NextResponse.next();

  try {
    const isTitle = kind === 'titles';
    const table = isTitle ? 'directory_titles' : 'directory_publishers';
    const select = isTitle
      ? 'removed,status,publisher:directory_publishers(removed,eligible)'
      : 'removed,eligible';
    const res = await fetch(
      `${url}/rest/v1/${table}?slug=eq.${encodeURIComponent(slug)}&select=${encodeURIComponent(select)}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) return NextResponse.next();
    const rows: Array<{
      removed?: boolean;
      status?: string;
      eligible?: boolean;
      publisher?: { removed?: boolean; eligible?: boolean } | null;
    }> = await res.json();
    if (rows.length === 0) return NextResponse.next(); // unknown slug: let the page 404

    const row = rows[0];
    const gone = isTitle
      ? Boolean(
          row.removed ||
            row.status === 'ceased' ||
            row.publisher?.removed ||
            row.publisher?.eligible === false
        )
      : Boolean(row.removed || row.eligible === false);
    if (gone) return NextResponse.rewrite(new URL('/gone', req.url));
  } catch {
    // fail open: serving the page beats blocking on the check
  }
  return NextResponse.next();
}
