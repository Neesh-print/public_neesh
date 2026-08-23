import type { Metadata } from 'next';
import { getTagBySlug, getTagsWithCounts, TAG_THRESHOLD } from '@/lib/queries';
import { canonical, nicheProse } from '@/lib/seo';
import { NichePage } from '@/components/NichePage';

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const tags = await getTagsWithCounts();
  return tags.filter((t) => t.live_count >= TAG_THRESHOLD).map((t) => ({ tag: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const record = await getTagBySlug(tag);
  const name = record ? nicheProse(record.name) : tag.replace(/-/g, ' ');
  return {
    title: `Independent ${name} magazines | Neesh Directory`,
    description: `Independent ${name} magazines, verified and indexed by Neesh. Who publishes them, how often, and where from.`,
    alternates: { canonical: canonical(`/magazines/${tag}`) },
    openGraph: {
      title: `Independent ${name} magazines | Neesh Directory`,
      url: canonical(`/magazines/${tag}`),
    },
  };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  return <NichePage tagSlug={tag} page={1} />;
}
