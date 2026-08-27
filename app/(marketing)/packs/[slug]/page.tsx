import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowIcon } from '@/components/Logo';
import { PACKS, getPack } from '@/lib/packs';
import { coverPublicUrl } from '@/lib/supabase';
import { getCatalogTitles } from '@/lib/queries';

export const revalidate = 86400;

export function generateStaticParams() {
  return PACKS.map((pack) => ({ slug: pack.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pack = getPack(slug);
  if (!pack) return {};
  return {
    title: `${pack.name} | Curated Packs | Neesh`,
    description: pack.blurb,
    alternates: { canonical: `/packs/${pack.slug}` },
  };
}

export default async function PackDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pack = getPack(slug);
  if (!pack) notFound();

  // The actual box contents, in stack order. Titles that live in the
  // directory link to their profile with their directory cover; the rest
  // render their static cover unlinked.
  const catalog = await getCatalogTitles();
  const box = pack.contents.map((entry) => {
    const t = entry.slug ? catalog.find((c) => c.slug === entry.slug) : undefined;
    return {
      key: entry.slug ?? entry.title,
      title: t?.name ?? entry.title,
      slug: t ? t.slug : null,
      cover: t?.cover_image_path ? coverPublicUrl(t.cover_image_path) : (entry.image ?? null),
      publisher: t?.publisher.name ?? null,
    };
  });
  const others = PACKS.filter((p) => p.slug !== pack.slug);

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/packs">Packs</Link>
        <span>/</span>
        <span className="here">{pack.name}</span>
      </nav>
      <section>
        <div className="wrap pack-detail-hero">
          <img src={pack.image} alt={`${pack.name} pack, stacked`} />
          <div className="pack-detail-copy">
            <span className="eyebrow">Curated pack</span>
            <h1>{pack.name}</h1>
            <span className="pack-rooms">{pack.rooms}</span>
            <p className="blurb">{pack.blurb}</p>
            <div className="pack-detail-price">
              <span className="price">$200</span>
              <span className="per">per pack</span>
              <span className="ship">&middot; shipping included</span>
            </div>
            <span className="pack-count">
              {pack.count} &middot; retails at <strong>{pack.retail}</strong>
            </span>
            <div className="cta-row" style={{ marginTop: 8 }}>
              <a href={pack.order} className="btn solid">
                Order this pack
                <ArrowIcon />
              </a>
              <a href={pack.withStand} className="btn ghost">
                With stand, $300
              </a>
            </div>
            <span className="cta-note" style={{ fontSize: 14 }}>
              Ships with these exact titles or titles like them, hand-picked around the theme.
            </span>
          </div>
        </div>
      </section>

      {box.length > 0 && (
        <section className="tint-section">
          <div className="wrap">
            <h2 className="d3" style={{ marginBottom: 'clamp(20px,2.4vw,34px)' }}>
              What&rsquo;s in the box
            </h2>
            <div className="mini-cover-grid">
              {box.map((t) =>
                t.slug ? (
                  <Link key={t.key} href={`/titles/${t.slug}`}>
                    {t.cover && <img src={t.cover} alt={`${t.title} cover`} loading="lazy" />}
                    <span className="name">{t.title}</span>
                    {t.publisher && <span className="pub">{t.publisher}</span>}
                  </Link>
                ) : (
                  <div key={t.key} className="tile">
                    {t.cover && <img src={t.cover} alt={`${t.title} cover`} loading="lazy" />}
                    <span className="name">{t.title}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      )}

      <section className="plain-section">
        <div className="wrap">
          <h2 className="d3 rule-heading">The other packs</h2>
          <div className="other-packs">
            {others.map((p) => (
              <Link key={p.slug} href={`/packs/${p.slug}`}>
                <img src={p.image} alt={p.name} loading="lazy" />
                <span className="name">{p.name}</span>
                <span className="rooms">{p.rooms}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
