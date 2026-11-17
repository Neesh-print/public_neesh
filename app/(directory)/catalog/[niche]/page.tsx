import type { Metadata } from 'next';
import { getTagBySlug, getTagsWithCounts, tagPublishes } from '@/lib/queries';
import { canonical, nicheProse } from '@/lib/seo';
import { NichePage } from '@/components/NichePage';

// Daily, as a safety net. A publisher's portal edit refreshes the pages it
// touches straight away through /api/revalidate-listing, and imports refresh
// through /api/revalidate, so the timer only has to catch anything else. A
// short timer made every crawl rebuild these pages from the database.
export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const tags = await getTagsWithCounts();
  return tags.filter(tagPublishes).map((t) => ({ niche: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ niche: string }>;
}): Promise<Metadata> {
  const { niche } = await params;
  const record = await getTagBySlug(niche);
  const name = record ? nicheProse(record.name) : niche.replace(/-/g, ' ');
  return {
    title: `Independent ${name} magazines | Neesh Directory`,
    description: `Independent ${name} magazines, verified and indexed by Neesh. Who publishes them, how often, and where from.`,
    alternates: { canonical: canonical(`/index/${niche}`) },
    openGraph: {
      title: `Independent ${name} magazines | Neesh Directory`,
      url: canonical(`/index/${niche}`),
      images: [{ url: '/og.jpg', width: 1200, height: 630 }],
    },
  };
}

export default async function TagPage({ params }: { params: Promise<{ niche: string }> }) {
  const { niche } = await params;
  return <NichePage tagSlug={niche} page={1} />;
}
