import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getAllVisibleTitleSlugs,
  getTagsWithCounts,
  getTitleBySlug,
  tagPublishes,
} from '@/lib/queries';
import {
  breadcrumbLd,
  canonical,
  countryName,
  FREQUENCY_LABELS,
  ogImageForTitle,
  periodicalLd,
  placeLabel,
  titleMetaDescription,
  titleMetaTitle,
} from '@/lib/seo';
import { CoverCard } from '@/components/CoverCard';
import { ClaimSection } from '@/components/ClaimSection';
import { JsonLd } from '@/components/JsonLd';
import { StockRequestForm } from '@/components/StockRequestForm';
import { SubmittedNotice } from '@/components/SubmittedNotice';
import { ViewBeacon } from '@/components/ViewBeacon';
import { WantNearForm } from '@/components/WantNearForm';

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getAllVisibleTitleSlugs();
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const title = await getTitleBySlug(slug);
  if (!title) return { title: 'Not found | Neesh' };
  const metaTitle = titleMetaTitle(title);
  const description = titleMetaDescription(title);
  return {
    title: metaTitle,
    description,
    alternates: { canonical: canonical(`/titles/${title.slug}`) },
    openGraph: {
      title: metaTitle,
      description,
      url: canonical(`/titles/${title.slug}`),
      images: [{ url: ogImageForTitle(title, title.tags[0]) }],
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description,
      images: [ogImageForTitle(title, title.tags[0])],
    },
  };
}

function price(title: { cover_price: number | null; currency: string | null }): string | null {
  if (title.cover_price == null) return null;
  if (title.currency) {
    try {
      return new Intl.NumberFormat('en', {
        style: 'currency',
        currency: title.currency,
      }).format(title.cover_price);
    } catch {
      return `${title.cover_price} ${title.currency}`;
    }
  }
  return String(title.cover_price);
}

export default async function TitlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [title, allTags] = await Promise.all([getTitleBySlug(slug), getTagsWithCounts()]);
  if (!title) notFound();

  const publishing = new Set(allTags.filter(tagPublishes).map((t) => t.slug));
  const primaryTag = title.tags[0];
  const primaryTagLive = primaryTag && publishing.has(primaryTag.slug);
  const place = placeLabel(title.city, title.country);
  const coverPrice = price(title);

  const specRows: [string, string][] = [];
  if (title.frequency) {
    specRows.push([
      'Frequency',
      title.frequency === 'evergreen'
        ? 'Evergreen, no fixed schedule'
        : `Published ${FREQUENCY_LABELS[title.frequency].toLowerCase()}`,
    ]);
  }
  if (place) specRows.push(['From', place]);
  if (coverPrice) specRows.push(['Cover price', coverPrice]);
  if (title.trim_size) specRows.push(['Trim size', title.trim_size]);
  if (title.page_count) specRows.push(['Pages', String(title.page_count)]);
  specRows.push(['Status', title.status === 'dormant' ? 'On hiatus' : 'Currently publishing']);

  const breadcrumbs = [
    { name: 'Index', path: '/index' },
    ...(primaryTag && primaryTagLive
      ? [{ name: primaryTag.name, path: `/magazines/${primaryTag.slug}` }]
      : []),
    { name: title.name, path: `/titles/${title.slug}` },
  ];

  return (
    <>
      <JsonLd data={periodicalLd(title)} />
      <JsonLd data={breadcrumbLd(breadcrumbs)} />
      <ViewBeacon titleId={title.id} />

      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/index">Index</Link>
        {primaryTag && primaryTagLive && (
          <>
            {' / '}
            <Link href={`/magazines/${primaryTag.slug}`}>{primaryTag.name}</Link>
          </>
        )}
        {' / '}
        {title.name}
      </nav>

      <div className="profile-layout">
        <aside>
          <CoverCard title={title} primaryTag={primaryTag} />
        </aside>
        <article>
          <h1>{title.name}</h1>
          <p className="publisher-line">
            Published by{' '}
            <Link href={`/publishers/${title.publisher.slug}`}>{title.publisher.name}</Link>
            {place ? ` in ${place}` : ''}
          </p>

          <SubmittedNotice />

          {title.description ? (
            <p className="stub">{title.description}</p>
          ) : (
            <p className="muted">
              We haven&apos;t written this one up yet. If it&apos;s yours, claim the page
              and tell us what it&apos;s about.
            </p>
          )}

          {/* Machine-liftable facts in semantic HTML (spec 7.5) */}
          <dl className="spec-table">
            {specRows.map(([label, value]) => (
              <div key={label} style={{ display: 'contents' }}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          {title.frequency === 'evergreen' && (
            <p className="evergreen-note">
              {title.name} is published as an evergreen title, meaning issues stay in
              print rather than expiring when the next one arrives.
            </p>
          )}

          {title.tags.length > 0 && (
            <ul className="tag-list">
              {title.tags.map((tag) =>
                publishing.has(tag.slug) ? (
                  <li key={tag.id}>
                    <Link className="tag-pill" href={`/magazines/${tag.slug}`}>
                      {tag.name}
                    </Link>
                  </li>
                ) : (
                  <li key={tag.id}>
                    <span className="tag-plain">{tag.name}</span>
                  </li>
                )
              )}
            </ul>
          )}

          {title.publisher.website && (
            <div className="cta-row">
              <a className="button" href={`/out/${title.slug}`} rel="nofollow">
                See where it&apos;s stocked
              </a>
            </div>
          )}

          <StockRequestForm titleId={title.id} />
          <WantNearForm titleId={title.id} />
          <ClaimSection
            titleId={title.id}
            titleName={title.name}
            titleSlug={title.slug}
            claimed={title.publisher.claimed}
          />
        </article>
      </div>
    </>
  );
}
