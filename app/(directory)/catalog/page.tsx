import type { Metadata } from 'next';
import Link from 'next/link';
import { getCatalogTitles, pickFeaturedSlugs, sortForIndex } from '@/lib/queries';
import { titleCardMeta } from '@/lib/format';
import { canonical } from '@/lib/seo';
import { coverPublicUrl } from '@/lib/supabase';
import { CatalogGrid, type CatalogItem } from '@/components/CatalogGrid';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'The index of independent print | Neesh',
  description:
    '300+ independent magazines from 30+ countries. Browse by niche, find what belongs on your shelf, and get it.',
  alternates: { canonical: canonical('/index') },
  openGraph: {
    title: 'The index of independent print | Neesh',
    url: canonical('/index'),
    images: [{ url: '/og.jpg', width: 1200, height: 630 }],
  },
};

export default async function DirectoryHome() {
  const titles = await getCatalogTitles();

  // Featured = the three Neesh titles whose publishers joined the platform
  // most recently (see pickFeaturedSlugs). They lead the grid, then every
  // title orderable on Neesh, then everyone else, each group alphabetical.
  // Same ordering as the niche pages (sortForIndex).
  const featured = pickFeaturedSlugs(titles);
  const featuredSlugs = new Set(featured);

  // Only the public fields cross into the client grid.
  const items: CatalogItem[] = sortForIndex(titles, featured).map((title) => ({
    id: title.id,
    name: title.name,
    slug: title.slug,
    cover: coverPublicUrl(title.cover_image_path),
    publisher: title.publisher.name,
    meta: titleCardMeta(title),
    niches: title.tags.filter((tag) => tag.category === 'subject').map((tag) => tag.name),
    onNeesh: title.available_on_neesh,
    featured: featuredSlugs.has(title.slug),
  }));

  return (
    <>
      <section>
        <div className="index-head">
          <h1>The index of independent print</h1>
          <nav className="index-head-links" aria-label="More from the index">
            <Link href="/cities">Browse by city &rarr;</Link>
            <span aria-hidden="true">/</span>
            <Link href="/stores">Browse by space &rarr;</Link>
            <span aria-hidden="true">/</span>
            <Link href="/add-title">Add a title &rarr;</Link>
          </nav>
        </div>
      </section>
      <section>
        <div className="wrap index-body">
          <CatalogGrid items={items} />
        </div>
      </section>
    </>
  );
}
