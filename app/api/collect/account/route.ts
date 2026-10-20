import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { readerFromRequest } from '@/lib/collect/server';

export const dynamic = 'force-dynamic';

// Delete a reader's account from settings. Deleting the auth user cascades
// to collectors and from there to the collection, follows and alert
// requests; events keep their counts with user_id set to null. Accounts
// that also belong to a space or publisher (a public.users row) are not
// deleted here, only their reader data, so a shop's login survives.
export async function DELETE(req: NextRequest) {
  const reader = await readerFromRequest(req);
  if (!reader) return NextResponse.json({ ok: false }, { status: 401 });
  const supabase = serviceClient();
  try {
    const { data: platformUser } = await supabase.from('users').select('id').eq('id', reader.id).maybeSingle();
    if (platformUser) {
      const { error } = await supabase.from('collectors').delete().eq('user_id', reader.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.auth.admin.deleteUser(reader.id);
      if (error) throw new Error(error.message);
    }
  } catch (err) {
    console.error('collect account delete failed', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
