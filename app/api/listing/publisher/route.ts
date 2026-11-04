import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { serviceClient } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import { limitRequest } from '@/lib/rate-limit';
import { diff, firstIssue, publisherSchema } from '@/lib/listing/schema';
import { currentEditor, editorUrl, recordEdit, sameOrigin } from '@/lib/listing/server';
import { siteUrl } from '@/lib/seo';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';

const FIELDS = ['name', 'website', 'city', 'country', 'stockist_page_url'] as const;

// Saves the publisher half of a listing. Goes live at once: the editor has
// proved they own the claimed listing, and the admin gets a note of what
// changed in case anything needs a second look.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const editor = await currentEditor();
  if (!editor) return NextResponse.redirect(new URL('/listing?submitted=listing_expired', req.url), 303);
  if (!(await limitRequest(req, 'listing-save', 60, 600))) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const fd = await req.formData();
  const publisherId = String(fd.get('publisher_id') ?? '');
  const anchor = `publisher-${publisherId}`;
  if (!editor.publisherIds.includes(publisherId)) {
    log('warn', 'listing_edit.not_owner', { publisherId });
    return NextResponse.redirect(editorUrl(req.url, anchor, { error: 'That listing is not one of yours.' }), 303);
  }

  const parsed = publisherSchema.safeParse(Object.fromEntries(FIELDS.map((f) => [f, fd.get(f) ?? ''])));
  if (!parsed.success) {
    return NextResponse.redirect(editorUrl(req.url, anchor, { error: firstIssue(parsed.error) }), 303);
  }

  const db = serviceClient();
  const { data: before } = await db
    .from('directory_publishers')
    .select(`slug, ${FIELDS.join(', ')}`)
    .eq('id', publisherId)
    .maybeSingle();
  if (!before) return NextResponse.redirect(editorUrl(req.url, anchor, { error: 'That listing is gone.' }), 303);

  const changes = diff(before as unknown as Record<string, unknown>, parsed.data);
  if (Object.keys(changes).length === 0) {
    return NextResponse.redirect(editorUrl(req.url, anchor, { saved: true }), 303);
  }

  const { error } = await db.from('directory_publishers').update(parsed.data).eq('id', publisherId);
  if (error) {
    log('error', 'listing_edit.publisher_failed', { error: error.message });
    return NextResponse.redirect(editorUrl(req.url, anchor, { error: 'That did not save. Try again in a minute.' }), 303);
  }

  await recordEdit(db, { publisher_id: publisherId, title_id: null, editor_email: editor.email, changes });
  revalidatePath('/', 'layout');
  const slug = (before as unknown as { slug: string }).slug;
  await notify(
    `Listing edit: ${parsed.data.name}`,
    `${editor.email} edited the publisher details.\n\n` +
      Object.entries(changes)
        .map(([k, v]) => `${k}: ${JSON.stringify(v.from)} -> ${JSON.stringify(v.to)}`)
        .join('\n') +
      `\n\n${siteUrl()}/publishers/${slug}`
  );
  return NextResponse.redirect(editorUrl(req.url, anchor, { saved: true }), 303);
}
