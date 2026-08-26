import Link from 'next/link';
import { notFound } from 'next/navigation';
import { marked } from 'marked';
import { getTagBySlug, getTitlesForTag, PAGE_SIZE, tagPublishes } from '@/lib/queries';
import { breadcrumbLd, itemListLd, nicheProse } from '@/lib/seo';
import { JsonLd } from './JsonLd';
import { TitleCard } from './TitleCard';

// Shared renderer for /magazines/[tag] (page 1) and /magazines/[tag]/page/[n].
// A tag below the 5-title threshold generates no index page at all (spec 1.4).
export async function NichePage({ tagSlug, page }: { tagSlug: string; page: number }) {
  const tag = await getTagBySlug(tagSlug);
  if (!tag || !tagPublishes(tag)) notFound();

  const { titles, total } = await getTitlesForTag(tag.id, page);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > lastPage || titles.length === 0) notFound();

  const prose = nicheProse(tag.name);
  const intro = page === 1 && tag.intro_md ? (marked.parse(tag.intro_md) as string) : null;

  return (
    <>
      <JsonLd data={itemListLd(tag.name, tag.slug, titles)} />
      <JsonLd
        data={breadcrumbLd([
          { name: 'Index', path: '/index' },
          { name: tag.name, path: `/magazines/${tag.slug}` },
        ])}
      />
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/index">Index</Link> / {tag.name}
      </nav>
      <h1>Independent magazines about {prose}</h1>
      {intro && <div className="niche-intro" dangerouslySetInnerHTML={{ __html: intro }} />}
      <ul className="title-grid">
        {titles.map((title) => (
          <TitleCard key={title.id} title={title} chip={tag.name} />
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
