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
  FREQUENCY_LABELS,
  ogImageForTitle,
  periodicalLd,
  placeLabel,
  titleMetaDescription,
  titleMetaTitle,
} from '@/lib/seo';
import { ArrowIcon } from '@/components/Logo';
import { CoverCard } from '@/components/CoverCard';
import { ClaimSection } from '@/components/ClaimSection';
import { JsonLd } from '@/components/JsonLd';
import { SubmittedNotice } from '@/components/SubmittedNotice';
import { ViewBeacon } from '@/components/ViewBeacon';
import { WantTitleForm } from '@/components/WantTitleForm';

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

  // Profile states: listed on Neesh (orderable), claimed (verified), or
  // unclaimed (claim + removal zone). Neesh-listed titles belong to
  // publishers with accounts: no claim, no removal link.
  const listed = title.available_on_neesh;
  const claimed = title.publisher.claimed;

  // "Published {x}" needs an adverbial form: "Published quarterly" works,
  // "Published annual" does not.
  const FREQUENCY_ADVERBS: Record<string, string> = {
    annual: 'annually',
    biannual: 'twice a year',
    irregular: 'irregularly',
  };

  const specRows: [string, string][] = [];
  if (title.frequency) {
    specRows.push([
      'Frequency',
      title.frequency === 'evergreen'
        ? 'Evergreen, no fixed schedule'
        : `Published ${
            FREQUENCY_ADVERBS[title.frequency] ?? FREQUENCY_LABELS[title.frequency].toLowerCase()
          }`,
    ]);
  }
  if (place) specRows.push(['From', place]);
  if (coverPrice) specRows.push(['Cover price', coverPrice]);
  if (title.trim_size) specRows.push(['Trim', title.trim_size]);
  if (title.page_count) specRows.push(['Pages', String(title.page_count)]);
  specRows.push([
    'Status',
    listed
      ? 'Listed on Neesh'
      : title.status === 'dormant'
        ? 'On hiatus'
        : 'Currently publishing',
  ]);

  const breadcrumbs = [
    { name: 'Index', path: '/index' },
    ...(primaryTag && primaryTagLive
      ? [{ name: primaryTag.name, path: `/index/${primaryTag.slug}` }]
      : []),
    { name: title.name, path: `/titles/${title.slug}` },
  ];

  const subjectTags = title.tags.filter((tag) => tag.category === 'subject');
  const identityTags = title.tags.filter((tag) => tag.category !== 'subject');

  return (
    <>
      <JsonLd data={periodicalLd(title)} />
      <JsonLd data={breadcrumbLd(breadcrumbs)} />
      <ViewBeacon titleId={title.id} />

      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/index">Index</Link>
        {primaryTag && primaryTagLive && (
          <>
            <span>/</span>
            <Link href={`/index/${primaryTag.slug}`}>{primaryTag.name}</Link>
          </>
        )}
        <span>/</span>
        <span className="here">{title.name}</span>
      </nav>

      <section>
        <div className="wrap title-page">
          <div className="title-cover-col">
            <CoverCard title={title} />
            <div className="title-tags">
              {subjectTags.map((tag) =>
                publishing.has(tag.slug) ? (
                  <Link key={tag.id} href={`/index/${tag.slug}`}>
                    {tag.name}
                  </Link>
                ) : (
                  <span key={tag.id} className="identity">
                    {tag.name}
                  </span>
                )
              )}
              {identityTags.map((tag) => (
                <span key={tag.id} className="identity">
                  {tag.name}
                </span>
              ))}
            </div>
          </div>

          <div className="title-main">
            <div className="title-head">
              {claimed && (
                <span className="verified-pill">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Verified by the publisher
                </span>
              )}
              <h1>{title.name}</h1>
              <p className="publisher-line">
                Published by {title.publisher.name}
                {place ? ` in ${place}` : ''} &middot;{' '}
                <Link href={`/publishers/${title.publisher.slug}`} className="text-link">
                  See all their titles
                </Link>
              </p>
            </div>

            <SubmittedNotice />

            {title.description ? (
              <p className="title-desc">{title.description}</p>
            ) : (
              <p className="title-desc placeholder">
                Nobody has written this one up yet. If you publish it, claim the page and describe
                it in your own words.
              </p>
            )}

            {/* Machine-liftable facts in semantic HTML */}
            <dl className="spec-rows">
              {specRows.map(([label, value]) => (
                <div className="spec-row" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            {listed ? (
              <div className="cta-stack">
                <div className="cta-row">
                  <Link href={`/order/${title.slug}`} className="btn solid">
                    Order on Neesh
                    <ArrowIcon />
                  </Link>
                  {title.publisher.website && (
                    <a className="btn ghost" href={`/out/${title.slug}`} rel="nofollow">
                      See where it&rsquo;s stocked
                    </a>
                  )}
                </div>
                <span className="cta-note">Wholesale, by the copy, no minimums.</span>
              </div>
            ) : (
              title.publisher.website && (
                <div className="cta-row">
                  <a className="btn solid" href={`/out/${title.slug}`} rel="nofollow">
                    See where it&rsquo;s stocked
                    <ArrowIcon />
                  </a>
                </div>
              )
            )}

            <WantTitleForm titleId={title.id} />

            {!listed && !claimed && (
              <ClaimSection titleId={title.id} titleName={title.name} titleSlug={title.slug} />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
