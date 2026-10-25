# Operations runbook

What keeps neesh.art running, how to tell when it is not, and how to recover.
The code side lives in this repo; everything marked **Dashboard** is a setting
someone has to make (or confirm) by hand, because it cannot be expressed in
code.

## 1. Environment variables

Set in Vercel → Project → Settings → Environment Variables. Production and
Preview should be separate values wherever a value grants write access (see
section 6).

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | yes | Canonicals, sitemap, JSON-LD |
| `NEXT_PUBLIC_APP_URL` | yes | Passthrough redirects to app.neesh.art |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public reads (publishable key) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server writes; never `NEXT_PUBLIC_` |
| `SIGNAL_SALT_SECRET` | yes | Daily IP-hash salt. Unset means no IP hash is stored at all |
| `REVALIDATE_TOKEN` | yes | `POST /api/revalidate`, `Authorization: Bearer` header only |
| `RESEND_API_KEY`, `NOTIFY_EMAIL`, `NOTIFY_FROM`, `NOTIFY_REPLY_TO` | yes | Email |
| `UPSTASH_REDIS_REST_*` or `KV_REST_API_*` | recommended | Shared rate-limit counters (section 4); the Marketplace integration sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` |
| `ALERT_EMAIL` | optional | Where error alerts are emailed; defaults to `NOTIFY_EMAIL` (section 3) |
| `ALERT_WEBHOOK_URL` | optional | Slack or Discord webhook that also receives error alerts |
| `CRON_SECRET` | yes | Bearer token Vercel Cron sends to `/api/collect/notify` |
| `COLLECT_LINK_SECRET` | recommended | Signs unfollow and account-deletion links. Unset, links are signed with the service role key (logged as `collect_tokens.secret_fallback`); setting it later keeps links already sent working |

## 2. Deploys and rollback

- Every push runs CI (`.github/workflows/ci.yml`): typecheck, tests,
  dependency audit, build, smoke test. **Dashboard (GitHub):** Settings →
  Branches → add a protection rule on `main` requiring the `checks` job.
- Vercel builds a Preview for every branch and promotes `main` to Production.
- After a production deploy, run the smoke test against it:
  `SMOKE_URL=https://neesh.art SMOKE_DIRECTORY=1 npm run smoke`.

**Rolling back a bad deploy (code):**
1. Vercel → Project → Deployments → pick the last good production deployment
   → ⋯ → **Instant Rollback**. Takes effect in seconds; no rebuild.
2. Revert the offending commit on `main` (`git revert <sha>`) so the next
   deploy does not reintroduce it. Instant Rollback pauses auto-promotion
   until you promote again.
3. Run the smoke test against neesh.art.

**Rolling back a migration:** migrations here have no down scripts. Write a
forward fix as a new migration (that is the Supabase convention), test it on
a branch or scratch project (section 6), then apply. For data damage, see
section 5.

**Cache:** if a rollback leaves stale ISR pages, `POST /api/revalidate` with
the bearer token and an empty body refreshes the whole tree.

## 3. Monitoring and alerting

Already in the code:
- **Error tracking:** `instrumentation.ts` logs every unhandled server error
  (pages, route handlers, middleware); `app/error.tsx` and
  `app/global-error.tsx` report browser render errors to `/api/client-error`.
- **Structured logs:** one JSON object per line (`src/lib/log.ts`) with
  `level` and `event`; emails, tokens and keys are redacted. Search them in
  Vercel → Logs, e.g. `"level":"error"`.
- **Alerts:** every error-level event, from production only, is emailed to
  `ALERT_EMAIL` (or `NOTIFY_EMAIL`), added as a high-priority `system`
  notification for every admin (`public.users.role = 'admin'`) on the admin
  dashboard, and posted to `ALERT_WEBHOOK_URL` if set. At most once per
  event per instance every 10 minutes. Covers failed inserts, failed email
  sends, the notify cron and unhandled errors. If Resend itself is down the
  email cannot go out, but the dashboard notification still lands.
- **Performance:** Vercel Speed Insights is installed.

**Dashboard, to finish:**
- [ ] Optional: set `ALERT_EMAIL` if alerts should go somewhere other than
      `NOTIFY_EMAIL`, or `ALERT_WEBHOOK_URL` for a Slack or Discord channel.
- [ ] Vercel → Project → Speed Insights → Enable. (On Pro this is a paid add-on;
      check the price first.)
- [ ] Optional: a log drain (Vercel → Settings → Log Drains) to Axiom or
      Better Stack for retention beyond Vercel's window, or Sentry
      (`@sentry/nextjs`) for stack-trace grouping.

