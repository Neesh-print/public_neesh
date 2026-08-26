import Link from 'next/link';
import { notFound } from 'next/navigation';
import { marked } from 'marked';
import { anonClient, hasSupabaseEnv } from '@/lib/supabase';
import { getTagBySlug, getTitlesForTag, PAGE_SIZE, tagPublishes } from '@/lib/queries';
import { breadcrumbLd, itemListLd, nicheProse } from '@/lib/seo';
import { JsonLd } from './JsonLd';
import { TitleCard } from './TitleCard';

async function countryCount(tagId: string): Promise<number> {
  if (!hasSupabaseEnv) return 0;
  const { data } = await anonClient()
    .from('directory_titles')
    .select('country, directory_title_tags!inner(tag_id)')
    .eq('directory_title_tags.tag_id', tagId)
    .eq('removed', false)
    .in('status', ['active', 'dormant'])
    .limit(2000);
  return new Set((data ?? []).map((t) => t.country).filter(Boolean)).size;
}

// Shared renderer for /magazines/[tag] (page 1) and /magazines/[tag]/page/[n].
// A tag below the 5-title threshold generates no index page at all (spec 1.4).
export async function NichePage({ tagSlug, page }: { tagSlug: string; page: number }) {
  const tag = await getTagBySlug(tagSlug);
  if (!tag || !tagPublishes(tag)) notFound();

  const [{ titles, total }, countries] = await Promise.all([
    getTitlesForTag(tag.id, page),
    countryCount(tag.id),
  ]);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > lastPage || titles.length === 0) notFound();

  const prose = nicheProse(tag.name);
  const intro = page === 1 && tag.intro_md ? (marked.parse(tag.intro_md) as string) : null;

  return (
    <>
      <JsonLd data={itemListLd(tag.name, tag.slug, titles)} />
      <JsonLd
        data={breadcrumbLd([
          { name: 'Index', path: '/directory' },
          { name: tag.name, path: `/magazines/${tag.slug}` },
        ])}
      />
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/directory">Index</Link> / {tag.name}
      </nav>
      <h1>Independent magazines about {prose}</h1>
      <p className="niche-count">
        {total} independent {total === 1 ? 'title' : 'titles'} about {prose}
        {countries > 0 && `, from ${countries} ${countries === 1 ? 'country' : 'countries'}`}.
        Every one of them is a real, currently publishing magazine you can stock or buy.
      </p>
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
