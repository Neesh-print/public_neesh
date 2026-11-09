import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { orderTags } from '@/lib/queries';
import type { Tag } from '@/lib/types';
import { POST as revalidateListing } from '../app/api/revalidate-listing/route';

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

test('revalidate-listing needs a publisher token', async () => {
  const res = await revalidateListing(new NextRequest('https://neesh.art/api/revalidate-listing', { method: 'POST' }));
  assert.equal(res.status, 401);
});

test('listingPaths refreshes only the pages a publisher appears on', async () => {
  const { listingPaths } = await import('@/lib/listing-paths');
  const paths = listingPaths({
    publisherSlugs: ['chew-co'],
    titleSlugs: ['chew', 'chew'],
    tagSlugs: ['food'],
    storeSlugs: ['camden-art-centre-london'],
    citySlugs: ['london'],
  });
  assert.deepEqual(
    paths.sort(),
    [
      '/',
      '/catalog',
      '/catalog/food',
      '/cities',
      '/cities/london',
      '/order/chew',
      '/publishers/chew-co',
      '/stores',
      '/stores/camden-art-centre-london',
      '/titles/chew',
    ].sort()
  );
  // No whole-tree refresh, and no other store or title.
  assert.ok(!paths.includes('/stores/somewhere-else'));
});
