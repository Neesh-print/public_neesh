import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClient } from '@/lib/supabase';
import { emailHtml, notify, sendEmail } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const claimSchema = z.object({
  publisher_id: z.string().uuid(),
  title_id: z.string().uuid().optional(),
  email: z.string().email().max(320),
  name: z.string().max(200).optional(),
  message: z.string().max(4000).optional(),
});

function domainMatch(email: string, website: string | null): boolean {
  if (!website) return false;
  try {
    const emailDomain = email.split('@')[1]?.toLowerCase();
    const siteDomain = new URL(website).hostname.toLowerCase().replace(/^www\./, '');
    return Boolean(emailDomain) && (emailDomain === siteDomain || emailDomain.endsWith(`.${siteDomain}`));
  } catch {
    return false;
  }
}

// Claim submission (spec 1.2): writes a row to directory_claims, then sends
// email 1.1a to the claimant and 1.1b to the admin (handoff 5.3). Approval
// is manual, via npm run approve, which sends email 1.2.
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
  const { publisher_id, title_id, email, name, message } = parsed.data;

  try {
    const supabase = serviceClient();
    const { error } = await supabase
      .from('directory_claims')
      .insert({ publisher_id, email, name, message });
    if (error) {
      console.error('claim insert failed', error.message);
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
    console.error('claim failed', err);
  }
  return finish();
}