**Uptime (Dashboard):** create checks in Better Stack, UptimeRobot or
Checkly (free tiers suffice), alerting to the same channel:

| URL | Expect | Interval |
|---|---|---|
| `https://neesh.art/` | 200, body contains `Neesh` | 1 min |
| `https://neesh.art/index` | 200 | 5 min |
| `https://neesh.art/sitemap.xml` | 200, body contains `/titles/` (proves the DB answers) | 5 min |
| `https://app.neesh.art/login` | 200 | 1 min |

Uptime bots are filtered out of demand signals by user agent (`isBot`).

## 4. Rate limiting and abuse

Every public route is limited per client IP (`src/lib/rate-limit.ts`): form
routes 5 per 10 minutes and 20 per day, view beacons 60 per minute, search 60
per minute, OG images 120 per minute, revalidate 10 per minute. Each email
address receives at most 3 confirmation emails a day. Forms also carry a
honeypot field.

Without Upstash the counters are per serverless instance, which only slows
a determined client. **Dashboard:** Vercel → Marketplace → Upstash →
**Upstash for Redis** (free plan is enough), connect it to this project, and
its `KV_REST_API_URL` / `KV_REST_API_TOKEN` variables are set for you; the
code reads those or `UPSTASH_REDIS_REST_*`. Redeploy afterwards. Optionally add a Vercel
Firewall rate-limit rule on `/api/*` as a second layer.

## 5. Backups and restore

**Dashboard: confirm backups.** Supabase → Project → Database → Backups.
- Pro plan and above: daily backups, 7 days retained (longer on Team).
  Free projects have **no** downloadable backups.
- Point-in-time recovery is a paid add-on (Database → Backups → PITR). Turn it
  on if losing up to a day of claims, signals and suggestions is not
  acceptable.

**Independent logical backup** (keeps working if the project itself is lost):
```bash
# Connection string: Supabase → Project Settings → Database → Connection string (URI, session pooler)
pg_dump "$SUPABASE_DB_URL" --schema=public --no-owner --format=custom \
  --file "neesh-$(date +%F).dump"
```
Run weekly (a scheduled GitHub Action with the URL as a repository secret,
uploading to private storage) and keep at least four. The dump contains
claimant and subscriber emails: store it encrypted and access-controlled.

Covers live in Supabase Storage (`covers` bucket) and are not in database
backups. Copy them periodically with `supabase storage cp -r ss:///covers ./covers-backup --experimental`
or rely on the import pipeline being able to regenerate them.

**Restore procedure (test it once a quarter):**
1. Create a scratch Supabase project (or a branch).
2. Restore: Dashboard → Database → Backups → Restore into the scratch
   project, or `pg_restore --no-owner --dbname "$SCRATCH_DB_URL" neesh-YYYY-MM-DD.dump`.
3. Point a local build at it (`NEXT_PUBLIC_SUPABASE_URL`, keys of the scratch
   project) and run `npm run build && npx next start` then
   `SMOKE_DIRECTORY=1 npm run smoke`.
4. Spot-check row counts against production: `directory_titles`,
   `directory_publishers`, `directory_stores`, `directory_claims`,
   `mailing_list_subscribers`.
5. Write the date, backup used, time taken and any problems at the bottom of
   this file. Delete the scratch project.

For a real incident: restore into a new project first, verify as above, then
either swap the site's env vars to the new project or restore in place
(Dashboard restore overwrites production; take a fresh backup before).

## 6. Staging

Preview deployments currently share the production database, so testing a
form on a preview writes real claims and sends real email.

**Dashboard, to finish:**
- [ ] Create a staging database: a Supabase branch (Pro, Database →
      Branches) or a separate free project, with the migrations in
      `supabase/migrations` applied.
- [ ] Vercel → Environment Variables: give the **Preview** environment the
      staging `NEXT_PUBLIC_SUPABASE_URL`, anon key and service role key, a
      different `REVALIDATE_TOKEN`, and either no `RESEND_API_KEY` or a Resend
      test key, so previews cannot email real people.

## 7. Database migrations to apply

Written in this repo, not yet applied (nothing here applies migrations
automatically):
- `20261023120000_revoke_internal_function_execute.sql`: stops the public
  key from calling `refresh_directory_cities()` and the internal helpers.
  Safe for the site; apply with `supabase db push` or the SQL editor.
