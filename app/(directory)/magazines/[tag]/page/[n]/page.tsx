import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTagBySlug, getTagsWithCounts, PAGE_SIZE, TAG_THRESHOLD } from '@/lib/queries';
import { canonical, nicheProse } from '@/lib/seo';
import { NichePage } from '@/components/NichePage';

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const tags = await getTagsWithCounts();
  const params: { tag: string; n: string }[] = [];
  for (const tag of tags) {
    if (tag.live_count < TAG_THRESHOLD) continue;
    const pages = Math.ceil(tag.live_count / PAGE_SIZE);
    for (let n = 2; n <= pages; n++) params.push({ tag: tag.slug, n: String(n) });
  }
  return params;
}

// Niche pagination self-canonicals on page 2+ (spec 6.1).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string; n: string }>;
}): Promise<Metadata> {
  const { tag, n } = await params;
  const record = await getTagBySlug(tag);
  const name = record ? nicheProse(record.name) : tag.replace(/-/g, ' ');
  return {
    title: `Independent ${name} magazines, page ${n} | Neesh Directory`,
    alternates: { canonical: canonical(`/magazines/${tag}/page/${n}`) },
  };
}

export default async function TagPageN({
  params,
}: {
  params: Promise<{ tag: string; n: string }>;
}) {
  const { tag, n } = await params;
  const page = Number.parseInt(n, 10);
  if (!Number.isInteger(page) || page < 2) notFound();
  return <NichePage tagSlug={tag} page={page} />;
}
