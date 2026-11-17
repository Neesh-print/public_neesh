import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClient } from '@/lib/supabase';
import { emailHtml, notify, sendEmail } from '@/lib/notify';
import { domainMatch, readSubmission, redirectWithNotice, tooManyRequests } from '@/lib/forms';
import { limitFormRequest } from '@/lib/rate-limit';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';

const claimSchema = z.object({
  publisher_id: z.string().uuid(),
  title_id: z.string().uuid().optional(),
  email: z.string().email().max(320),
  name: z.string().max(200).optional(),
  message: z.string().max(4000).optional(),
});

// Claim submission (spec 1.2): writes a row to directory_claims, then sends
// email 1.1a to the claimant and 1.1b to the admin (handoff 5.3). Approval
// is manual, via npm run approve, which sends email 1.2.
export async function POST(req: NextRequest) {
  const submission = await readSubmission(req);
  if (!submission.ok) return NextResponse.json({ ok: false }, { status: 400 });
  const { isForm, raw, trapped } = submission;

  const finish = () =>
    isForm ? redirectWithNotice(req, 'claim') : NextResponse.json({ ok: true });

  if (!(await limitFormRequest(req, 'claim'))) {
    return isForm ? finish() : tooManyRequests();
  }
  if (trapped) return finish();

  const parsed = claimSchema.safeParse(raw);
  if (!parsed.success) {
    return isForm ? finish() : NextResponse.json({ ok: false }, { status: 400 });
  }
  const { publisher_id, title_id, email, name, message } = parsed.data;

  try {
    const supabase = serviceClient();
    const { error } = await supabase
      .from('directory_claims')
      .insert({ publisher_id, email, name, message });
    if (error) {
      log('error', 'claim.insert_failed', { error: error.message });
      return finish();
    }

    const [{ data: publisher }, { data: title }] = await Promise.all([
      supabase
        .from('directory_publishers')
        .select('id, name, slug, website')
        .eq('id', publisher_id)
        .maybeSingle(),
      title_id
        ? supabase
            .from('directory_titles')
            .select('name, slug')
            .eq('id', title_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const titleName = title?.name ?? publisher?.name ?? 'your title';

    // 1.1a, to the claimant, immediately
    const claimantBody =
      `Hi,\n\n` +
      `Thanks for claiming **${titleName}**. A person reviews these, usually ` +
      `within a day. We'll email you when it's live.\n\n` +
      `If you'd rather the page came down instead of being claimed, reply and ` +
      `it's gone today.`;
    await sendEmail({
      to: email,
      subject: `We got your claim for ${titleName}`,
      text: claimantBody.replace(/\*\*/g, ''),
      html: emailHtml(claimantBody),
    });

    // 1.1b, to admin, immediately
    await notify(
      `Claim: ${titleName} by ${publisher?.name ?? publisher_id}`,
      `${name ?? 'no name given'} · ${email}\n` +
        `Publisher: ${publisher?.name ?? '?'} · ${publisher?.website ?? 'no website on file'}\n` +
        `Domain match: ${domainMatch(email, publisher?.website ?? null) ? 'yes' : 'no'}\n` +
        `Message: ${message ?? ''}\n\n` +
        `Approve in Supabase: directory_publishers → ${publisher_id} → claimed = true\n` +
        `Or run: npm run approve -- ${publisher?.slug ?? publisher_id} (flips the flag, ` +
        `resolves the claim, and sends the approval email)`
    );
  } catch (err) {
    log('error', 'claim.failed', { error: err });
  }
  return finish();
}