- `20261025120000_collect_hardening.sql`: one open report per reader per
  record, flagging needs two different readers, 20 reports a day per
  reader; drops the reader-edit policies; the duplicate checks stop
  suggesting removed and rejected records; anonymous-activity claims limited
  to 30 days. Safe for the site and the add flow; apply as above.

Confirm already-written migrations are live:
- `20261014130000_hide_publisher_private_columns.sql`. Check with
  `supabase migration list`, or as the anon role:
  `curl "$URL/rest/v1/directory_publishers?select=contact_email&limit=1" -H "apikey: $ANON"`
  must return a permission error, not data.
- `mailing_list_subscribers` (owned by the app repo) must allow anon INSERT
  only: the same curl with `select=email` must return an error or `[]`.

## 8. Paid services: spend caps and billing alerts

| Service | Used for | Where to set limits |
|---|---|---|
| Vercel | Hosting, functions, Web Analytics, Speed Insights | Settings → Billing → Spend Management: set a cap and alert thresholds; enable "pause projects" at the cap only if downtime beats overage |
| Supabase | Database, Storage, REST | Organization → Billing: keep Spend Cap **on** (Pro), add usage email alerts |
| Resend | Transactional email | Settings → Usage: confirm plan limit; usage alerts. The per-recipient cap in code limits abuse-driven volume |
| Upstash (if added) | Rate-limit counters | Database → Usage: set a monthly budget |
| Stripe | Pack Payment Links | No spend, but: Radar rules on, dispute and payout emails on |
| HubSpot | Marketing email (root SPF includes it) | Account → Billing: contact tier limits |
| Google Tag Manager / GA4, Google Fonts | Analytics, fonts | Free |

## 9. Domain, TLS and email authentication

**Dashboard (Vercel → Domains):** confirm `neesh.art` and `www.neesh.art` show
Valid Configuration, certificates auto-renew, and `www` redirects to the
apex. The app sends `Strict-Transport-Security: max-age=63072000`; once every
subdomain is HTTPS-only, add `includeSubDomains` in `next.config.mjs`.

**DNS (at the registrar), as found on 2026-10-23:**
- DKIM for Resend (`resend._domainkey`) and SPF for the Resend return path
  (`send.neesh.art`, Amazon SES): present.
- Root SPF: `v=spf1 include:244009354.spf05.hubspotemail.net ~all`. MX is
  Google Workspace, so mail sent from Gmail as `@neesh.art` fails SPF. Change to:
  `v=spf1 include:_spf.google.com include:244009354.spf05.hubspotemail.net ~all`
  (and make sure Google Workspace DKIM is enabled: Admin → Apps → Gmail →
  Authenticate email).
- DMARC: `v=DMARC1; p=none;` with no reporting. Change to
  `v=DMARC1; p=none; rua=mailto:dmarc@neesh.art; adkim=r; aspf=r` now, read
  the reports for two to four weeks, then move to `p=quarantine` and later
  `p=reject` once Google, HubSpot and Resend all pass.

## 10. Follow-ups not done in code

- **Full Content-Security-Policy.** The current CSP only blocks framing,
  plugins and `<base>` hijacking. A `script-src` policy needs the list of
  tags the GTM container ("Neesh Web") injects; ship it as
  `Content-Security-Policy-Report-Only` first.
- **Next.js 16 and TypeScript 7.** Both are major upgrades with breaking
  changes (Next 16 renames middleware to proxy and changes build defaults);
  do them in their own PR with CI and a preview check.
- **Image weight.** Existing assets were recompressed (9.4 MB to 5.1 MB) in
  October 2026. Run `npm run optimize-images` after adding large photos; it
  reports savings, and `-- --write` applies them.
- **Privacy policy.** The cookie paragraph needs updating for the new
  consent banner; proposed text for counsel is in
  `docs/privacy-cookie-update.md`.

## 11. Your collection (/collect)

- **Notify cron** (`/api/collect/notify`, daily via `vercel.json`): returns
  `unfinished: true` when it ran out of time; the next run completes the
  job without re-sending. A query error now fails the run (500) and alerts.
- **Newsletter opt-in** is stored on `collectors.newsletter_opt_in` with
  `newsletter_consent_at`. Nothing in this repo sends to or syncs it into the
  mailing list: whatever sends the newsletter has to read it, and stop
  mailing readers who delete their account (the row is deleted with them).
- **Reports**: two different readers reporting a record set it to
  `flagged` for review. Flagged admin records stay public and indexed;
  unreviewed reader additions are `noindex`, out of the sitemap, and their
  website is not linked or redirected to until approved.
