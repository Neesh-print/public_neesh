import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClient } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import { clientIp, ipHash } from '@/lib/signals';
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
// reaches the public list until an admin approves it in the portal's Demand
// queue (/admin/demand), which checks every new suggestion within 15
// minutes. The daily-salted ip_hash feeds that check's spam rule (more than
// 10 suggestions from one address in 24 hours). Suggestions reach Gem in the
// Monday demand rollup; only titles that sell on Neesh still email straight
// away, since those are a sales lead.
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
      .select('name, slug, available_on_neesh')
      .eq('id', title_id)
      .maybeSingle();
    if (!title) return finish();

    const { error } = await supabase.from('directory_stockist_suggestions').insert({
      title_id,
      shop_name,
      city,
      email: email ?? null,
      ip_hash: ipHash(clientIp(req.headers)),
    });
    if (error) {
      log('error', 'stockist_suggestion.insert_failed', { error: error.message });
      return finish();
    }

    if (title.available_on_neesh) {
      await notify(
        `Shop suggestion: ${title.name} (sells on Neesh)`,
        `${email ?? 'Someone'} says ${shop_name} in ${city} stocks ${title.name} (/titles/${title.slug}).\n\n` +
          `${title.name} sells on Neesh, so the shop may be a sales lead. The suggestion is ` +
          `being checked and will be in the Demand queue: https://app.neesh.art/admin/demand`
      );
    }
  } catch (err) {
    log('error', 'stockist_suggestion.failed', { error: err });
  }
  return finish();
}
