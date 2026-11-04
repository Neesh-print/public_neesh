import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { serviceClient } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import { limitRequest } from '@/lib/rate-limit';
import {
  diff,
  firstIssue,
  imageType,
  MAX_COVER_BYTES,
  subjectSelection,
  titleSchema,
} from '@/lib/listing/schema';
import { currentEditor, editorUrl, recordEdit, sameOrigin } from '@/lib/listing/server';
import { siteUrl } from '@/lib/seo';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';

const FIELDS = [
  'name',
  'description',
  'frequency',
  'cover_price',
  'currency',
  'trim_size',
  'page_count',
  'country',
  'city',
  'status',
  'last_issue_date',
  'subscribe_url',
] as const;

// Saves one title of a listing: every public field, its niches (one
// primary, up to two more, plus identity tags) and optionally a new cover.
// The slug never changes, so the page keeps its URL through a rename.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const editor = await currentEditor();
  if (!editor) return NextResponse.redirect(new URL('/listing?submitted=listing_expired', req.url), 303);
  if (!(await limitRequest(req, 'listing-save', 60, 600))) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.redirect(
      editorUrl(req.url, 'top', { error: 'That upload was too large. Covers can be up to 4 MB.' }),
      303
    );
  }
  const titleId = String(fd.get('title_id') ?? '');
  const anchor = `title-${titleId}`;
  const fail = (error: string) => NextResponse.redirect(editorUrl(req.url, anchor, { error }), 303);

  const db = serviceClient();
  const { data: before } = await db
    .from('directory_titles')
    .select(`id, slug, publisher_id, cover_image_path, ${FIELDS.join(', ')}, directory_title_tags(*)`)
    .eq('id', titleId)
    .eq('removed', false)
    .maybeSingle();
  const current = before as unknown as
    | (Record<string, unknown> & {
        slug: string;
        publisher_id: string;
        cover_image_path: string | null;
        directory_title_tags: { tag_id: string; is_primary?: boolean }[];
      })
    | null;
  if (!current || !editor.publisherIds.includes(current.publisher_id)) {
    log('warn', 'listing_edit.not_owner', { titleId });
    return fail('That title is not one of yours.');
  }

  const raw: Record<string, unknown> = Object.fromEntries(FIELDS.map((f) => [f, fd.get(f) ?? '']));
  raw.primary_tag = fd.get('primary_tag') ?? '';
  raw.subject_tags = fd.getAll('subject_tags').map(String);
  raw.identity_tags = fd.getAll('identity_tags').map(String);
  const parsed = titleSchema.safeParse(raw);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { primary_tag, subject_tags, identity_tags, ...fields } = parsed.data;

  // Tags come from the controlled vocabulary only.
  const { data: vocab } = await db.from('directory_tags').select('id, name, category');
  const byId = new Map((vocab ?? []).map((t) => [t.id as string, t as { id: string; name: string; category: string | null }]));
  const isSubject = (id: string) => byId.get(id)?.category === 'subject';
  if (!isSubject(primary_tag)) return fail('Choose the niche the title belongs in.');
  const others = subject_tags.filter((id) => id !== primary_tag);
  if (!others.every(isSubject)) return fail('One of those niches is not on the list.');
  if (others.length > 2) return fail('Pick up to two other niches besides the main one.');
  if (!identity_tags.every((id) => byId.has(id) && !isSubject(id))) return fail('One of those tags is not on the list.');
  const subjects = subjectSelection(primary_tag, others);
  const keep = [...subjects, ...new Set(identity_tags)];

  // Optional new cover.
  let coverPath: string | null = null;
  const cover = fd.get('cover');
  if (cover instanceof File && cover.size > 0) {
    if (cover.size > MAX_COVER_BYTES) return fail('Covers can be up to 4 MB.');
    const bytes = new Uint8Array(await cover.arrayBuffer());
    const type = imageType(bytes);
    if (!type) return fail('Covers need to be a JPEG, PNG or WebP image.');
    // A fresh name per upload, so caches and the CDN never serve the old one.
    coverPath = `${current.slug}-${Date.now().toString(36)}.${type.ext}`;
    const { error: uploadError } = await db.storage
      .from('covers')
      .upload(coverPath, bytes, { contentType: type.mime, upsert: false, cacheControl: '31536000' });
    if (uploadError) {
      log('error', 'listing_edit.cover_failed', { error: uploadError.message });
      return fail('The cover did not upload. Try again in a minute.');
    }
  }

  const beforeTags = current.directory_title_tags ?? [];
  const beforePrimary = beforeTags.find((t) => t.is_primary)?.tag_id ?? null;
  const tagName = (id: string) => byId.get(id)?.name ?? id;
  const changes: Record<string, { from: unknown; to: unknown }> = {
    ...diff(current, fields),
    ...diff(
      {
        primary_niche: beforePrimary ? tagName(beforePrimary) : null,
        niches: beforeTags.map((t) => t.tag_id).sort().map(tagName),
      },
      { primary_niche: tagName(primary_tag), niches: [...keep].sort().map(tagName) }
    ),
    ...(coverPath ? { cover_image_path: { from: current.cover_image_path, to: coverPath } } : {}),
  };
  if (Object.keys(changes).length === 0) {
    return NextResponse.redirect(editorUrl(req.url, anchor, { saved: true }), 303);
  }

  const update: Record<string, unknown> = { ...fields, verified_at: new Date().toISOString() };
  if (coverPath) update.cover_image_path = coverPath;
  const { error } = await db.from('directory_titles').update(update).eq('id', titleId);
  if (error) {
    log('error', 'listing_edit.title_failed', { error: error.message });
    return fail('That did not save. Try again in a minute.');
  }

  // Tags: clear the old primary (one primary per title is enforced by a
  // unique index), upsert the chosen set, then drop the rest. Never leaves
  // the title with no niche part way through.
  const tagSteps = [
    () => db.from('directory_title_tags').update({ is_primary: false }).eq('title_id', titleId).eq('is_primary', true),
    () =>
      db
        .from('directory_title_tags')
        .upsert(
          keep.map((tag_id) => ({ title_id: titleId, tag_id, is_primary: tag_id === primary_tag })),
          { onConflict: 'title_id,tag_id' }
        ),
    () =>
      db
        .from('directory_title_tags')
        .delete()
        .eq('title_id', titleId)
        .not('tag_id', 'in', `(${keep.join(',')})`),
  ];
  for (const step of tagSteps) {
    const { error: tagError } = await step();
    if (tagError) {
      log('error', 'listing_edit.tags_failed', { error: tagError.message });
      revalidatePath('/', 'layout');
      return fail('Your details saved, but the niches did not. Try saving again.');
    }
  }

  await recordEdit(db, { publisher_id: current.publisher_id, title_id: titleId, editor_email: editor.email, changes });
  // Titles show up on niche pages, the catalog, city and store pages, so a
  // name, cover or niche change touches far more than the title page.
  // Edits are rare; refreshing the whole tree is the safe default.
  revalidatePath('/', 'layout');
  await notify(
    `Listing edit: ${fields.name}`,
    `${editor.email} edited ${fields.name}.\n\n` +
      Object.entries(changes)
        .map(([k, v]) => `${k}: ${JSON.stringify(v.from)} -> ${JSON.stringify(v.to)}`)
        .join('\n') +
      `\n\n${siteUrl()}/titles/${current.slug}`
  );
  return NextResponse.redirect(editorUrl(req.url, anchor, { saved: true }), 303);
}
