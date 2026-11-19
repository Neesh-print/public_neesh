import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { canonical } from '@/lib/seo';
import { readToken } from '@/lib/collect/tokens';

export const dynamic = 'force-dynamic';

// One-tap unfollow from a new-issue email. The signed token names the
// reader and the title ("<user id>:<title id>"); the update goes through
// the state table so the trigger logs follow_removed like any other change.
export async function GET(req: NextRequest) {
  const subject = readToken(req.nextUrl.searchParams.get('t'), 'unfollow');
  const [userId, titleId] = subject?.split(':') ?? [];
  const done = new URL(canonical('/collect/following'));
  if (!userId || !titleId) {
    done.searchParams.set('unfollow', 'expired');
    return NextResponse.redirect(done, 303);
  }
  const { error } = await serviceClient()
    .from('collector_titles')
    .update({ following: false })
    .eq('user_id', userId)
    .eq('title_id', titleId);
  done.searchParams.set('unfollow', error ? 'failed' : 'done');
  return NextResponse.redirect(done, 303);
}
