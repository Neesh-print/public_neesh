import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { emailHtml, sendEmail } from '@/lib/notify';
import { canonical } from '@/lib/seo';
import { readerFromRequest } from '@/lib/collect/server';
import { makeToken, readToken } from '@/lib/collect/tokens';

export const dynamic = 'force-dynamic';

// Account deletion, confirmed by email. POST (signed in) emails a one-day
// link to /collect/delete; DELETE with that link's token does it.
//
// Deleting the auth user cascades to collectors and from there to the
// collection, follows and alert requests; events keep their counts with
// user_id set to null. Accounts that also belong to a space or publisher (a
// public.users row) keep their login and lose only their reader data.

export async function POST(req: NextRequest) {
  const reader = await readerFromRequest(req);
  if (!reader?.email) return NextResponse.json({ ok: false }, { status: 401 });
  const link = `${canonical('/collect/delete')}?t=${encodeURIComponent(makeToken('delete', reader.id, 1))}`;
  const body =
    `You asked to delete your collection on Neesh.\n\n` +
    `Confirm here: ${link}\n\n` +
    `This removes your shelf, wants, follows and alerts, and can't be undone. ` +
    `The link works for 24 hours. If you didn't ask, ignore this email and nothing changes.`;
  await sendEmail({
    to: reader.email,
    subject: 'Confirm deleting your collection on Neesh',
    text: body,
    html: emailHtml(body, { [link]: 'Delete my collection' }),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = readToken(req.nextUrl.searchParams.get('t'), 'delete');
  if (!userId) return NextResponse.json({ ok: false, error: 'expired' }, { status: 401 });
  const supabase = serviceClient();
  try {
    const { data: platformUser } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
    if (platformUser) {
      const { error } = await supabase.from('collectors').delete().eq('user_id', userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error && !/not found/i.test(error.message)) throw new Error(error.message);
    }
  } catch (err) {
    console.error('collect account delete failed', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
