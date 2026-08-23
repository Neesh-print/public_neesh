// Import step 4 (spec 4.1): load data/clean.json. Derives unique publishers,
// upserts publishers then titles then title_tags, keyed on slug, skipping
// anything owned by a claimed publisher (once a publisher owns their data,
// the spreadsheet stops being authoritative for them). Then prints
// verification counts and a five-profile random sample for eyeball QA.
import { existsSync, readFileSync } from 'fs';
import { loadEnv, scriptServiceClient } from './lib';

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
  title: Record<string, unknown> & { name: string; slug: string };
  tags: string[];
}

async function main() {
  if (!existsSync('data/clean.json')) {
    console.error('No data/clean.json. Run npm run validate first.');
    process.exit(1);
  }
  const rows: CleanRow[] = JSON.parse(readFileSync('data/clean.json', 'utf8'));
  const supabase = scriptServiceClient();

  // Derive unique publishers by slug; first row wins on field values.
  const publishers = new Map<string, CleanRow['publisher']>();
  for (const row of rows) {
    if (!publishers.has(row.publisher.slug)) publishers.set(row.publisher.slug, row.publisher);
  }

  const { data: existing } = await supabase
    .from('directory_publishers')
    .select('id, slug, claimed');
  const claimedSlugs = new Set((existing ?? []).filter((p) => p.claimed).map((p) => p.slug));
  const publisherIds = new Map<string, string>(
    (existing ?? []).map((p) => [p.slug, p.id])
  );

  let publishersUpserted = 0;
  let publishersSkippedClaimed = 0;
  for (const publisher of publishers.values()) {
    // Re-import guardrail (spec 1.6): claimed publishers are never touched.
    if (claimedSlugs.has(publisher.slug)) {
      publishersSkippedClaimed += 1;
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

  let titlesUpserted = 0;
  let titlesSkipped = 0;
  let orphanTitles = 0;
  const loadedTitles: { name: string; slug: string; publisher: string; tags: string[] }[] = [];

  for (const row of rows) {
    if (claimedSlugs.has(row.publisher.slug)) {
      titlesSkipped += 1;
      continue;
    }
    const publisherId = publisherIds.get(row.publisher.slug);
    if (!publisherId) {
      console.error(`no publisher id for ${row.publisher.slug}, skipping ${row.title.slug}`);
      titlesSkipped += 1;
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
    const links = row.tags
      .map((slug) => tagIds.get(slug))
      .filter((id): id is string => Boolean(id))
      .map((tag_id) => ({ title_id: title.id, tag_id }));
    if (links.length > 0) {
      const { error: tagError } = await supabase.from('directory_title_tags').insert(links);
      if (tagError) console.error(`tags failed for ${row.title.slug}. ${tagError.message}`);
    } else {
      orphanTitles += 1;
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
  console.log(`publishers skipped claimed ${publishersSkippedClaimed}`);
  console.log(`titles upserted            ${titlesUpserted}`);
  console.log(`titles skipped             ${titlesSkipped}`);
  console.log(`titles with no tags        ${orphanTitles}`);

  const sample = [...loadedTitles].sort(() => Math.random() - 0.5).slice(0, 5);
  console.log('\nrandom sample for eyeball QA');
  for (const t of sample) {
    console.log(`  /titles/${t.slug}  ${t.name} (${t.publisher}) [${t.tags.join(', ')}]`);
  }
  console.log('\nRemember to hit /api/revalidate after a load.');
}

main();
