// Session tool: pick and fetch the best cover candidate for each researched
// title, using the repo's covers.ts so the result matches what load.ts would
// store. Writes covers/<key>.jpg and covers/<key>.json (chosen candidate,
// dimensions, low-resolution flag, or the failure). Resumable: a title with
// a .json already is skipped.
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { execFileSync } from 'child_process';
import { convertCover, MIN_LONG_EDGE } from '/home/user/public_neesh/scripts/covers';

// Node's fetch ignores HTTPS_PROXY in this session, so download with curl.
function download(url: string): Buffer {
  return execFileSync('curl', ['-sSL', '--fail', '--max-time', '60', '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', url], { maxBuffer: 64 * 1024 * 1024 });
}

const WORK = '/tmp/claude-0/-home-user-public-neesh/5d656abd-f601-5db4-b898-6930cac2e772/scratchpad/work';
const OUT = join(WORK, 'covers');
mkdirSync(OUT, { recursive: true });

interface Candidate {
  url: string;
  source_type: string;
  page_url: string | null;
  issue_label: string | null;
  width: number | null;
  height: number | null;
  notes: string | null;
}

const files: string[] = [];
for (const b of readdirSync(join(WORK, 'research/out'))) {
  const dir = join(WORK, 'research/out', b);
  for (const f of readdirSync(dir)) if (f.endsWith('.json')) files.push(join(dir, f));
}
files.sort();

const order = { publisher: 0, distributor: 1, stockist: 2 } as Record<string, number>;
const curation: Record<string, unknown> = {};
for (const f of readdirSync(join(WORK, 'curate'))) {
  if (f.endsWith('.json')) Object.assign(curation, JSON.parse(readFileSync(join(WORK, 'curate', f), 'utf8')));
}

async function main() {
  let done = 0;
  for (const file of files) {
    const key = basename(file, '.json');
    const outJson = join(OUT, `${key}.json`);
    if (existsSync(outJson)) continue;
    let rec: { cover_candidates?: Candidate[]; qualifies?: string; input_title: string };
    try {
      rec = JSON.parse(readFileSync(file, 'utf8'));
      if (Array.isArray(rec)) rec = (rec as unknown as typeof rec[])[0];
    } catch (e) {
      console.error('bad json', file);
      continue;
    }
    const cur = curation[key] as { cover_candidates?: Candidate[] } | undefined;
    const cands = [...(cur?.cover_candidates ?? rec.cover_candidates ?? [])];
    if (cands.length === 0 || rec.qualifies === 'no') {
      writeFileSync(outJson, JSON.stringify({ key, status: 'none', reason: cands.length === 0 ? 'no candidates' : 'does not qualify' }, null, 2));
      continue;
    }
    // Keep the agent's order but stable-sort by source preference, so a
    // publisher image wins over a stockist image of the same issue.
    cands.sort((a, b) => (order[a.source_type] ?? 9) - (order[b.source_type] ?? 9));
    let best: { cand: Candidate; width: number; height: number; jpeg: Buffer; low: boolean } | null = null;
    const errors: string[] = [];
    for (const cand of cands) {
      try {
        const c = await convertCover(download(cand.url), cand.url);
        const long = Math.max(c.width, c.height);
        if (!best || long > Math.max(best.width, best.height)) {
          best = { cand, width: c.width, height: c.height, jpeg: c.jpeg, low: c.lowResolution };
        }
        if (long >= MIN_LONG_EDGE) break; // first acceptable in preference order
      } catch (e) {
        errors.push(`${cand.url}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (!best) {
      writeFileSync(outJson, JSON.stringify({ key, status: 'failed', errors }, null, 2));
      console.log(`FAILED ${key}: ${errors.join(' | ')}`);
      continue;
    }
    writeFileSync(join(OUT, `${key}.jpg`), best.jpeg);
    writeFileSync(
      outJson,
      JSON.stringify(
        {
          key,
          status: best.low ? 'low' : 'ok',
          url: best.cand.url,
          page_url: best.cand.page_url,
          source_type: best.cand.source_type,
          issue_label: best.cand.issue_label,
          width: best.width,
          height: best.height,
          bytes: best.jpeg.length,
          errors,
        },
        null,
        2
      )
    );
    done += 1;
    console.log(`${best.low ? 'LOW ' : 'ok  '} ${key} ${best.width}x${best.height} ${best.cand.source_type}`);
  }
  console.log(`fetched ${done}`);
}
main();
