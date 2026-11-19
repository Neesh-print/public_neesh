import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { emailText, planEmail, planFigures } from '@/lib/calculator/email';
import { BASE, type Plan } from '@/lib/calculator/model';
import { PlanSchema } from '@/lib/calculator/share';
import { longShareUrl, newShareId, shortShareUrl } from '@/lib/calculator/server';
import { emailHtml, sendEmail } from '@/lib/notify';
import { canonical } from '@/lib/seo';
import { clientIp, ipHash, isBot } from '@/lib/signals';
import { serviceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// "Email me this plan" on /calculator. Validates the plan, recomputes the
// four figures and the verdict on the server, stores a row in
// calculator_plans, adds the address to the newsletter list when asked,
// and sends the plan by email through Resend. The confirmation line on the
// page depends on `sent`, so the reader is only told it is in their inbox
// when Resend accepted it.

const utm = z.string().max(200).optional();

const bodySchema = z.object({
  email: z.string().email().max(320),
  name: z.string().max(80).optional(),
  plan: PlanSchema,
  newsletter: z.boolean().optional(),
  utm: z
    .object({ source: utm, medium: utm, campaign: utm, term: utm, content: utm })
    .partial()
    .optional(),
  firstTouch: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  if (isBot(req.headers.get('user-agent'))) return NextResponse.json({ ok: false }, { status: 400 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const { email, name, newsletter = false } = parsed.data;
  const plan = { ...BASE, ...parsed.data.plan } as Plan;
  const figures = planFigures(plan);
  // The short link points at the stored row. If storing fails the email
  // still goes out, with the plan packed into the link instead.
  const shareId = newShareId();
  let shareUrl = shortShareUrl(shareId);

  // Store first, so a failed send still leaves the request on record.
  try {
    const supabase = serviceClient();
    const { error } = await supabase.from('calculator_plans').insert({
      kind: 'email',
      share_id: shareId,
      email,
      plan_name: name ?? null,
      plan,
      profit: figures.profit,
      profit_confirmed: figures.profitConfirmed,
      cash_needed: figures.cashNeeded,
      break_even_copies: figures.breakEvenCopies,
      verdict: figures.verdict,
      share_url: shareUrl,
      newsletter_opt_in: newsletter,
      utm_source: parsed.data.utm?.source ?? null,
      utm_medium: parsed.data.utm?.medium ?? null,
      utm_campaign: parsed.data.utm?.campaign ?? null,
      utm_term: parsed.data.utm?.term ?? null,
      utm_content: parsed.data.utm?.content ?? null,
      first_touch: parsed.data.firstTouch ?? null,
      ip_hash: ipHash(clientIp(req.headers)),
      user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
    });
    if (error) {
      console.error('calculator_plans insert failed', error.message);
      shareUrl = longShareUrl(plan, name);
    }

    if (newsletter) {
      // Same list as the newsletter form. A unique-email conflict means
      // already subscribed, which is fine.
      const { error: subError } = await supabase
        .from('mailing_list_subscribers')
        .insert({ email, source: 'calculator' });
      if (subError && subError.code !== '23505') console.error('mailing list insert failed', subError.message);
    }
  } catch (err) {
    console.error('calculator email: store failed', err);
    shareUrl = longShareUrl(plan, name);
  }

  const mail = planEmail(plan, name, { shareUrl, claimUrl: canonical('/auth/publisher') });
  const sent = await sendEmail({ to: email, subject: mail.subject, text: emailText(mail.text), html: emailHtml(mail.text) });
  return NextResponse.json({ ok: sent, sent });
}
