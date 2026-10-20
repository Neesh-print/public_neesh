import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClient } from '@/lib/supabase';
import { MAX_ADDITIONS_PER_DAY, MAX_UPLOAD_BYTES, UPLOAD_TYPES } from '@/lib/collect/shared';
import { freeSlug, hasBlockedText, hasLinkInText, readerFromRequest, slugify } from '@/lib/collect/server';

export const dynamic = 'force-dynamic';

// Reader contributions (spec: Add flow). Everything a reader adds saves as
// reader_created and pending, shows right away with a Reader-added tag, and
// goes to the review queue in the admin portal. Checks before saving: fuzzy
// duplicates (pg_trgm similarity above 0.6 returns "Is it one of these?"
// unless the reader confirms it's new), a blocked-words list on every text
// field, image type and size, 20 additions a day, and the add ban after
// three rejected additions. Nothing is marked Own or Want unless the reader
// picked one.

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .url()
  .refine((v) => /^https?:\/\//i.test(v), 'http(s) only')
  .optional();

// The issue as the reader types it: "04" becomes "Issue 04" (number 4);
// anything else ("Spring 2025", "Vol. 2 No. 1") stays as written.
const issueFields = {
  issue: z.string().trim().min(1).max(120),
  year: z.coerce.number().int().min(1800).max(2100).optional(),
  source_url: optionalUrl,
  mark: z.enum(['own', 'want']).optional(),
  confirm_new: z.literal('1').optional(),
};

function issueLabel(raw: string): { label: string; number: number | null } {
  const plain = raw.replace(/^(issue|no\.?|#)\s*/i, '').trim();
  if (/^\d+(\.\d+)?$/.test(plain)) {
    return { label: `Issue ${plain.length === 1 ? `0${plain}` : plain}`, number: Number(plain) };
  }
  return { label: raw.trim(), number: null };
}

const issueSchema = z.object({ mode: z.literal('issue'), title_id: z.string().uuid(), ...issueFields });
const titleSchema = z.object({
  mode: z.literal('title'),
  title_name: z.string().trim().min(1).max(200),
  publisher_name: z.string().trim().min(1).max(200),
  publisher_id: z.string().uuid().optional(),
  link: z
    .string()
    .trim()
    .max(500)
    .url()
    .refine((v) => /^https?:\/\//i.test(v), 'http(s) only'),
  ...issueFields,
});
const schema = z.discriminatedUnion('mode', [issueSchema, titleSchema]);

function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

// JPEG, PNG and WebP by their first bytes, not the declared type.
function sniffImage(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'webp';
  }
  return null;
}

export async function POST(req: NextRequest) {
  const reader = await readerFromRequest(req);
  if (!reader) return fail('sign_in', 401);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail('bad_request');
  }
  const fields: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === 'string' && v.trim() !== '') fields[k] = v.trim();
  }
  const parsed = schema.safeParse(fields);
  if (!parsed.success) return fail('invalid');
  const input = parsed.data;

  const cover = form.get('cover');
  const file = cover instanceof File && cover.size > 0 ? cover : null;
  if (!file && !input.source_url) return fail('cover_or_source');
  if (file && (file.size > MAX_UPLOAD_BYTES || !UPLOAD_TYPES.includes(file.type))) return fail('image');

  const { label: issue_label, number: issue_number } = issueLabel(input.issue);
  const texts = [issue_label, input.mode === 'title' ? input.title_name : null, input.mode === 'title' ? input.publisher_name : null];
  if (hasBlockedText(...texts, input.source_url, input.mode === 'title' ? input.link : null)) return fail('blocked');
  if (hasLinkInText(...texts)) return fail('blocked');

  const supabase = serviceClient();

  const { data: collector } = await supabase.from('collectors').select('can_add').eq('user_id', reader.id).maybeSingle();
  if (!collector) return fail('sign_in', 401);
  if (!collector.can_add) return fail('paused', 403);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const counts = await Promise.all(
    (['directory_issues', 'directory_titles', 'directory_publishers'] as const).map((table) =>
      supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('created_by', reader.id)
        .gte('created_at', since)
    )
  );
  const today = counts.reduce((n, r) => n + (r.count ?? 0), 0);
  if (today >= MAX_ADDITIONS_PER_DAY) return fail('limit', 429);

  // Duplicate check, skipped once the reader has seen the candidates and
  // said it's new.
  if (!input.confirm_new) {
    if (input.mode === 'title') {
      const [titles, publishers] = await Promise.all([
        supabase.rpc('directory_similar_titles', { p_name: input.title_name }),
        input.publisher_id
          ? Promise.resolve({ data: [] })
          : supabase.rpc('directory_similar_publishers', { p_name: input.publisher_name }),
      ]);
      const titleHits = (titles.data ?? []) as unknown[];
      const publisherHits = (publishers.data ?? []) as unknown[];
      if (titleHits.length || publisherHits.length) {
        return NextResponse.json({ ok: false, error: 'duplicates', titles: titleHits, publishers: publisherHits });
      }
    } else {
      const { data } = await supabase.rpc('directory_similar_issues', {
        p_title_id: input.title_id,
        p_label: issue_label,
      });
      if (data && data.length) return NextResponse.json({ ok: false, error: 'duplicates', issues: data });
    }
  }

  // Cover photo waits in the private reader-uploads bucket until approved.
  let coverPath: string | null = null;
  if (file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const ext = sniffImage(bytes);
    if (!ext) return fail('image');
    const objectPath = `${reader.id}/${randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from('reader-uploads')
      .upload(objectPath, bytes, { contentType: file.type, upsert: false });
    if (error) {
      console.error('reader upload failed', error.message);
      return fail('upload', 500);
    }
    coverPath = `reader-uploads/${objectPath}`;
  }

  const pending = { created_from: 'reader_created', review_status: 'pending', created_by: reader.id };
  let titleId: string;
  let titleSlug: string;
  let titleName: string;

  if (input.mode === 'title') {
    let publisherId = input.publisher_id ?? null;
    if (publisherId) {
      const { data } = await supabase.from('directory_publishers').select('id').eq('id', publisherId).maybeSingle();
      if (!data) publisherId = null;
    }
    if (!publisherId) {
      const { data, error } = await supabase
        .from('directory_publishers')
        .insert({
          name: input.publisher_name,
          slug: await freeSlug('directory_publishers', slugify(input.publisher_name)),
          website: input.link,
          ...pending,
        })
        .select('id')
        .single();
      if (error || !data) {
        console.error('reader publisher insert failed', error?.message);
        return fail('save', 500);
      }
      publisherId = data.id as string;
    }
    const { data, error } = await supabase
      .from('directory_titles')
      .insert({
        publisher_id: publisherId,
        name: input.title_name,
        slug: await freeSlug('directory_titles', slugify(input.title_name)),
        status: 'active',
        ...pending,
      })
      .select('id, slug, name')
      .single();
    if (error || !data) {
      console.error('reader title insert failed', error?.message);
      return fail('save', 500);
    }
    titleId = data.id as string;
    titleSlug = data.slug as string;
    titleName = data.name as string;
  } else {
    const { data } = await supabase
      .from('directory_titles')
      .select('id, slug, name')
      .eq('id', input.title_id)
      .eq('removed', false)
      .is('merged_into', null)
      .neq('review_status', 'rejected')
      .maybeSingle();
    if (!data) return fail('not_found', 404);
    titleId = data.id as string;
    titleSlug = data.slug as string;
    titleName = data.name as string;
  }

  const { data: issue, error: issueError } = await supabase
    .from('directory_issues')
    .insert({
      title_id: titleId,
      issue_label,
      issue_number,
      published_year: input.year ?? null,
      source_url: input.source_url ?? null,
      cover_image_path: coverPath,
      ...pending,
    })
    .select('id')
    .single();
  if (issueError || !issue) {
    if (issueError?.code === '23505') return fail('duplicate_label', 409);
    console.error('reader issue insert failed', issueError?.message);
    return fail('save', 500);
  }

  if (input.mark) {
    await supabase
      .from('collection_items')
      .upsert({ user_id: reader.id, issue_id: issue.id, state: input.mark }, { onConflict: 'user_id,issue_id' });
  }

  revalidatePath(`/titles/${titleSlug}`);
  if (input.mode === 'title') revalidatePath('/catalog');

  return NextResponse.json({ ok: true, title_slug: titleSlug, title_name: titleName, issue_id: issue.id });
}
