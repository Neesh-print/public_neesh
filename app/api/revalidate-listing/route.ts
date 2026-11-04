import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { serviceClient } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';

// Refreshes the Index after a publisher edits their listing in the Neesh
// portal. The portal's index-listing edge function calls this with the
// publisher's own Supabase access token, so no shared secret is needed: the
// token must belong to a user who owns a claimed listing. A title shows up
// on niche, catalog, city and store pages, so the whole tree is refreshed;
// edits are rare.
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
    revalidatePath('/', 'layout');
    log('info', 'revalidate_listing.done');
    return NextResponse.json({ ok: true });
  } catch (err) {
    log('error', 'revalidate_listing.failed', { error: err });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
