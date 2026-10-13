import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClient } from '@/lib/supabase';
import { notify } from '@/lib/notify';

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
      url.searchParams.set('submitted', 'stockist');
      url.hash = 'stockists';
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ ok: true });
  };

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
      console.error('stockist suggestion insert failed', error.message);
      return finish();
    }

    await notify(
      `Shop suggestion: ${title.name}`,
      `${email ?? 'Someone'} says ${shop_name} in ${city} stocks ${title.name} (/titles/${title.slug}).\n\n` +
        `If it checks out, add the store and a directory_stockists link, then mark the ` +
        `suggestion status 'added' in directory_stockist_suggestions.`
    );
  } catch (err) {
    console.error('stockist suggestion failed', err);
  }
  return finish();
}
