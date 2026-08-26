import type { Metadata } from 'next';
import Link from 'next/link';
import { getCatalogTitles } from '@/lib/queries';
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
  },
};

export default async function DirectoryHome() {
  const titles = await getCatalogTitles();

  // Featured = the three Neesh titles that joined the platform most
  // recently. Gate: the publisher must actually have a magazine listed
  // (neesh_magazine_id), not just an approved account. They lead the grid;
  // everyone else stays alphabetical.
  const featuredSlugs = new Set(
    titles
      .filter((t) => t.available_on_neesh && t.neesh_magazine_id && t.neesh_listed_at)
      .sort((a, b) => (b.neesh_listed_at ?? '').localeCompare(a.neesh_listed_at ?? ''))
      .slice(0, 3)
      .map((t) => t.slug)
  );

  // Only the public fields cross into the client grid.
  const items: CatalogItem[] = titles.map((title) => ({
    id: title.id,
    name: title.name,
    slug: title.slug,
    cover: coverPublicUrl(title.cover_image_path),
    publisher: title.publisher.name,
    niches: title.tags.filter((tag) => tag.category === 'subject').map((tag) => tag.name),
    onNeesh: title.available_on_neesh,
    featured: featuredSlugs.has(title.slug),
  }));
  items.sort((a, b) => Number(b.featured) - Number(a.featured));

  return (
    <>
      <div className="catalog-header">
        <h1>The index of independent print</h1>
        <p>
          300+ independent magazines from 30+ countries. Publishers,{' '}
          <Link href="/auth/publisher">claim</Link> your title.
        </p>
        <p className="muted">
          Missing something? <Link href="/add-title">Add a title</Link>
        </p>
      </div>
      <CatalogGrid items={items} />
    </>
  );
}
