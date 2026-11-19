// Seed directory_issues for Your collection.
//
//   npm run seed-issues -- --platform            issues for every available-on-Neesh title,
//                                                from its listings on the Neesh platform
//   npm run seed-issues -- issues.csv            issues from a hand-checked CSV (the NYC
//                                                campaign titles; Gem confirms the list)
//   add --dry-run to print what would change without writing
//
// CSV columns (header row required):
//   title_slug, issue_label, issue_number, published_on, source_url, cover_url, coverage, pilot
// coverage (complete | partial | unknown) and pilot (yes to put the title in
// the notification pilot) apply to the title; the last non-empty value per
// title wins. source_url is where the issue was verified and is required.
//
// Seeded issues are approved, carry source_url and verified_at, and are
// marked as already announced (followers_notified_at) so the new-issue
// email never sends a back catalogue as news. Existing issues (same title,
// same label, any case) are left alone.
import { readFileSync } from 'fs';
import Papa from 'papaparse';
import { loadEnv, scriptServiceClient } from './lib';

loadEnv();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const platform = args.includes('--platform');
const csvPath = args.find((a) => !a.startsWith('--'));
const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://neesh.art').replace(/\/$/, '');

if (!platform && !csvPath) {
  console.error('Usage: npm run seed-issues -- (--platform | issues.csv) [--dry-run]');
  process.exit(1);
}

const supabase = scriptServiceClient();

interface NewIssue {
  title_id: string;
  issue_label: string;
  issue_number: number | null;
  published_on: string | null;
  cover_image_path: string | null;
  source_url: string;
  neesh_magazine_id: string | null;
}

async function existingLabels(titleIds: string[]): Promise<Set<string>> {
  const keys = new Set<string>();
  for (let i = 0; i < titleIds.length; i += 200) {
    const { data, error } = await supabase
      .from('directory_issues')
      .select('title_id, issue_label')
      .in('title_id', titleIds.slice(i, i + 200))
      .eq('removed', false)
      .is('merged_into', null);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) keys.add(`${r.title_id}|${String(r.issue_label).toLowerCase()}`);
  }
  return keys;
}

