import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClient } from '@/lib/supabase';
import { emailHtml, notify, sendEmail } from '@/lib/notify';

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
      const url = referer ? new URL(referer) : new URL('/add-title', req.url);
      url.searchParams.set('submitted', 'suggestion');
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ ok: true });
  };

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
      console.error('suggestion insert failed', error.message);
      return finish();
    }

    const body =
      `Hi,\n\n` +
      `Thanks for suggesting **${title_name}** for the Neesh Index. A person ` +
      `checks every suggestion; if it fits, it's usually live within a couple ` +
      `of days and we'll email you the page.\n\n` +
      `That's the only reason we'll email you.`;
    await sendEmail({
      to: email,
      subject: `Got it, ${title_name} is in the queue`,
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
    console.error('suggestion failed', err);
  }
  return finish();
}
