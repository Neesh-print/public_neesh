// Acceptance checks from the build spec: the four example plans must return
// the prototype's numbers to the dollar, and the quiz check must reproduce
// its verdict. Run with `npm test`.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fmt } from './format';
import { BASE, DEFAULTS, QUIZ_START, cash, fromQuiz, model, securedState, verdict, type PresetKey } from './model';

const EXPECTED: Record<PresetKey, { profit: string; secured: string; cash: string; raw: number }> = {
  indie: { profit: '$1,746', secured: '-$10,301', cash: '$12,124', raw: 1746.0 },
  zine: { profit: '$511', secured: '-$531', cash: '$704', raw: 510.74 },
  annual: { profit: '$13,230', secured: '-$23,568', cash: '$31,248', raw: 13230.16 },
  creator: { profit: '$21,309', secured: '-$7,264', cash: '$9,764', raw: 21308.69 },
};

for (const key of Object.keys(EXPECTED) as PresetKey[]) {
  test(`example plan: ${key}`, () => {
    const s = DEFAULTS[key];
    const m = model(s);
    assert.equal(fmt(m.profit), EXPECTED[key].profit, 'profit');
    assert.equal(m.profit.toFixed(2), EXPECTED[key].raw.toFixed(2), 'unrounded profit');
    assert.equal(fmt(model(securedState(s)).profit), EXPECTED[key].secured, 'confirmed only');
    assert.equal(fmt(Math.max(0, -cash(s).low)), EXPECTED[key].cash, 'cash needed');
  });
}

test('the four figures agree', () => {
  for (const key of Object.keys(DEFAULTS) as PresetKey[]) {
    const s = DEFAULTS[key];
    const m = model(s);
    const c = cash(s);
    // Profit in the answer equals the last running total in the Cash tab.
    assert.equal(fmt(c.final), fmt(m.profit), `${key}: cash timeline ends at profit`);
    // The Channels table reaches profit from the same components.
    assert.equal(fmt(m.revenue - m.variable - m.production - m.fixed), fmt(m.profit), `${key}: channels sum to profit`);
  }
});

test('quiz check from the spec', () => {
  const Q = {
    ...QUIZ_START,
    price: 18,
    pages: 96,
    ipy: 3,
    run: 800,
    ch: { subs: true, single: true, spaces: true, dist: true, brands: false },
    sold: Math.round((800 * 0.65) / 10) * 10,
  };
  const s = fromQuiz(Q);
  const m = model(s);
  assert.equal(m.allocated, 640, 'allocated copies');
  assert.equal(
    verdict(s),
    'This issue loses $3,370 even if sales hit plan, $9,442 on confirmed money alone, and needs $9,506 up front.'
  );
});

test('BASE carries no per-magazine figures', () => {
  assert.equal('price' in BASE, false);
});

test('confirmed grant money counts dollar for dollar, before printing', () => {
  const s = { ...DEFAULTS.indie, grant: 2000 };
  const m = model(s);
  assert.equal(m.profit.toFixed(2), (model(DEFAULTS.indie).profit + 2000).toFixed(2));
  assert.equal(model(securedState(s)).profit.toFixed(2), (model(securedState(DEFAULTS.indie)).profit + 2000).toFixed(2));
  const before = cash(s).stages[0].items.find((i) => i[0] === 'Grant money');
  assert.deepEqual(before, ['Grant money', 2000]);
});

test('quiz: selling out leaves no comps; ad rate is the reader’s own', () => {
  const sellOut = fromQuiz({ ...QUIZ_START, run: 1000, sold: 1000, touched: true });
  assert.equal(sellOut.comps, 0);
  assert.equal(model(sellOut).allocated <= 1000, true);
  const noRate = fromQuiz({ ...QUIZ_START, fund: { ads: true, partners: false, grants: false } });
  assert.equal(noRate.adRate, 0);
  assert.equal(noRate.adPages, 2);
  const withGrant = fromQuiz({ ...QUIZ_START, fund: { ads: false, partners: false, grants: true }, grant: 1500 });
  assert.equal(withGrant.grant, 1500);
  assert.equal(withGrant.ch?.brands, true);
});

test('plan email carries the four figures, the verdict and the link', async () => {
  const { planEmail, emailText } = await import('./email');
  const m = planEmail(DEFAULTS.indie, 'Indie biannual', { shareUrl: 'https://neesh.art/calculator?s=abcdefghij', claimUrl: 'https://neesh.art/auth/publisher' });
  assert.equal(m.subject, 'Indie biannual makes $1,746 if sales hit plan');
  for (const line of ['**Profit** $1,746', '**Confirmed only** -$10,301', '**Cash needed** $12,124', '**Break-even** 942 copies', '(https://neesh.art/calculator?s=abcdefghij)', 'shipping 300 copies to a distributor', 'Raise your cover by $2, to $27. Worth +$1,091.']) {
    assert.ok(m.text.includes(line), line);
  }
  assert.ok(m.text.includes(verdict(DEFAULTS.indie)));
  assert.ok(!/^\*\*[^*]+:\*\*$/m.test(m.text), 'no colons in headings');
  assert.ok(!m.text.includes('\u2014'), 'no em dashes');
  assert.ok(emailText(m.text).includes('Open and edit your plan, https://neesh.art/calculator?s=abcdefghij'));
  const loss = planEmail({ ...DEFAULTS.zine, price: 4 }, undefined, { shareUrl: 'https://x/y', claimUrl: 'https://x/c' });
  assert.ok(loss.subject.startsWith('Your issue loses'), loss.subject);
  assert.ok(loss.text.includes('Fix the plan before you book the printer.'));
});
