import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClient } from '@/lib/supabase';
import { emailHtml, notify, sendEmail } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const claimSchema = z.object({
  store_id: z.string().uuid(),
  email: z.string().email().max(320),
  name: z.string().max(200).optional(),
  role: z.string().max(120).optional(),
  website: z.string().url().max(500).optional(),
  message: z.string().max(4000).optional(),
});

function domainMatch(email: string, website: string | null | undefined): boolean {
  if (!website) return false;
  try {
    const emailDomain = email.split('@')[1]?.toLowerCase();
    const siteDomain = new URL(website).hostname.toLowerCase().replace(/^www\./, '');
    return Boolean(emailDomain) && (emailDomain === siteDomain || emailDomain.endsWith(`.${siteDomain}`));
  } catch {
    return false;
  }
}

// Store claim (stockists spec, Phase 2), mirroring the publisher claim: store
// the claim privately, confirm to the claimant, tell the admin. Approval is
// manual: npm run approve-store -- {store-slug}.
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
      url.searchParams.set('submitted', 'store_claim');
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ ok: true });
  };

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
      console.error('store claim insert failed', error.message);
      return finish();
    }

    const claimantBody =
      `Hi${name ? ` ${name}` : ''},\n\n` +
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
    console.error('store claim failed', err);
  }
  return finish();
}
