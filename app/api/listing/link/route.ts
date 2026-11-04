import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { emailHtml, sendEmail } from '@/lib/notify';
import { readSubmission, redirectWithNotice, tooManyRequests } from '@/lib/forms';
import { limitFormRequest } from '@/lib/rate-limit';
import { siteUrl } from '@/lib/seo';
import { linkToken, normalizeEmail, ownedPublisherIds } from '@/lib/listing/server';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';

const schema = z.object({ email: z.email().max(320) });

// Step one of editing a listing: email a sign-in link to the address, but
// only when that address owns a claimed listing. Every outcome gets the same
// answer, so the form cannot be used to find out who owns what.
export async function POST(req: NextRequest) {
  const submission = await readSubmission(req);
  if (!submission.ok) return NextResponse.json({ ok: false }, { status: 400 });
  const { isForm, raw, trapped } = submission;
  const finish = () =>
    isForm ? redirectWithNotice(req, 'listing_link', '/listing') : NextResponse.json({ ok: true });

  if (!(await limitFormRequest(req, 'listing-link'))) return isForm ? finish() : tooManyRequests();
  if (trapped) return finish();

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return isForm ? redirectWithNotice(req, 'listing_bad_email', '/listing') : NextResponse.json({ ok: false }, { status: 400 });
  }
  const email = normalizeEmail(parsed.data.email);

  try {
    const owned = await ownedPublisherIds(email);
    if (owned.length === 0) {
      log('info', 'listing_link.no_listing');
      return finish();
    }
    const link = `${siteUrl()}/api/listing/session?t=${encodeURIComponent(linkToken(email))}`;
    const body =
      `Here's your link to edit your listing on the Neesh Index:\n\n` +
      `${link}\n\n` +
      `It works for 24 hours and keeps you signed in on this device for a week. ` +
      `If you didn't ask for it, ignore this email and nothing changes.`;
    await sendEmail({
      to: email,
      subject: 'Edit your Neesh Index listing',
      text: body,
      html: emailHtml(body, { [link]: 'Edit your listing' }),
      throttle: 6,
    });
  } catch (err) {
    log('error', 'listing_link.failed', { error: err });
  }
  return finish();
}
