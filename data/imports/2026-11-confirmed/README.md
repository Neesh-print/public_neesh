# November 2026 distributor-confirmed titles

Import data for the batch of titles confirmed against distributor catalogues
(KD Presse, Ra & Olly, Antenne, Idea Books, Public Knowledge, Perimeter,
Magazines Canada) in November 2026. Every row was then researched on the
publisher's own site; the per-title research notes are under `work/`.

Nothing here is live. Each row loads with `review_status = pending`, which
the site hides from every public page and from the sitemap (see
`PUBLIC_REVIEW_FILTER` in `src/lib/queries.ts`). Approving is a separate,
reversible step.

## Files

| File | What it is |
|---|---|
| `batch-NN.csv` | Canonical import CSVs, 20 titles each, in the format `npm run validate` reads (see `docs/mapping.md`). |
| `report.csv` | One row per input title: final name, slug, publisher, action (added, skipped, already on Index), reason, cover found (yes, low resolution, no), cover source URL, notes. |
| `approve.sql` | Approves every pending row of this batch in one transaction. |
| `work/` | Research JSON per title, curation (descriptions, tags, decisions), cover manifests, the input list and the session tools that produced the CSVs. Reference only; not read by the scripts. |

Covers were already fetched, re-encoded as JPEG and stored at
`covers/{slug}.jpg` in the public `covers` bucket. `load.ts` sees them there
and does not fetch again; it only sets `cover_image_path`, writes the
`directory_cover_sources` row and the latest `directory_issues` row.

## Loading

The visibility filter in `src/lib/queries.ts` must be deployed before the
rows exist, or pending titles show on the live site. So:

1. Merge this branch and let Vercel deploy it.
2. From the repo root with `.env` holding the service role key:

```sh
for f in data/imports/2026-11-confirmed/batch-0*.csv; do
  npm run validate -- "$f" || break
  npm run load -- --insert-only --note "import 2026-11 distributor-confirmed"
done
```

`--insert-only` never touches a title or publisher that already exists, so
the loop can be re-run safely; it reports "already present" instead.

3. Review in the admin queue (`directory_review_queue`) or by reading
   `report.csv`. Reject anything that should not go live:
   `select review_directory_record('title', '<uuid>', 'rejected');`
4. Approve the batch: run `approve.sql` in the Supabase SQL editor as the
   service role.
5. `POST /api/revalidate` with the revalidate token.
