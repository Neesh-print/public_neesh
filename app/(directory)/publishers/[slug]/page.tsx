import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllVisiblePublisherSlugs, getPublisherBySlug } from '@/lib/queries';
import { canonical, placeLabel } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { TitleCard } from '@/components/TitleCard';

export const revalidate = 86400;
export const dynamicParams = true;

// Thin by design: this page exists mainly so the Periodical schema's
// publisher entity has a canonical URL (spec 5).
export async function generateStaticParams() {
  const slugs = await getAllVisiblePublisherSlugs();
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublisherBySlug(slug);
  if (!result) return { title: 'Not found | Neesh' };
  return {
    title: `${result.publisher.name} | Independent publisher | Neesh`,
    description: `${result.publisher.name} publishes ${result.titles
      .map((t) => t.name)
      .join(', ')}. Profiles on the Neesh independent magazine directory.`,
    alternates: { canonical: canonical(`/publishers/${slug}`) },
  };
}

export default async function PublisherPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublisherBySlug(slug);
  if (!result) notFound();
  const { publisher, titles } = result;
  const place = placeLabel(publisher.city, publisher.country);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: publisher.name,
          url: canonical(`/publishers/${publisher.slug}`),
          ...(publisher.website ? { sameAs: [publisher.website] } : {}),
        }}
      />
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/directory">Directory</Link> / {publisher.name}
      </nav>
      <h1>{publisher.name}</h1>
      <p className="publisher-line">
        Independent publisher{place ? ` in ${place}` : ''}
        {publisher.website && (
          <>
            {' · '}
            <a href={publisher.website} rel="noopener">
              Website
            </a>
          </>
        )}
      </p>
      {publisher.claimed && (
        <p className="muted">This profile is maintained with the publisher.</p>
      )}
      <h2>Titles</h2>
      <ul className="title-grid">
        {titles.map((title) => (
          <TitleCard key={title.id} title={{ ...title, publisher }} />
        ))}
      </ul>
    </>
  );
}
