import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClient } from '@/lib/supabase';
import { echoSafe, emailHtml, notify, sendEmail } from '@/lib/notify';
import { readSubmission, redirectWithNotice, tooManyRequests } from '@/lib/forms';
import { limitFormRequest } from '@/lib/rate-limit';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';

const suggestSchema = z.object({
  title_name: z.string().min(1).max(200),
  publisher_website: z.string().url().max(500).optional(),
  email: z.string().email().max(320),
  role: z.enum(['space', 'reader']),
});

// The non-publisher branch of Add a title: store the suggestion, tell the
// admin, and confirm to the suggester. Nothing goes live without review.
export async function POST(req: NextRequest) {
  const submission = await readSubmission(req);
  if (!submission.ok) return NextResponse.json({ ok: false }, { status: 400 });
  const { isForm, raw, trapped } = submission;

  const finish = () =>
    isForm ? redirectWithNotice(req, 'suggestion', '/add-title') : NextResponse.json({ ok: true });

  if (!(await limitFormRequest(req, 'suggest-title'))) {
    return isForm ? finish() : tooManyRequests();
  }
  if (trapped) return finish();

  const parsed = suggestSchema.safeParse(raw);
  if (!parsed.success) {
    return isForm ? finish() : NextResponse.json({ ok: false }, { status: 400 });
  }
  const { title_name, publisher_website, email, role } = parsed.data;

  try {
    const supabase = serviceClient();
    const { error } = await supabase.from('directory_suggestions').insert({
      title_name,
      publisher_website: publisher_website ?? null,
      email,
      role,
    });
    if (error) {
      log('error', 'suggestion.insert_failed', { error: error.message });
      return finish();
    }

    // The title name is whatever the visitor typed, so it is echoed only
    // when it is plain words and never goes in the subject.
    const echoed = echoSafe(title_name, '');
    const body =
      `Hi,\n\n` +
      `Thanks for suggesting ${echoed ? `**${echoed}**` : 'a title'} for the Neesh Index. A person ` +
      `checks every suggestion; if it fits, it's usually live within a couple ` +
      `of days and we'll email you the page.\n\n` +
      `That's the only reason we'll email you.`;
    await sendEmail({
      to: email,
      subject: 'Got it, your suggestion is in the queue',
      text: body.replace(/\*\*/g, ''),
      html: emailHtml(body),
    });

    await notify(
      `Title suggestion: ${title_name}`,
      `${email} (${role}) suggested ${title_name}.\n` +
        `Website: ${publisher_website ?? 'not given'}\n\n` +
        `If it fits, add it via the import script and mark the suggestion ` +
        `status 'added' in directory_suggestions; they get emailed the page.`
    );
  } catch (err) {
    log('error', 'suggestion.failed', { error: err });
  }
  return finish();
}
