// Import step 4 (spec 4.1): load data/clean.json. Derives unique publishers,
// upserts publishers then titles then title_tags, keyed on slug, skipping
// anything owned by a claimed publisher (once a publisher owns their data,
// the spreadsheet stops being authoritative for them). Then prints
// verification counts and a five-profile random sample for eyeball QA.
//
//   npm run load                                   data/clean.json, upsert (the original sheet import)
//   npm run load -- data/imports/x/clean.json      another clean.json
//   npm run load -- --insert-only                  reviewed additions: existing titles and
//                                                  publishers are never touched, new rows
//                                                  are inserted with the row's review_status
//   npm run load -- --skip-covers                  leave covers, cover sources and issues alone
//   npm run load -- --dry-run                      print what would change without writing
//
// Rows that carry cover and issue columns (see validate.ts) also get their
// cover fetched into the covers bucket, a directory_cover_sources row and a
// directory_issues row for the latest issue.
import { existsSync, readFileSync } from 'fs';
import { loadEnv, scriptServiceClient } from './lib';
import { coverExists, coverObjectPath, fetchCover, uploadCover } from './covers';

loadEnv();

interface CleanRow {
  publisher: {
    name: string;
    slug: string;
    website: string | null;
    contact_email: string | null;
    country: string | null;
    city: string | null;
  };
  title: Record<string, unknown> & {
    name: string;
    slug: string;
    review_status?: 'approved' | 'pending';
  };
  tags: string[];
  primary_tag?: string | null;
  cover?: { url: string; page_url: string | null; source_type: string | null } | null;
  issue?: { label: string; number: number | null; date: string | null; source_url: string | null } | null;
}

const args = process.argv.slice(2);
const insertOnly = args.includes('--insert-only');
const skipCovers = args.includes('--skip-covers');
const dryRun = args.includes('--dry-run');
const inputPath = args.find((a) => !a.startsWith('--')) ?? 'data/clean.json';

