// Import step 3 (spec 4.1): validate the canonical CSV, normalize trivially
// (trim, case, slugify, price coercion), reject everything else back to the
// sheet. Never fixes data. Outputs data/clean.json for load.ts plus
// data/rejects.csv and data/tags-missing.csv.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import Papa from 'papaparse';
import { csvEscape, loadEnv, scriptServiceClient, slugify, uniqueSlug } from './lib';

loadEnv();

const FREQUENCY_MAP: Record<string, string> = {
  weekly: 'weekly',
  monthly: 'monthly',
  '12x': 'monthly',
  bimonthly: 'bimonthly',
  'bi-monthly': 'bimonthly',
  'every two months': 'bimonthly',
  '6x': 'bimonthly',
  quarterly: 'quarterly',
  '4x': 'quarterly',
  triannual: 'triannual',
  'tri-annual': 'triannual',
  'three times a year': 'triannual',
  '3x': 'triannual',
  biannual: 'biannual',
  'bi-annual': 'biannual',
  semiannual: 'biannual',
  'semi-annual': 'biannual',
  'twice a year': 'biannual',
  '2x': 'biannual',
  annual: 'annual',
  annually: 'annual',
  yearly: 'annual',
  '1x': 'annual',
  irregular: 'irregular',
  occasional: 'irregular',
  evergreen: 'evergreen',
};

const BANNED_STUB_WORDS = [
  'celebrates',
  'explores',
  'delves',
  'showcases',
  'curated',
  'stunning',
  'beautifully',
  'lovingly',
  'gorgeous',
  'must-read',
  'love letter to',
];

const STALE_MONTHS = 18;

interface CleanRow {
  publisher: {
    name: string;
    slug: string;
    website: string | null;
    contact_email: string | null;
    country: string | null;
    city: string | null;
  };
  title: {
    name: string;
    slug: string;
    description: string | null;
    frequency: string | null;
    cover_price: number | null;
    currency: string | null;
    trim_size: string | null;
    page_count: number | null;
    country: string;
    city: string | null;
    status: string;
    last_issue_date: string | null;
    verified_at: string | null;
  };
  tags: string[];
}

