import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diff, imageType, publisherSchema, subjectSelection, titleSchema } from '@/lib/listing/schema';
import { orderTags } from '@/lib/queries';
import type { Tag } from '@/lib/types';

const A = '7d9f2c3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f';
const B = '8d9f2c3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f';
const C = '9d9f2c3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f';

const baseTitle = {
  name: '  Cake Zine ',
  description: '',
  frequency: 'biannual',
  cover_price: '',
  currency: '',
  trim_size: '',
  page_count: '120',
  country: 'gb',
  city: 'London',
  status: 'active',
  last_issue_date: '',
  subscribe_url: 'cakezine.com/subscribe',
  primary_tag: A,
  subject_tags: [B],
  identity_tags: [],
};

test('title edits: blanks clear, values coerce, urls get a scheme', () => {
  const r = titleSchema.safeParse(baseTitle);
  assert.ok(r.success);
  if (!r.success) return;
  assert.equal(r.data.name, 'Cake Zine');
  assert.equal(r.data.description, null);
  assert.equal(r.data.page_count, 120);
  assert.equal(r.data.country, 'GB');
  assert.equal(r.data.subscribe_url, 'https://cakezine.com/subscribe');
  assert.equal(r.data.cover_price, null);
});

test('title edits: a price needs a currency, a niche is required, status is controlled', () => {
  assert.equal(titleSchema.safeParse({ ...baseTitle, cover_price: '18' }).success, false);
  assert.ok(titleSchema.safeParse({ ...baseTitle, cover_price: '18', currency: 'gbp' }).success);
  assert.equal(titleSchema.safeParse({ ...baseTitle, primary_tag: '' }).success, false);
  assert.equal(titleSchema.safeParse({ ...baseTitle, status: 'removed' }).success, false);
  assert.equal(titleSchema.safeParse({ ...baseTitle, name: '   ' }).success, false);
  assert.equal(titleSchema.safeParse({ ...baseTitle, subscribe_url: 'javascript:alert(1)' }).success, false);
});

test('publisher edits validate country and urls', () => {
  assert.ok(publisherSchema.safeParse({ name: 'Noble Rot', website: '', city: '', country: '', stockist_page_url: '' }).success);
  assert.equal(publisherSchema.safeParse({ name: 'X', country: 'Britain' }).success, false);
});

test('subjectSelection puts the primary first, de-duplicates and caps at three', () => {
  assert.deepEqual(subjectSelection(A, [A, B]), [A, B]);
  assert.deepEqual(subjectSelection(A, [B, C, '0d9f2c3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f']), [A, B, C]);
});

test('diff reports only changed fields', () => {
  assert.deepEqual(diff({ a: 1, b: 'x', c: null }, { a: '1', b: 'y', c: null }), { b: { from: 'x', to: 'y' } });
  assert.deepEqual(diff({ n: ['a', 'b'] }, { n: ['a', 'b'] }), {});
});

test('imageType recognises covers by their bytes', () => {
  assert.equal(imageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext, 'jpg');
  assert.equal(imageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))?.ext, 'png');
  assert.equal(imageType(new TextEncoder().encode('RIFF____WEBPVP8 '))?.ext, 'webp');
  assert.equal(imageType(new TextEncoder().encode('<svg onload=x>')), null);
});

test('orderTags puts the chosen primary niche first', () => {
  const tag = (id: string, category: string): Tag => ({ id, slug: id, name: id, category, intro_md: null });
  const order = orderTags([
    { tag: tag('women-led', 'identity') },
    { tag: tag('travel', 'subject') },
    { tag: tag('food', 'subject'), is_primary: true },
    { tag: null },
  ]).map((t) => t.id);
  assert.deepEqual(order, ['food', 'travel', 'women-led']);
  assert.deepEqual(orderTags([{ tag: tag('art', 'subject') }, { tag: tag('music', 'subject') }]).map((t) => t.id), ['art', 'music']);
});

test('the emailed link sets a session cookie; a session token is not a link', async () => {
  process.env.COLLECT_LINK_SECRET = 'test-secret';
  const { NextRequest } = await import('next/server');
  const { GET } = await import('../app/api/listing/session/route');
  const { linkToken, sessionToken } = await import('@/lib/listing/server');

  const good = await GET(new NextRequest(`https://neesh.art/api/listing/session?t=${linkToken('Pub@Example.com')}`));
  assert.equal(new URL(good.headers.get('location')!).pathname, '/listing/edit');
  assert.match(good.headers.get('set-cookie') ?? '', /neesh_listing=.+HttpOnly/i);

  const wrongKind = await GET(new NextRequest(`https://neesh.art/api/listing/session?t=${sessionToken('pub@example.com')}`));
  assert.match(wrongKind.headers.get('location')!, /listing_expired/);
  assert.equal(wrongKind.headers.get('set-cookie'), null);
});
