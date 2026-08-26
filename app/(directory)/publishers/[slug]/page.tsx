import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllVisiblePublisherSlugs, getPublisherBySlug } from '@/lib/queries';
import { canonical } from '@/lib/seo';
import { coverPublicUrl } from '@/lib/supabase';
import { JsonLd } from '@/components/JsonLd';
import { TitleGridCard } from '@/components/TitleGridCard';

export const revalidate = 86400;
export const dynamicParams = true;

// Thin by design: this page exists mainly so the Periodical schema's
// publisher entity has a canonical URL.
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
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/index">Index</Link>
        <span>/</span>
        <span className="here">{publisher.name}</span>
      </nav>
      <section>
        <div className="wrap listing-page">
          <h1 style={{ marginBottom: 12 }}>{publisher.name}</h1>
          <p className="pub-sub">Everything of theirs in the index.</p>
          {publisher.claimed && (
            <p className="claimed-note">This publisher keeps their own pages up to date on Neesh.</p>
          )}
          <h2 className="titles-label">Titles</h2>
          <div className="card-grid">
            {titles.map((title, index) => (
              <TitleGridCard
                key={title.id}
                eager={index < 4}
                item={{
                  id: title.id,
                  name: title.name,
                  slug: title.slug,
                  cover: coverPublicUrl(title.cover_image_path),
                  publisher: publisher.name,
                  niche: null,
                  onNeesh: title.available_on_neesh,
                  featured: false,
                }}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
