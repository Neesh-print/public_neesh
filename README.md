# Neesh public site

Next.js (App Router) on Vercel plus Supabase. Carries two things.

1. **The publisher directory**, per the locked v1 spec. Public profiles for
   independent magazines, niche index pages, demand-signal capture, and the
   claim flow.
2. **Pre-existing static pages** served from `public/`: `/curatedpacks` and
   `/newsletter`. They are untouched; `next.config.mjs` rewrites the bare
   paths to their `index.html` files.

## Routes

```
/index                     directory home: intro, tag groups, recent titles
/magazines/[tag]               niche index (publishes only at 5+ live titles)
/magazines/[tag]/page/[n]      niche pagination, self-canonical
/titles/[slug]                 title profile
/publishers/[slug]             thin publisher page (schema anchor)
/out/[slug]                    outbound click logger, 302 to publisher site
/api/signal                    POST demand signal ingest (JSON or form post)
/api/claim                     POST claim submission (manual review in v1)
/api/revalidate                POST token-protected on-demand revalidation
/api/client-error              POST browser render-error reports (error boundaries)
/api/og                        branded OG image fallback
/sitemap.xml                   generated from the DB on request
/robots.txt                    all crawlers allowed, answer-engine bots named
/gone                          410 target used by middleware
```

Rendering is ISR everywhere. `generateStaticParams` prebuilds title,
publisher, and tag pages; `revalidate = 86400` is the safety net; POST
`/api/revalidate` (empty body refreshes the whole tree) after imports or
edits. The only client-side JS on a profile page is the view beacon and two
tiny form enhancements; every CTA is a plain form that works with JS off.

Removed or excluded profiles return **410 Gone** via `middleware.ts`, which
checks the row flags per request on the two profile path shapes and rewrites
to `/gone`. It fails open. If traffic outgrows the per-request lookup, swap
it for an Edge Config or KV list of removed slugs.

## Data

Schema lives in `supabase/migrations/` and is applied to the shared Neesh
Supabase project. Directory tables are prefixed `directory_` because the
platform already owns `publishers` and `magazines` table names. RLS gives the
anon key SELECT only through the visibility predicate

```sql
titles.removed = false
  and titles.status in ('active','dormant')
  and publishers.removed = false
  and publishers.eligible = true
```

and no access at all to `directory_demand_signals` or `directory_claims`.
All writes go through route handlers with the service role key.

## Import pipeline

```bash
npm run validate            # data/import.csv -> clean.json, rejects.csv, tags-missing.csv
npm run load                # clean.json -> Supabase, prints QA counts + sample
npm run remove -- {slug}    # same-day removal: flag + cover delete + revalidate
```

Column mapping and frequency normalization live in `docs/mapping.md`. The
validator rejects rather than fixes; the loop ends at zero rejects. Rows
belonging to claimed publishers are skipped on re-import. Covers are a
separate backfill to Storage at `covers/{title_slug}.jpg`; profile pages have
a designed fallback card, so a missing cover is a rendering case, not an
error.

## Environment

Copy `.env.example` to `.env` and fill it in. Vercel needs the same
variables. Nothing renders private data; `contact_email` and claim emails
never reach a page.

## Checks

```bash
npm run typecheck           # tsc
npm test                    # unit and regression tests (node:test, no database)
npm run smoke               # status, redirect and header checks against a running site
                            # SMOKE_URL=https://... to point it elsewhere
```

CI (`.github/workflows/ci.yml`) runs all of these plus `npm audit` and a
production build on every push, with the database env blanked so nothing
touches production.

The public form routes share `src/lib/forms.ts` (parsing, honeypot,
same-origin redirects) and are rate limited per IP (`src/lib/rate-limit.ts`).
Anything a visitor types is HTML-escaped in emails and only echoed back
through `echoSafe` (`src/lib/notify.ts`).

## Operations

Deploys, rollback, backups and restore, monitoring, staging, spend caps and
email DNS: `docs/operations.md`.
