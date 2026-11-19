import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClient } from '@/lib/supabase';
import { emailHtml, sendEmail } from '@/lib/notify';
import { isBot } from '@/lib/signals';
import { siteUrl } from '@/lib/seo';
import { limitFormRequest } from '@/lib/rate-limit';
import { safeNextPath } from '@/lib/collect/shared';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email().max(320),
  newsletter: z.boolean().optional().default(false),
  next: z.string().max(500).optional(),
});

// Reader sign-in by magic link. The link is generated with the Supabase
// admin API and sent from Neesh through Resend, so the copy is the reader's
// own (the project's Supabase email templates belong to spaces and
// publishers). New accounts carry role = 'reader', which keeps them out of
// public.users and public.profiles (see handle_new_user). The browser
// verifies the token at /collect/auth and claims any marks on the device.
export async function POST(req: NextRequest) {
  if (isBot(req.headers.get('user-agent'))) return NextResponse.json({ ok: true });
  // Sends mail to whatever address is typed in, so it shares the public
  // form limits, and each address gets at most 6 sign-in links a day.
  if (!(await limitFormRequest(req, 'collect-auth'))) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const email = parsed.data.email.trim().toLowerCase();
  const next = safeNextPath(parsed.data.next);

  try {
    const { data, error } = await serviceClient().auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { data: { role: 'reader' } },
    });
    if (error || !data.properties?.hashed_token) {
      log('error', 'collect_auth.generate_link_failed', { error: error?.message });
      return NextResponse.json({ ok: false }, { status: 502 });
    }
    const link = new URL('/collect/auth', siteUrl());
    link.searchParams.set('token_hash', data.properties.hashed_token);
    link.searchParams.set('type', 'magiclink');
    link.searchParams.set('next', next);
    if (parsed.data.newsletter) link.searchParams.set('nl', '1');

    const body =
      `Here's your link to sign in to your collection on Neesh:\n\n` +
      `${link.toString()}\n\n` +
      `It works once. If you didn't ask for it, ignore this email and nothing happens.`;
    await sendEmail({
      to: email,
      subject: 'Your sign-in link for Neesh',
      text: body,
      html: emailHtml(body, { [link.toString()]: 'Sign in to Neesh' }),
      throttle: 6,
    });
  } catch (err) {
    log('error', 'collect_auth.failed', { error: err });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
