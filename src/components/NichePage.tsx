import Link from 'next/link';
import { notFound } from 'next/navigation';
import { marked } from 'marked';
import {
  getCatalogTitles,
  getTagBySlug,
  getTitlesForTag,
  PAGE_SIZE,
  tagPublishes,
} from '@/lib/queries';
import { breadcrumbLd, itemListLd, nicheProse } from '@/lib/seo';
import { coverPublicUrl } from '@/lib/supabase';
import { JsonLd } from './JsonLd';
import { TitleGridCard } from './TitleGridCard';

// Shared renderer for /index/[niche] (page 1) and /index/[niche]/page/[n]
// (served from the /catalog/* file-system routes via rewrites). A tag below
// the threshold generates no index page at all.
export async function NichePage({ tagSlug, page }: { tagSlug: string; page: number }) {
  const tag = await getTagBySlug(tagSlug);
  if (!tag || !tagPublishes(tag)) notFound();

  const { titles, total } = await getTitlesForTag(tag.id, page);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > lastPage || titles.length === 0) notFound();

  // Featured trio (same computation as the index) so the badge and ordering
  // carry through to niche pages.
  const all = await getCatalogTitles();
  const featuredSlugs = new Set(
    all
      .filter((t) => t.available_on_neesh && t.neesh_magazine_id && t.neesh_listed_at)
      .sort((a, b) => (b.neesh_listed_at ?? '').localeCompare(a.neesh_listed_at ?? ''))
      .slice(0, 3)
      .map((t) => t.slug)
  );

  const prose = nicheProse(tag.name);
  const intro = page === 1 && tag.intro_md ? (marked.parse(tag.intro_md) as string) : null;
  const items = titles
    .map((title) => ({
      id: title.id,
      name: title.name,
      slug: title.slug,
      cover: coverPublicUrl(title.cover_image_path),
      publisher: title.publisher.name,
      niche: tag.name,
      onNeesh: title.available_on_neesh,
      featured: featuredSlugs.has(title.slug),
    }))
    .sort((a, b) => Number(b.featured) - Number(a.featured));

  const count = `${total} ${total === 1 ? 'title' : 'titles'}`;

  return (
    <>
      <JsonLd data={itemListLd(tag.name, tag.slug, titles)} />
      <JsonLd
        data={breadcrumbLd([
          { name: 'Index', path: '/index' },
          { name: tag.name, path: `/index/${tag.slug}` },
        ])}
      />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/index">Index</Link>
        <span>/</span>
        <span className="here">{tag.name}</span>
      </nav>
      <section>
        <div className="wrap listing-page">
          <h1>Independent magazines about {prose}</h1>
          {intro && <div className="intro" dangerouslySetInnerHTML={{ __html: intro }} />}
          <div className="count-row">
            <span className="count">{count}</span>
            <Link href="/index">All of the index</Link>
          </div>
          <div className="card-grid">
            {items.map((item, index) => (
              <TitleGridCard key={item.id} item={item} eager={index < 4} />
            ))}
          </div>
          <nav className="pagination" aria-label="Pagination">
            {page > 1 ? (
              <Link href={page === 2 ? `/index/${tag.slug}` : `/index/${tag.slug}/page/${page - 1}`}>
                Previous
              </Link>
            ) : (
              <span>Previous</span>
            )}
            <span className="current">
              Page {page} of {lastPage}
            </span>
            {page < lastPage ? (
              <Link href={`/index/${tag.slug}/page/${page + 1}`}>Next</Link>
            ) : (
              <span>Next</span>
            )}
          </nav>
        </div>
      </section>
    </>
  );
}
