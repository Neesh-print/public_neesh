import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClient } from '@/lib/supabase';
import { emailHtml, notify, sendEmail } from '@/lib/notify';
import { appUrl } from '@/lib/seo';
import { readSubmission, redirectWithNotice, tooManyRequests } from '@/lib/forms';
import { limitFormRequest } from '@/lib/rate-limit';
import { log } from '@/lib/log';

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
  const submission = await readSubmission(req);
  if (!submission.ok) return NextResponse.json({ ok: false }, { status: 400 });
  const { isForm, raw, trapped } = submission;

  const finish = () =>
    isForm ? redirectWithNotice(req, 'remove_request') : NextResponse.json({ ok: true });

  if (!(await limitFormRequest(req, 'remove-request'))) {
    return isForm ? finish() : tooManyRequests();
  }
  if (trapped) return finish();

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
    // Only real titles trigger an email; an unknown id is answered the same
    // way but sends nothing.
    if (!title) return finish();
    const titleName = title.name;
    const claimLink = appUrl(
      `/apply/publisher?title=${encodeURIComponent(titleName)}&claim=${title.slug}`
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
      `${email} asked to remove ${titleName} (/titles/${title.slug}).\n` +
        `They got the "are you sure" email; removal only on their reply.\n` +
        `To remove: npm run remove -- ${title.slug}`
    );
  } catch (err) {
    log('error', 'remove_request.failed', { error: err });
  }
  return finish();
}
