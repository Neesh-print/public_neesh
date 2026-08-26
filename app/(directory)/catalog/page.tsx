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

  // Only the public fields cross into the client grid.
  const items: CatalogItem[] = titles.map((title) => ({
    id: title.id,
    name: title.name,
    slug: title.slug,
    cover: coverPublicUrl(title.cover_image_path),
    publisher: title.publisher.name,
    niches: title.tags.filter((tag) => tag.category === 'subject').map((tag) => tag.name),
  }));

  return (
    <>
      <div className="catalog-header">
        <h1>The index of independent print</h1>
        <p>
          300+ independent magazines from 30+ countries. Browse by niche, find what
          belongs on your shelf, and get it.
        </p>
        <p>
          Publishers, your title is probably already here.{' '}
          <Link href="/auth">Claim it</Link>
        </p>
      </div>
      <CatalogGrid items={items} />
    </>
  );
}