async function insertIssues(rows: NewIssue[]): Promise<number> {
  const seen = await existingLabels([...new Set(rows.map((r) => r.title_id))]);
  const fresh: NewIssue[] = [];
  for (const r of rows) {
    const key = `${r.title_id}|${r.issue_label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(r);
  }
  const now = new Date().toISOString();
  for (const r of fresh) console.log(`  + ${r.issue_label}  (${r.source_url})`);
  if (dryRun || fresh.length === 0) return fresh.length;
  const { error } = await supabase.from('directory_issues').insert(
    fresh.map((r) => ({
      ...r,
      verified_at: now,
      followers_notified_at: now,
      created_from: 'admin_created',
      review_status: 'approved',
    }))
  );
  if (error) throw new Error(error.message);
  return fresh.length;
}

// "4" -> "Issue 4"; anything else stays as written.
function labelFor(issueNumber: string | null, fallback: string): string {
  const raw = (issueNumber ?? '').trim();
  if (!raw) return fallback;
  return /^\d+(\.\d+)?$/.test(raw) ? `Issue ${raw}` : raw;
}

async function seedPlatform(): Promise<void> {
  const { data: titles, error } = await supabase
    .from('directory_titles')
    .select('id, slug, name')
    .eq('available_on_neesh', true);
  if (error) throw new Error(error.message);
  const { data: links } = await supabase
    .from('directory_neesh_links')
    .select('magazine_id, title_id')
    .in('title_id', (titles ?? []).map((t) => t.id));
  const magazineIds = (links ?? []).map((l) => l.magazine_id);
  const { data: magazines } = magazineIds.length
    ? await supabase
        .from('magazines')
        .select('id, title, issue_number, publication_date, cover_image_url, is_demo')
        .in('id', magazineIds)
    : { data: [] };
  const byId = new Map((magazines ?? []).map((m) => [m.id, m]));

  const rows: NewIssue[] = [];
  for (const link of links ?? []) {
    const m = byId.get(link.magazine_id);
    const t = (titles ?? []).find((x) => x.id === link.title_id);
    if (!m || !t || m.is_demo) continue;
    const label = labelFor(m.issue_number, m.title);
    const n = Number.parseFloat(String(m.issue_number ?? '').replace(/[^\d.]/g, ''));
    rows.push({
      title_id: t.id,
      issue_label: label,
      issue_number: Number.isFinite(n) ? n : null,
      published_on: m.publication_date ?? null,
      cover_image_path: m.cover_image_url ?? null,
      source_url: `${site}/order/${t.slug}`,
      neesh_magazine_id: m.id,
    });
  }
  console.log(`Platform: ${titles?.length ?? 0} titles on Neesh, ${rows.length} listings`);
  const added = await insertIssues(rows);
  console.log(`${dryRun ? 'Would add' : 'Added'} ${added} issues`);
}

async function seedCsv(path: string): Promise<void> {
  const parsed = Papa.parse<Record<string, string>>(readFileSync(path, 'utf8'), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  const slugs = [...new Set(parsed.data.map((r) => r.title_slug?.trim()).filter(Boolean))];
  const { data: titles, error } = await supabase.from('directory_titles').select('id, slug').in('slug', slugs);
  if (error) throw new Error(error.message);
  const idBySlug = new Map((titles ?? []).map((t) => [t.slug as string, t.id as string]));

  const rows: NewIssue[] = [];
  const titleUpdates = new Map<string, { catalogue_coverage?: string; collect_pilot?: boolean }>();
  let problems = 0;
  parsed.data.forEach((r, index) => {
    const line = index + 2;
    const titleId = idBySlug.get(r.title_slug?.trim());
    if (!titleId) {
      console.error(`  line ${line}: unknown title_slug "${r.title_slug}"`);
      problems++;
      return;
    }
    const update = titleUpdates.get(titleId) ?? {};
    const coverage = r.coverage?.trim().toLowerCase();
    if (coverage) {
      if (!['complete', 'partial', 'unknown'].includes(coverage)) {
        console.error(`  line ${line}: coverage must be complete, partial or unknown`);
        problems++;
      } else update.catalogue_coverage = coverage;
    }
    if (r.pilot?.trim()) update.collect_pilot = /^(y|yes|true|1)$/i.test(r.pilot.trim());
    titleUpdates.set(titleId, update);

    const label = r.issue_label?.trim();
    if (!label) return; // a coverage-only row
    if (!/^https?:\/\//.test(r.source_url?.trim() ?? '')) {
      console.error(`  line ${line}: source_url is required`);
      problems++;
      return;
    }
    const n = Number.parseFloat(r.issue_number ?? '');
    rows.push({
      title_id: titleId,
      issue_label: label,
      issue_number: Number.isFinite(n) ? n : null,
      published_on: /^\d{4}-\d{2}-\d{2}$/.test(r.published_on?.trim() ?? '') ? r.published_on.trim() : null,
      cover_image_path: r.cover_url?.trim() || null,
      source_url: r.source_url.trim(),
      neesh_magazine_id: null,
    });
  });
  if (problems > 0) {
    console.error(`${problems} problems; nothing written.`);
    process.exit(1);
  }
  const added = await insertIssues(rows);
  console.log(`${dryRun ? 'Would add' : 'Added'} ${added} issues`);

  for (const [titleId, update] of titleUpdates) {
    if (Object.keys(update).length === 0) continue;
    console.log(`  title ${titleId}: ${JSON.stringify(update)}`);
    if (dryRun) continue;
    const { error: updateError } = await supabase
      .from('directory_titles')
      .update({ ...update, ...(update.catalogue_coverage ? { coverage_checked_at: new Date().toISOString() } : {}) })
      .eq('id', titleId);
    if (updateError) throw new Error(updateError.message);
  }
  console.log('Revalidate after seeding: POST /api/revalidate with the token.');
}

(async () => {
  if (platform) await seedPlatform();
  if (csvPath) await seedCsv(csvPath);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
