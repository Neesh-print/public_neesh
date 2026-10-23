import { test } from 'node:test';
import assert from 'node:assert/strict';

// Regression guard for the 301 map in next.config.mjs: Stripe Payment Links,
// old magic links and indexed URLs depend on these.
type Redirect = { source: string; destination: string; statusCode?: number };

async function loadRedirects(appUrl?: string): Promise<Redirect[]> {
  if (appUrl) process.env.NEXT_PUBLIC_APP_URL = appUrl;
  else delete process.env.NEXT_PUBLIC_APP_URL;
  const mod = await import(`../next.config.mjs?t=${Date.now()}${Math.random()}`);
  return mod.default.redirects();
}

const CRITICAL: [string, string][] = [
  ['/curatedpacks', '/packs'],
  ['/packs/studio', '/packs/fine-print'],
  ['/packs/table-service', '/packs/the-spread'],
  ['/retailers', '/spaces'],
  ['/pricing', '/publishers'],
  ['/explore', '/index'],
  ['/directory', '/index'],
  ['/magazines/:tag', '/index/:tag'],
  ['/legal/terms', '/terms'],
  ['/legal/privacy', '/privacy'],
  ['/titles/dg-quarterly', '/titles/delayed-gratification'],
  ['/cities/portland', '/cities/portland-oregon'],
];

test('critical marketing and directory redirects stay permanent', async () => {
  const redirects = await loadRedirects();
  for (const [source, destination] of CRITICAL) {
    const hit = redirects.find((r) => r.source === source);
    assert.ok(hit, `missing redirect ${source}`);
    assert.equal(hit.destination, destination, source);
    assert.equal(hit.statusCode, 301, source);
  }
});

test('app passthroughs appear only when NEXT_PUBLIC_APP_URL is set', async () => {
  const without = await loadRedirects();
  assert.equal(without.some((r) => r.source === '/login'), false);

  const withApp = await loadRedirects('https://app.neesh.art/');
  const login = withApp.find((r) => r.source === '/login');
  assert.equal(login?.destination, 'https://app.neesh.art/login');
  const reset = withApp.find((r) => r.source === '/reset-password');
  assert.equal(reset?.destination, 'https://app.neesh.art/reset-password');
  const nested = withApp.find((r) => r.source === '/publisher/:path*');
  assert.equal(nested?.destination, 'https://app.neesh.art/publisher/:path*');
  delete process.env.NEXT_PUBLIC_APP_URL;
});

test('security headers are sent on every path', async () => {
  const mod = await import('../next.config.mjs');
  const [rule] = await mod.default.headers!();
  assert.equal(rule.source, '/:path*');
  const keys = rule.headers.map((h: { key: string }) => h.key);
  for (const key of [
    'Strict-Transport-Security',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Referrer-Policy',
    'Permissions-Policy',
    'Content-Security-Policy',
  ]) {
    assert.ok(keys.includes(key), key);
  }
});
