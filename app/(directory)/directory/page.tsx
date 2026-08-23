import type { Metadata } from 'next';
import Link from 'next/link';
import { getFeaturedTitles, getTagsWithCounts, TAG_THRESHOLD } from '@/lib/queries';
import { canonical } from '@/lib/seo';
import { TitleCard } from '@/components/TitleCard';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'The index of independent print | Neesh',
  description:
    '300+ independent magazines from 30+ countries. Browse by niche, find what belongs on your shelf, and get it.',
  alternates: { canonical: canonical('/directory') },
  openGraph: {
    title: 'The index of independent print | Neesh',
    url: canonical('/directory'),
  },
};

export default async function DirectoryHome() {
  const [tags, featured] = await Promise.all([getTagsWithCounts(), getFeaturedTitles(8)]);
  const liveTags = tags.filter((t) => t.live_count >= TAG_THRESHOLD);

  return (
    <>
      <h1>The index of independent print</h1>
      <p style={{ maxWidth: '44rem' }}>
        300+ independent magazines from 30+ countries. Browse by niche, find what belongs
        on your shelf, and get it.
      </p>
      <p>
        Publishers, your title is probably already here. <Link href="/auth">Claim it</Link>
      </p>
      <p>
        <a className="button ghost" href="#niches">
          Browse by niche
        </a>
      </p>

      {liveTags.length > 0 ? (
        <section id="niches">
          <h2>Browse by niche</h2>
          <ul className="niche-list">
            {liveTags.map((tag) => (
              <li key={tag.slug}>
                <Link href={`/magazines/${tag.slug}`}>{tag.name}</Link>{' '}
                <span className="count">{tag.live_count}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="muted" id="niches">
          Niche pages are on their way as the index fills out.
        </p>
      )}

      {featured.length > 0 && (
        <>
          <h2>Recently added</h2>
          <ul className="title-grid">
            {featured.map((title) => (
              <TitleCard key={title.id} title={title} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}