async function main() {
  const inputPath = process.argv[2] ?? 'data/import.csv';
  if (!existsSync(inputPath)) {
    console.error(`No input file at ${inputPath}. See docs/mapping.md.`);
    process.exit(1);
  }

  const supabase = scriptServiceClient();
  const [{ data: tagRows }, { data: existingPublishers }, { data: existingTitles }] =
    await Promise.all([
      supabase.from('directory_tags').select('slug'),
      supabase.from('directory_publishers').select('slug, name'),
      supabase.from('directory_titles').select('slug, name'),
    ]);
  const vocabulary = new Set((tagRows ?? []).map((t) => t.slug));
  const publisherSlugs = new Map<string, string>(); // slug -> name
  const titleSlugs = new Map<string, string>();
  for (const p of existingPublishers ?? []) publisherSlugs.set(p.slug, p.name);
  for (const t of existingTitles ?? []) titleSlugs.set(t.slug, t.name);
  const publisherSlugByName = new Map<string, string>();
  for (const p of existingPublishers ?? []) publisherSlugByName.set(p.name, p.slug);

  const parsed = Papa.parse<Record<string, string>>(readFileSync(inputPath, 'utf8'), {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    for (const err of parsed.errors.slice(0, 20)) {
      console.error(`CSV parse error row ${err.row}. ${err.message}`);
    }
  }

  const rejects: { row: number; field: string; reason: string }[] = [];
  const tagsMissing: { row: number; tag: string }[] = [];
  const clean: CleanRow[] = [];

  parsed.data.forEach((raw, index) => {
    const rowNum = index + 2; // header is row 1
    const get = (key: string) => (raw[key] ?? '').trim();
    const reject = (field: string, reason: string) => rejects.push({ row: rowNum, field, reason });
    const startRejectCount = rejects.length;

    const publisherName = get('publisher_name');
    const titleName = get('title_name');
    if (!publisherName) reject('publisher_name', 'required');
    if (!titleName) reject('title_name', 'required');

    const normCountry = (value: string, field: string): string | null => {
      if (!value) return null;
      const up = value.toUpperCase();
      if (!/^[A-Z]{2}$/.test(up)) {
        reject(field, 'must be ISO 3166-1 alpha-2');
        return null;
      }
      return up;
    };

    const country = normCountry(get('country'), 'country');
    if (!get('country')) reject('country', 'required');
    const publisherCountry = normCountry(get('publisher_country'), 'publisher_country');

    const city = get('city') || null;
    if (country && country !== 'US' && !city) {
      reject('city', 'required for non-US titles');
    }

    let currency: string | null = null;
    if (get('currency')) {
      const up = get('currency').toUpperCase();
      if (!/^[A-Z]{3}$/.test(up)) reject('currency', 'must be ISO 4217');
      else currency = up;
    }

    let coverPrice: number | null = null;
    if (get('cover_price')) {
      const cleaned = get('cover_price').replace(/[^0-9.,]/g, '').replace(',', '.');
      const value = Number.parseFloat(cleaned);
      if (!Number.isFinite(value) || value < 0) reject('cover_price', 'not a price');
      else coverPrice = Math.round(value * 100) / 100;
    }

    let pageCount: number | null = null;
    if (get('page_count')) {
      const value = Number.parseInt(get('page_count'), 10);
      if (!Number.isInteger(value) || value <= 0) reject('page_count', 'not a positive integer');
      else pageCount = value;
    }

    let frequency: string | null = null;
    if (get('frequency')) {
      const mapped = FREQUENCY_MAP[get('frequency').toLowerCase()];
      if (!mapped) reject('frequency', `unrecognized value "${get('frequency')}"`);
      else frequency = mapped;
    }

    const status = get('status').toLowerCase() || 'active';
    if (!['active', 'dormant', 'ceased'].includes(status)) {
      reject('status', 'must be active, dormant, or ceased');
    }

    const normDate = (value: string, field: string): string | null => {
      if (!value) return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
        reject(field, 'must be YYYY-MM-DD');
        return null;
      }
      return value;
    };
    const lastIssueDate = normDate(get('last_issue_date'), 'last_issue_date');
    const verifiedAt = normDate(get('verified_at'), 'verified_at');

    // Liveness guardrail (spec 2.2 rule 3): an "active" title whose latest
    // issue is over 18 months old goes back to verification, not into the DB.
    if (status === 'active' && lastIssueDate) {
      const staleBefore = new Date();
      staleBefore.setMonth(staleBefore.getMonth() - STALE_MONTHS);
      if (new Date(lastIssueDate) < staleBefore) {
        reject('last_issue_date', `over ${STALE_MONTHS} months old for an active title`);
      }
    }

    const description = get('description') || null;
    if (description) {
      const lower = description.toLowerCase();
      for (const word of BANNED_STUB_WORDS) {
        if (lower.includes(word)) reject('description', `banned vocabulary "${word}"`);
      }
      if (description.includes('—')) reject('description', 'em dash');
      if (/not just [^.]+, but /i.test(description)) {
        reject('description', '"not just X, but Y" construction');
      }
    }

    const website = get('publisher_website') || null;
    if (website && !/^https?:\/\//.test(website)) {
      reject('publisher_website', 'must start with http(s)://');
    }

    const rowTags: string[] = [];
    for (const rawTag of get('tags').split(/[|,;]/)) {
      const tagSlug = slugify(rawTag);
      if (!tagSlug) continue;
      if (vocabulary.has(tagSlug)) rowTags.push(tagSlug);
      else tagsMissing.push({ row: rowNum, tag: tagSlug });
    }

    if (rejects.length > startRejectCount) return;

    let publisherSlug = publisherSlugByName.get(publisherName);
    if (!publisherSlug) {
      publisherSlug = uniqueSlug(publisherName, publisherSlugs);
      publisherSlugByName.set(publisherName, publisherSlug);
    }
    const titleSlug = uniqueSlug(titleName, titleSlugs);

    clean.push({
      publisher: {
        name: publisherName,
        slug: publisherSlug,
        website,
        contact_email: get('publisher_email') || null,
        country: publisherCountry,
        city: get('publisher_city') || null,
      },
      title: {
        name: titleName,
        slug: titleSlug,
        description,
        frequency,
        cover_price: coverPrice,
        currency,
        trim_size: get('trim_size') || null,
        page_count: pageCount,
        country: country ?? '',
        city,
        status,
        last_issue_date: lastIssueDate,
        verified_at: verifiedAt,
      },
      tags: [...new Set(rowTags)],
    });
  });

  mkdirSync('data', { recursive: true });
  writeFileSync('data/clean.json', JSON.stringify(clean, null, 2));
  writeFileSync(
    'data/rejects.csv',
    'row,field,reason\n' +
      rejects.map((r) => `${r.row},${csvEscape(r.field)},${csvEscape(r.reason)}`).join('\n') +
      '\n'
  );
  writeFileSync(
    'data/tags-missing.csv',
    'row,tag\n' + tagsMissing.map((t) => `${t.row},${csvEscape(t.tag)}`).join('\n') + '\n'
  );

  console.log(`rows in        ${parsed.data.length}`);
  console.log(`clean          ${clean.length}  -> data/clean.json`);
  console.log(`rejects        ${rejects.length}  -> data/rejects.csv`);
  console.log(`tags missing   ${tagsMissing.length}  -> data/tags-missing.csv`);
  if (rejects.length > 0) {
    console.log('\nFix rejects in the sheet and re-run. The loop ends at zero rejects.');
    process.exitCode = 1;
  }
}

main();
