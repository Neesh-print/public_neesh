import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClient } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import { readSubmission, redirectWithNotice, tooManyRequests } from '@/lib/forms';
import { limitFormRequest } from '@/lib/rate-limit';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';

const schema = z.object({
  title_id: z.string().uuid(),
  shop_name: z.string().min(1).max(200),
  city: z.string().min(1).max(120),
  email: z.string().email().max(320).optional(),
});

// "Know a shop that carries it?" on a title page. Stored for review; nothing
// reaches the public list until an admin adds it as a stockist link.
export async function POST(req: NextRequest) {
  const submission = await readSubmission(req);
  if (!submission.ok) return NextResponse.json({ ok: false }, { status: 400 });
  const { isForm, raw, trapped } = submission;

  const finish = () =>
    isForm
      ? redirectWithNotice(req, 'stockist', '/index', 'stockists')
      : NextResponse.json({ ok: true });

  if (!(await limitFormRequest(req, 'suggest-stockist'))) {
    return isForm ? finish() : tooManyRequests();
  }
  if (trapped) return finish();

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return isForm ? finish() : NextResponse.json({ ok: false }, { status: 400 });
  }
  const { title_id, shop_name, city, email } = parsed.data;

  try {
    const supabase = serviceClient();
    const { data: title } = await supabase
      .from('directory_titles')
      .select('name, slug')
      .eq('id', title_id)
      .maybeSingle();
    if (!title) return finish();

    const { error } = await supabase.from('directory_stockist_suggestions').insert({
      title_id,
      shop_name,
      city,
      email: email ?? null,
    });
    if (error) {
      log('error', 'stockist_suggestion.insert_failed', { error: error.message });
      return finish();
    }

    await notify(
      `Shop suggestion: ${title.name}`,
      `${email ?? 'Someone'} says ${shop_name} in ${city} stocks ${title.name} (/titles/${title.slug}).\n\n` +
        `If it checks out, add the store and a directory_stockists link, then mark the ` +
        `suggestion status 'added' in directory_stockist_suggestions.`
    );
  } catch (err) {
    log('error', 'stockist_suggestion.failed', { error: err });
  }
  return finish();
}
