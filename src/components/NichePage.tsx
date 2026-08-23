import Link from 'next/link';
import { notFound } from 'next/navigation';
import { marked } from 'marked';
import { getTagBySlug, getTitlesForTag, PAGE_SIZE, TAG_THRESHOLD } from '@/lib/queries';
import { breadcrumbLd, itemListLd } from '@/lib/seo';
import { JsonLd } from './JsonLd';
import { TitleCard } from './TitleCard';

// Shared renderer for /magazines/[tag] (page 1) and /magazines/[tag]/page/[n].
// A tag below the 5-title threshold generates no index page at all (spec 1.4).
export async function NichePage({ tagSlug, page }: { tagSlug: string; page: number }) {
  const tag = await getTagBySlug(tagSlug);
  if (!tag || tag.live_count < TAG_THRESHOLD) notFound();

  const { titles, total } = await getTitlesForTag(tag.id, page);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > lastPage || titles.length === 0) notFound();

  const intro = page === 1 && tag.intro_md ? (marked.parse(tag.intro_md) as string) : null;

  return (
    <>
      <JsonLd data={itemListLd(tag.name, tag.slug, titles)} />
      <JsonLd
        data={breadcrumbLd([
          { name: 'Directory', path: '/directory' },
          { name: tag.name, path: `/magazines/${tag.slug}` },
        ])}
      />
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/directory">Directory</Link> / {tag.name}
      </nav>
      <h1>Independent {tag.name.toLowerCase()} magazines</h1>
      {intro ? (
        <div className="niche-intro" dangerouslySetInnerHTML={{ __html: intro }} />
      ) : (
        <p className="niche-intro">
          {total} independent {tag.name.toLowerCase()}{' '}
          {total === 1 ? 'magazine' : 'magazines'}, each verified against the
          publisher&apos;s own channels.
        </p>
      )}
      <ul className="title-grid">
        {titles.map((title) => (
          <TitleCard key={title.id} title={title} />
        ))}
      </ul>
      {lastPage > 1 && (
        <nav className="pagination" aria-label="Pagination">
          {page > 1 && (
            <Link
              href={page === 2 ? `/magazines/${tag.slug}` : `/magazines/${tag.slug}/page/${page - 1}`}
            >
              Previous
            </Link>
          )}
          <span className="muted">
            Page {page} of {lastPage}
          </span>
          {page < lastPage && (
            <Link href={`/magazines/${tag.slug}/page/${page + 1}`}>Next</Link>
          )}
        </nav>
      )}
    </>
  );
}
