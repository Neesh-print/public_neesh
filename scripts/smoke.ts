// Smoke test: request the pages and endpoints that must always answer, and
// check status codes, redirects and headers. Read-only: no form posts.
//
//   npm run smoke                                   # http://localhost:3000
//   SMOKE_URL=https://<preview>.vercel.app npm run smoke
//   SMOKE_URL=https://neesh.art SMOKE_DIRECTORY=1 npm run smoke
//
// SMOKE_DIRECTORY=1 adds checks that need a populated database (the index
// listing a title, a title page rendering); CI builds without database
// credentials and leaves it off.

const base = (process.env.SMOKE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const withDirectory = process.env.SMOKE_DIRECTORY === '1';

interface Check {
  path: string;
  status: number;
  location?: string;
  contains?: string;
  header?: [string, RegExp];
}

const checks: Check[] = [
  { path: '/', status: 200, contains: 'Neesh', header: ['x-content-type-options', /nosniff/] },
  { path: '/index', status: 200 },
  { path: '/packs', status: 200 },
  { path: '/publishers', status: 200 },
  { path: '/spaces', status: 200 },
  { path: '/faq', status: 200 },
  { path: '/privacy', status: 200 },
  { path: '/terms', status: 200 },
  { path: '/robots.txt', status: 200, contains: 'Sitemap:' },
  { path: '/sitemap.xml', status: 200, contains: '<urlset' },
  { path: '/llms.txt', status: 200, contains: '# Neesh' },
  { path: '/api/og?title=Smoke', status: 200, header: ['content-type', /image\/png/] },
  { path: '/gone', status: 410 },
  { path: '/this-page-does-not-exist-smoke', status: 404 },
  { path: '/pricing', status: 308, location: '/publishers' },
  { path: '/curatedpacks?session_id=cs_test', status: 308, location: '/packs?session_id=cs_test' },
];

if (withDirectory) {
  checks.push({ path: '/index', status: 200, contains: '/titles/' });
  checks.push({ path: '/sitemap.xml', status: 200, contains: '/titles/' });
}

async function run(check: Check): Promise<string | null> {
  const res = await fetch(base + check.path, {
    redirect: 'manual',
    signal: AbortSignal.timeout(20_000),
    headers: { 'user-agent': 'neesh-smoke/1.0' },
  });
  // Next answers permanent redirects with 308 to browsers and 301 to some
  // clients; treat either as permanent.
  const permanent = (s: number) => s === 301 || s === 308;
  const statusOk =
    res.status === check.status || (permanent(check.status) && permanent(res.status));
  if (!statusOk) return `expected ${check.status}, got ${res.status}`;
  if (check.location) {
    const location = res.headers.get('location') ?? '';
    const path = location.startsWith('http') ? new URL(location).pathname + new URL(location).search : location;
    if (path !== check.location) return `expected Location ${check.location}, got ${location}`;
  }
  if (check.header) {
    const [name, pattern] = check.header;
    const value = res.headers.get(name) ?? '';
    if (!pattern.test(value)) return `header ${name}: ${value || '(missing)'}`;
  }
  if (check.contains) {
    const body = await res.text();
    if (!body.includes(check.contains)) return `body missing ${JSON.stringify(check.contains)}`;
  }
  return null;
}

async function main() {
  let failed = 0;
  for (const check of checks) {
    let problem: string | null;
    try {
      problem = await run(check);
    } catch (err) {
      problem = err instanceof Error ? err.message : String(err);
    }
    if (problem) failed += 1;
    console.log(`${problem ? 'FAIL' : 'ok  '} ${check.path}${problem ? `  ${problem}` : ''}`);
  }
  console.log(`\n${checks.length - failed}/${checks.length} passed against ${base}`);
  process.exit(failed ? 1 : 0);
}

main();
