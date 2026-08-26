import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTagBySlug, getTagsWithCounts, PAGE_SIZE, tagPublishes } from '@/lib/queries';
import { canonical, nicheProse } from '@/lib/seo';
import { NichePage } from '@/components/NichePage';

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const tags = await getTagsWithCounts();
  const params: { niche: string; n: string }[] = [];
  for (const tag of tags) {
    if (!tagPublishes(tag)) continue;
    const pages = Math.ceil(tag.live_count / PAGE_SIZE);
    for (let n = 2; n <= pages; n++) params.push({ niche: tag.slug, n: String(n) });
  }
  return params;
}

// Niche pagination self-canonicals on page 2+.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ niche: string; n: string }>;
}): Promise<Metadata> {
  const { niche, n } = await params;
  const record = await getTagBySlug(niche);
  const name = record ? nicheProse(record.name) : niche.replace(/-/g, ' ');
  return {
    title: `Independent ${name} magazines, page ${n} | Neesh Directory`,
    alternates: { canonical: canonical(`/index/${niche}/page/${n}`) },
  };
}

export default async function TagPageN({
  params,
}: {
  params: Promise<{ niche: string; n: string }>;
}) {
  const { niche, n } = await params;
  const page = Number.parseInt(n, 10);
  if (!Number.isInteger(page) || page < 2) notFound();
  return <NichePage tagSlug={niche} page={page} />;
}
