import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { consentHeadScript } from '@/lib/consent';

// Runs the inline head script against a fake document and reports whether
// gtm.js was requested and what Consent Mode was told.
function run(cookie: string) {
  const inserted: string[] = [];
  const window: Record<string, unknown> = {};
  const document = {
    cookie,
    createElement: () => ({ async: false, src: '' }),
    getElementsByTagName: () => [
      { parentNode: { insertBefore: (el: { src: string }) => inserted.push(el.src) } },
    ],
  };
  vm.runInNewContext(consentHeadScript('GTM-TEST'), { window, document });
  const dataLayer = window.dataLayer as unknown[];
  return { inserted, dataLayer, window };
}

test('without a stored choice, consent defaults to denied and GTM is not loaded', () => {
  const { inserted, dataLayer } = run('');
  assert.equal(inserted.length, 0);
  const first = Array.from(dataLayer[0] as ArrayLike<unknown>);
  assert.equal(first[0], 'consent');
  assert.equal(first[1], 'default');
  assert.equal((first[2] as Record<string, string>).analytics_storage, 'denied');
});

test('a declined choice keeps GTM unloaded', () => {
  assert.equal(run('neesh_consent=denied').inserted.length, 0);
});

test('a stored grant loads GTM once and updates consent', () => {
  const { inserted, dataLayer, window } = run('other=1; neesh_consent=granted');
  assert.deepEqual(inserted, ['https://www.googletagmanager.com/gtm.js?id=GTM-TEST']);
  const update = Array.from(dataLayer[1] as ArrayLike<unknown>);
  assert.deepEqual(update.slice(0, 2), ['consent', 'update']);
  (window.__neeshLoadAnalytics as () => void)();
  assert.equal(inserted.length, 1);
});
