import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClient } from '@/lib/supabase';
import { notify } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const claimSchema = z.object({
  publisher_id: z.string().uuid(),
  email: z.string().email().max(320),
  name: z.string().max(200).optional(),
  message: z.string().max(4000).optional(),
});

// Claim submission (spec 1.2). v1 is manual: this writes a row to
// directory_claims and emails the admin. Approval happens by hand in the
// Supabase dashboard. Claimed state is a badge and a relationship, not an
// editing surface.
export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? '';
  const isForm =
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data');

  let raw: unknown;
  try {
    if (isForm) {
      const fd = await req.formData();
      const entries: Record<string, string> = {};
      for (const [k, v] of fd.entries()) {
        if (typeof v === 'string' && v.trim() !== '') entries[k] = v.trim();
      }
      raw = entries;
    } else {
      raw = await req.json();
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const finish = () => {
    if (isForm) {
      const referer = req.headers.get('referer');
      const url = referer ? new URL(referer) : new URL('/directory', req.url);
      url.searchParams.set('submitted', 'claim');
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ ok: true });
  };

  const parsed = claimSchema.safeParse(raw);
  if (!parsed.success) {
    return isForm ? finish() : NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const supabase = serviceClient();
    const { error } = await supabase.from('directory_claims').insert(parsed.data);
    if (error) {
      console.error('claim insert failed', error.message);
      return finish();
    }
    const { data: publisher } = await supabase
      .from('directory_publishers')
      .select('name, slug, website')
      .eq('id', parsed.data.publisher_id)
      .maybeSingle();
    await notify(
      `Directory claim for ${publisher?.name ?? parsed.data.publisher_id}`,
      `Claim submitted for ${publisher?.name ?? 'unknown publisher'} ` +
        `(/publishers/${publisher?.slug ?? '?'})\n` +
        `Publisher website on file is ${publisher?.website ?? 'none'}\n\n` +
        `From ${parsed.data.name ?? 'no name given'} <${parsed.data.email}>\n\n` +
        `${parsed.data.message ?? ''}\n\n` +
        `Approve by setting claimed = true on the publisher row in Supabase ` +
        `and marking the claim approved.`
    );
  } catch (err) {
    console.error('claim failed', err);
  }
  return finish();
}
