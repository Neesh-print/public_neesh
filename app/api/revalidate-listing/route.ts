import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { serviceClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { log } from '@/lib/log';
import { NICHE_PAGINATION_ROUTE, listingPaths, loadListingRows } from '@/lib/listing-paths';

export const dynamic = 'force-dynamic';

// Refreshes the Index after a publisher edits their listing in the Neesh
// portal. The portal's index-listing edge function calls this with the
// publisher's own Supabase access token, so no shared secret is needed: the
// token must belong to a user who owns a claimed listing. Only the pages the
// publisher's listing appears on are refreshed (see listing-paths.ts): their
// publisher, title and order pages, their niches, the stores that list them
// and those stores' cities. If that lookup fails, it falls back to the whole
// tree, as before.
export async function POST(req: NextRequest) {
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const db = serviceClient();
    const { data, error } = await db.auth.getUser(jwt);
    if (error || !data.user) return NextResponse.json({ ok: false }, { status: 401 });
    if (!(await rateLimit(`revalidate-listing:${data.user.id}`, 30, 600))) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }
    const { data: owned } = await db.rpc('directory_owned_publisher_ids', { p_user: data.user.id });
    if (!Array.isArray(owned) || owned.length === 0) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    // The RPC returns uuids, or rows keyed by the function name.
    const publisherIds = (owned as unknown[])
      .map((row) =>
        typeof row === 'string' ? row : (row as Record<string, string>)?.directory_owned_publisher_ids
      )
      .filter((id): id is string => typeof id === 'string');

    try {
      const paths = listingPaths(await loadListingRows(db, publisherIds));
      for (const path of paths) revalidatePath(path);
      revalidatePath(NICHE_PAGINATION_ROUTE, 'page');
      log('info', 'revalidate_listing.done', { pages: paths.length });
      return NextResponse.json({ ok: true, pages: paths.length });
    } catch (err) {
      log('warn', 'revalidate_listing.targeted_failed', { error: err });
      revalidatePath('/', 'layout');
      log('info', 'revalidate_listing.done', { pages: 'all' });
      return NextResponse.json({ ok: true, pages: 'all' });
    }
  } catch (err) {
    log('error', 'revalidate_listing.failed', { error: err });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
