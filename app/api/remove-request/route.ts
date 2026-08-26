import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClient } from '@/lib/supabase';
import { emailHtml, notify, sendEmail } from '@/lib/notify';
import { appUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const removeSchema = z.object({
  title_id: z.string().uuid(),
  email: z.string().email().max(320),
});

// Removal request from a title profile. Nothing comes down here: the
// requester gets an "are you sure" email that makes the case for keeping
// (or claiming) the page, and removal only happens once they reply to
// confirm. The admin is notified so the reply has somewhere to land.
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
      const url = referer ? new URL(referer) : new URL('/index', req.url);
      url.searchParams.set('submitted', 'remove_request');
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ ok: true });
  };

  const parsed = removeSchema.safeParse(raw);
  if (!parsed.success) {
    return isForm ? finish() : NextResponse.json({ ok: false }, { status: 400 });
  }
  const { title_id, email } = parsed.data;

  try {
    const supabase = serviceClient();
    const { data: title } = await supabase
      .from('directory_titles')
      .select('name, slug')
      .eq('id', title_id)
      .maybeSingle();
    const titleName = title?.name ?? 'your title';
    const claimLink = appUrl(
      `/apply/publisher?title=${encodeURIComponent(titleName)}&claim=${title?.slug ?? ''}`
    );

    const body =
      `Hi,\n\n` +
      `We got your request to remove **${titleName}** from the Neesh Index.\n\n` +
      `Before we do, here's what the page does for you. It's how shops, cafés, ` +
      `and hotels in 30+ countries find titles to stock. It costs nothing, and ` +
      `if you claim it you control every word on it.\n\n` +
      `**Claim ${titleName} instead:** ${claimLink}\n\n` +
      `Still want it gone? Reply "remove" to this email and the page comes down ` +
      `the same day.`;
    await sendEmail({
      to: email,
      subject: `Before we take down ${titleName}`,
      text: body.replace(/\*\*/g, ''),
      html: emailHtml(body),
    });

    await notify(
      `Removal request: ${titleName}`,
      `${email} asked to remove ${titleName} (/titles/${title?.slug ?? title_id}).\n` +
        `They got the "are you sure" email; removal only on their reply.\n` +
        `To remove: npm run remove -- ${title?.slug ?? title_id}`
    );
  } catch (err) {
    console.error('remove request failed', err);
  }
  return finish();
}