async function main() {
  if (!existsSync(inputPath)) {
    console.error(`No ${inputPath}. Run npm run validate first.`);
    process.exit(1);
  }
  const rows: CleanRow[] = JSON.parse(readFileSync(inputPath, 'utf8'));
  const supabase = scriptServiceClient();
  if (dryRun) console.log('dry run: nothing is written\n');

  // Derive unique publishers by slug; first row wins on field values. A
  // publisher is pending when any of its titles is: it goes live with them.
  const publishers = new Map<string, CleanRow['publisher'] & { review_status: 'approved' | 'pending' }>();
  for (const row of rows) {
    const status = row.title.review_status ?? 'approved';
    const seen = publishers.get(row.publisher.slug);
    if (!seen) publishers.set(row.publisher.slug, { ...row.publisher, review_status: status });
    else if (status === 'pending') seen.review_status = 'pending';
  }

  const { data: existing } = await supabase
    .from('directory_publishers')
    .select('id, slug, claimed');
  const claimedSlugs = new Set((existing ?? []).filter((p) => p.claimed).map((p) => p.slug));
  const publisherIds = new Map<string, string>(
    (existing ?? []).map((p) => [p.slug, p.id])
  );

  let publishersUpserted = 0;
  let publishersReused = 0;
  let publishersSkippedClaimed = 0;
  for (const publisher of publishers.values()) {
    // Re-import guardrail (spec 1.6): claimed publishers are never touched.
    if (claimedSlugs.has(publisher.slug)) {
      publishersSkippedClaimed += 1;
      continue;
    }
    // Reviewed additions reuse an existing publisher row as it stands.
    if (insertOnly && publisherIds.has(publisher.slug)) {
      publishersReused += 1;
      continue;
    }
    if (dryRun) {
      console.log(`publisher ${publisherIds.has(publisher.slug) ? 'update' : 'insert'} ${publisher.slug}`);
      publishersUpserted += 1;
      continue;
    }
    const { data, error } = await supabase
      .from('directory_publishers')
      .upsert({ ...publisher, created_from: 'imported' }, { onConflict: 'slug' })
      .select('id')
      .single();
    if (error || !data) {
      console.error(`publisher upsert failed for ${publisher.slug}. ${error?.message}`);
      continue;
    }
    publisherIds.set(publisher.slug, data.id);
    publishersUpserted += 1;
  }

  const { data: tagRows } = await supabase.from('directory_tags').select('id, slug');
  const tagIds = new Map<string, string>((tagRows ?? []).map((t) => [t.slug, t.id]));

  const { data: existingTitles } = await supabase.from('directory_titles').select('slug');
  const existingTitleSlugs = new Set((existingTitles ?? []).map((t) => t.slug));

  let titlesUpserted = 0;
  let titlesSkipped = 0;
  let titlesAlreadyPresent = 0;
  let orphanTitles = 0;
  let coversStored = 0;
  let coversLowRes = 0;
  let coversFailed = 0;
  let issuesInserted = 0;
  const loadedTitles: { name: string; slug: string; publisher: string; tags: string[] }[] = [];

  for (const row of rows) {
    if (claimedSlugs.has(row.publisher.slug)) {
      titlesSkipped += 1;
      continue;
    }
    // Reviewed additions never touch a title that is already in the Index,
    // removed or not.
    if (insertOnly && existingTitleSlugs.has(row.title.slug)) {
      titlesAlreadyPresent += 1;
      continue;
    }
    const publisherId = publisherIds.get(row.publisher.slug);
    if (!publisherId && !dryRun) {
      console.error(`no publisher id for ${row.publisher.slug}, skipping ${row.title.slug}`);
      titlesSkipped += 1;
      continue;
    }
    if (dryRun) {
      console.log(
        `title ${existingTitleSlugs.has(row.title.slug) ? 'update' : 'insert'} ${row.title.slug}` +
          ` [${row.tags.join(', ')}] cover=${row.cover?.url ?? 'none'} issue=${row.issue?.label ?? 'none'}`
      );
      titlesUpserted += 1;
      continue;
    }
    const { data: title, error } = await supabase
      .from('directory_titles')
      .upsert(
        { ...row.title, publisher_id: publisherId, created_from: 'imported' },
        { onConflict: 'slug' }
      )
      .select('id')
      .single();
    if (error || !title) {
      console.error(`title upsert failed for ${row.title.slug}. ${error?.message}`);
      titlesSkipped += 1;
      continue;
    }
    titlesUpserted += 1;

    await supabase.from('directory_title_tags').delete().eq('title_id', title.id);
    const primary = row.primary_tag ?? row.tags[0] ?? null;
    const links = row.tags
      .map((slug) => ({ slug, id: tagIds.get(slug) }))
      .filter((t): t is { slug: string; id: string } => Boolean(t.id))
      .map(({ slug, id }) => ({ title_id: title.id, tag_id: id, is_primary: slug === primary }));
    if (links.length > 0) {
      const { error: tagError } = await supabase.from('directory_title_tags').insert(links);
      if (tagError) console.error(`tags failed for ${row.title.slug}. ${tagError.message}`);
    } else {
      orphanTitles += 1;
    }

    // Cover: fetch once into covers/{slug}.jpg, never hotlink. A cover that
    // is already in the bucket (an earlier run, or staged by hand) is kept.
    let coverPath: string | null = null;
    if (!skipCovers && row.cover) {
      try {
        if (await coverExists(supabase, row.title.slug)) {
          coverPath = coverObjectPath(row.title.slug);
        } else {
          const cover = await fetchCover(row.cover.url);
          coverPath = await uploadCover(supabase, row.title.slug, cover.jpeg);
          if (cover.lowResolution) {
            coversLowRes += 1;
            console.log(`  low resolution cover for ${row.title.slug}: ${cover.width}x${cover.height}`);
          }
        }
        coversStored += 1;
        await supabase.from('directory_titles').update({ cover_image_path: coverPath }).eq('id', title.id);
        await supabase
          .from('directory_cover_sources')
          .upsert({ slug: row.title.slug, url: row.cover.url, fetched: true, error: null }, { onConflict: 'slug' });
      } catch (err) {
        coversFailed += 1;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`cover failed for ${row.title.slug}. ${message}`);
        await supabase
          .from('directory_cover_sources')
          .upsert({ slug: row.title.slug, url: row.cover.url, fetched: false, error: message }, { onConflict: 'slug' });
      }
    }

    // Latest issue, same shape seed-issues.ts writes: verified, already
    // announced (so the new-issue email never treats an import as news), and
    // carrying the title's review status so it is approved with the title.
    if (!skipCovers && row.issue) {
      const { data: dupes } = await supabase
        .from('directory_issues')
        .select('id')
        .eq('title_id', title.id)
        .ilike('issue_label', row.issue.label)
        .limit(1);
      if (!dupes || dupes.length === 0) {
        const now = new Date().toISOString();
        const { error: issueError } = await supabase.from('directory_issues').insert({
          title_id: title.id,
          issue_label: row.issue.label,
          issue_number: row.issue.number,
          published_on: row.issue.date,
          published_year: row.issue.date ? Number(row.issue.date.slice(0, 4)) : null,
          cover_image_path: coverPath,
          source_url: row.issue.source_url ?? row.cover?.page_url ?? null,
          verified_at: now,
          followers_notified_at: now,
          created_from: 'imported',
          review_status: row.title.review_status ?? 'approved',
        });
        if (issueError) console.error(`issue failed for ${row.title.slug}. ${issueError.message}`);
        else issuesInserted += 1;
      }
    }

    loadedTitles.push({
      name: row.title.name,
      slug: row.title.slug,
      publisher: row.publisher.name,
      tags: row.tags,
    });
  }

  console.log('\nverification counts');
  console.log(`publishers upserted        ${publishersUpserted}`);
  console.log(`publishers reused          ${publishersReused}`);
  console.log(`publishers skipped claimed ${publishersSkippedClaimed}`);
  console.log(`titles upserted            ${titlesUpserted}`);
  console.log(`titles already present     ${titlesAlreadyPresent}`);
  console.log(`titles skipped             ${titlesSkipped}`);
  console.log(`titles with no tags        ${orphanTitles}`);
  console.log(`covers stored              ${coversStored} (${coversLowRes} low resolution, ${coversFailed} failed)`);
  console.log(`issues inserted            ${issuesInserted}`);

  const sample = [...loadedTitles].sort(() => Math.random() - 0.5).slice(0, 5);
  console.log('\nrandom sample for eyeball QA');
  for (const t of sample) {
    console.log(`  /titles/${t.slug}  ${t.name} (${t.publisher}) [${t.tags.join(', ')}]`);
  }
  console.log('\nRemember to hit /api/revalidate after a load.');
}

main();
