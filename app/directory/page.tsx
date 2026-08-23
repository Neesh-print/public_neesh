import type { Metadata } from 'next';
import Link from 'next/link';
import { getFeaturedTitles, getTagsWithCounts, TAG_THRESHOLD } from '@/lib/queries';
import { canonical } from '@/lib/seo';
import { TitleCard } from '@/components/TitleCard';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Independent magazine directory | Neesh',
  description:
    'A working index of independent magazines. Browse by niche, see who publishes what, and find where each title comes from.',
  alternates: { canonical: canonical('/directory') },
  openGraph: {
    title: 'Independent magazine directory | Neesh',
    url: canonical('/directory'),
  },
};

export default async function DirectoryHome() {
  const [tags, featured] = await Promise.all([getTagsWithCounts(), getFeaturedTitles(8)]);
  const liveTags = tags.filter((t) => t.live_count >= TAG_THRESHOLD);

  const categories = new Map<string, typeof liveTags>();
  for (const tag of liveTags) {
    const key = tag.category ?? 'More';
    if (!categories.has(key)) categories.set(key, []);
    categories.get(key)!.push(tag);
  }

  return (
    <>
      <h1>The independent magazine directory</h1>
      <p style={{ maxWidth: '44rem' }}>
        Neesh keeps a working index of independent print. Every title here is made by a
        publisher who answers their own email, and every fact on a profile comes from the
        publisher&apos;s own channels. Browse by niche, or start with recent additions.
      </p>

      {liveTags.length > 0 ? (
        <>
          <h2>Browse by niche</h2>
          <div className="tag-groups">
            {[...categories.entries()].map(([category, categoryTags]) => (
              <div className="tag-group" key={category}>
                <h3>{category}</h3>
                <ul>
                  {categoryTags.map((tag) => (
                    <li key={tag.slug}>
                      <Link href={`/magazines/${tag.slug}`}>{tag.name}</Link>{' '}
                      <span className="count">{tag.live_count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="muted">Niche pages are on their way as the index fills out.</p>
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
