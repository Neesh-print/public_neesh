import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClient } from '@/lib/supabase';
import { echoSafe, emailHtml, notify, sendEmail } from '@/lib/notify';
import { domainMatch, readSubmission, redirectWithNotice, tooManyRequests } from '@/lib/forms';
import { limitFormRequest } from '@/lib/rate-limit';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';

const claimSchema = z.object({
  store_id: z.string().uuid(),
  email: z.string().email().max(320),
  name: z.string().max(200).optional(),
  role: z.string().max(120).optional(),
  website: z.string().url().max(500).optional(),
  message: z.string().max(4000).optional(),
});

// Store claim (stockists spec, Phase 2), mirroring the publisher claim: store
// the claim privately, confirm to the claimant, tell the admin. Approval is
// manual: npm run approve-store -- {store-slug}.
export async function POST(req: NextRequest) {
  const submission = await readSubmission(req);
  if (!submission.ok) return NextResponse.json({ ok: false }, { status: 400 });
  const { isForm, raw, trapped } = submission;

  const finish = () =>
    isForm ? redirectWithNotice(req, 'store_claim') : NextResponse.json({ ok: true });

  if (!(await limitFormRequest(req, 'claim-store'))) {
    return isForm ? finish() : tooManyRequests();
  }
  if (trapped) return finish();

  const parsed = claimSchema.safeParse(raw);
  if (!parsed.success) {
    return isForm ? finish() : NextResponse.json({ ok: false }, { status: 400 });
  }
  const { store_id, email, name, role, website, message } = parsed.data;

  try {
    const supabase = serviceClient();
    const { data: store } = await supabase
      .from('directory_stores')
      .select('id, slug, name, city, country, website, claimed')
      .eq('id', store_id)
      .maybeSingle();
    if (!store) return finish();

    const { error } = await supabase.from('directory_store_claims').insert({
      store_id,
      email,
      name: name ?? null,
      role: role ?? null,
      website: website ?? null,
      message: message ?? null,
    });
    if (error) {
      log('error', 'store_claim.insert_failed', { error: error.message });
      return finish();
    }

    const greetingName = echoSafe(name, '', 60);
    const claimantBody =
      `Hi${greetingName ? ` ${greetingName}` : ''},\n\n` +
      `Thanks for claiming **${store.name}** on the Neesh Index. A person checks ` +
      `every claim, usually within a day, and we'll email you when the page is yours.\n\n` +
      `Once it is, you can add your address, hours and Instagram, and we'll show ` +
      `you which Index titles spaces like yours stock.`;
    await sendEmail({
      to: email,
      subject: `We got your claim for ${store.name}`,
      text: claimantBody.replace(/\*\*/g, ''),
      html: emailHtml(claimantBody),
    });

    const site = website ?? store.website;
    await notify(
      `Store claim: ${store.name}${store.city ? `, ${store.city}` : ''}`,
      `${name ?? 'no name given'} (${role ?? 'role not given'}) · ${email}\n` +
        `Store: ${store.name} · ${store.city ?? '?'}, ${store.country} · /stores/${store.slug}\n` +
        `Website: ${site ?? 'none given'}\n` +
        `Domain match: ${domainMatch(email, site) ? 'yes' : 'no'}\n` +
        `Already claimed: ${store.claimed ? 'yes' : 'no'}\n` +
        `Message: ${message ?? ''}\n\n` +
        `Approve: npm run approve-store -- ${store.slug}\n` +
        `(marks the store claimed, links a matching retailer account, and sends the welcome email)`
    );
  } catch (err) {
    log('error', 'store_claim.failed', { error: err });
  }
  return finish();
}
