import { NextRequest, NextResponse } from 'next/server';
import { anonClient, hasSupabaseEnv, serviceClient } from '@/lib/supabase';
import { clientIp, ipHash, isBot } from '@/lib/signals';
import { limitRequest } from '@/lib/rate-limit';
import { log } from '@/lib/log';
import { isUnreviewedReaderRecord } from '@/lib/collect/shared';

export const dynamic = 'force-dynamic';

// "Visit publisher" routes through here so outbound clicks are countable and
// the link still works with JS off (spec 8). Logs, then 302s.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!hasSupabaseEnv) return NextResponse.redirect(new URL('/index', req.url), 302);

  // Anon lookup: RLS means removed or excluded titles never redirect.
  const { data: title } = await anonClient()
    .from('directory_titles')
    .select('id, slug, created_from, review_status, publisher:directory_publishers!inner(website)')
    .eq('slug', slug)
    .eq('removed', false)
    .in('status', ['active', 'dormant'])
    .maybeSingle();

  if (!title) return NextResponse.redirect(new URL('/index', req.url), 302);

  // The website on an unreviewed reader-added title is whatever the reader
  // typed. Until a person approves it, neesh.art does not redirect there.
  if (isUnreviewedReaderRecord(title)) {
    return NextResponse.redirect(new URL(`/titles/${title.slug}`, req.url), 302);
  }

  // Over the limit the redirect still works; the click just is not counted.
  const ua = req.headers.get('user-agent');
  if (!isBot(ua) && (await limitRequest(req, 'out', 60, 60))) {
    try {
      await serviceClient().from('directory_demand_signals').insert({
        title_id: title.id,
        signal_type: 'outbound_click',
        payload: {},
        ip_hash: ipHash(clientIp(req.headers)),
        user_agent: ua ? ua.slice(0, 500) : null,
      });
    } catch (err) {
      log('error', 'outbound_click.log_failed', { error: err });
    }
  }

  const website = (title.publisher as unknown as { website: string | null })?.website;
  const destination =
    website && /^https?:\/\//.test(website)
      ? website
      : new URL(`/titles/${title.slug}`, req.url).toString();
  return NextResponse.redirect(destination, 302);
}
