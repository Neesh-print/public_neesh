import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { askFirstFor, consentHeadScript } from '@/lib/consent';

// Runs the inline head script against a fake document and reports whether
// gtm.js was requested and what Consent Mode was told.
function run(cookie: string, timeZone = 'America/New_York', gpc = false) {
  const inserted: string[] = [];
  const window: Record<string, unknown> = {
    Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone }) }) },
    navigator: { globalPrivacyControl: gpc },
  };
  const document = {
    cookie,
    createElement: () => ({ async: false, src: '' }),
    getElementsByTagName: () => [
      { parentNode: { insertBefore: (el: { src: string }) => inserted.push(el.src) } },
    ],
  };
  vm.runInNewContext(consentHeadScript('GTM-TEST'), { window, document });
  const dataLayer = (window.dataLayer as unknown[]).map((e) =>
    typeof e === 'object' && e && 'length' in (e as object) ? Array.from(e as ArrayLike<unknown>) : e
  );
  const updates = dataLayer.filter((e) => Array.isArray(e) && e[1] === 'update') as unknown[][];
  return { inserted, dataLayer, updates, window };
}

const GTM = 'https://www.googletagmanager.com/gtm.js?id=GTM-TEST';

test('consent always starts denied', () => {
  const first = run('').dataLayer[0] as unknown[];
  assert.deepEqual(first.slice(0, 2), ['consent', 'default']);
  assert.equal((first[2] as Record<string, string>).analytics_storage, 'denied');
  assert.equal((first[2] as Record<string, string>).ad_storage, 'denied');
});

test('US visitor without a choice: GTM loads with analytics and ad measurement, no remarketing', () => {
  const { inserted, updates } = run('', 'America/New_York');
  assert.deepEqual(inserted, [GTM]);
  const granted = updates[0][2] as Record<string, string>;
  assert.equal(granted.analytics_storage, 'granted');
  assert.equal(granted.ad_storage, 'granted');
  assert.equal(granted.ad_user_data, 'granted');
  assert.equal(granted.ad_personalization, undefined);
});

test('EU/UK visitor without a choice: nothing loads', () => {
  for (const tz of ['Europe/Paris', 'Europe/London', 'Atlantic/Canary', 'Asia/Nicosia']) {
    assert.equal(run('', tz).inserted.length, 0, tz);
  }
});

test('unknown or UTC time zone is treated as ask-first', () => {
  assert.equal(run('', '').inserted.length, 0);
  assert.equal(run('', 'UTC').inserted.length, 0);
  assert.equal(run('', 'Etc/UTC').inserted.length, 0);
});

test('Global Privacy Control in the US blocks the default load', () => {
  assert.equal(run('', 'America/Los_Angeles', true).inserted.length, 0);
});

test('a declined choice keeps GTM unloaded anywhere', () => {
  assert.equal(run('neesh_consent=denied', 'America/New_York').inserted.length, 0);
  assert.equal(run('neesh_consent=denied', 'Europe/Berlin').inserted.length, 0);
});

test('a current grant in the EU loads with ad measurement, once', () => {
  const { inserted, updates, window } = run('neesh_consent=granted; neesh_consent_v=2', 'Europe/Berlin');
  assert.deepEqual(inserted, [GTM]);
  assert.equal((updates[0][2] as Record<string, string>).ad_storage, 'granted');
  (window.__neeshLoadAnalytics as (s: string) => void)('full');
  assert.equal(inserted.length, 1);
});

test('an older EU grant (analytics-only wording) stays analytics-only', () => {
  const { inserted, updates } = run('other=1; neesh_consent=granted', 'Europe/Berlin');
  assert.deepEqual(inserted, [GTM]);
  const granted = updates[0][2] as Record<string, string>;
  assert.equal(granted.analytics_storage, 'granted');
  assert.equal(granted.ad_storage, 'denied');
});

test('askFirstFor matches the inline script', () => {
  const cases: [string, boolean, boolean][] = [
    ['America/New_York', false, false],
    ['America/Chicago', true, true],
    ['Europe/Dublin', false, true],
    ['Atlantic/Reykjavik', false, true],
    ['Asia/Tokyo', false, false],
    ['', false, true],
    ['UTC', false, true],
  ];
  for (const [tz, gpc, expected] of cases) {
    assert.equal(askFirstFor(tz, gpc), expected, tz);
    assert.equal(run('', tz, gpc).inserted.length === 0, expected, `inline ${tz}`);
  }
});
