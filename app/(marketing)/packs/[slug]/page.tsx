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

  // Representative titles from the index, matched on the pack's niches, with
  // a fallback to any covered titles. The disclaimer line below covers the
  // hand-picked nature of the final box.
  const catalog = (await getCatalogTitles()).filter((t) => t.cover_image_path);
  const matched = catalog.filter((t) => t.tags.some((tag) => pack.niches.includes(tag.name)));
  const box = (matched.length >= 4 ? matched : catalog).slice(0, 8);
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
              {box.map((t) => (
                <Link key={t.id} href={`/titles/${t.slug}`}>
                  <img src={coverPublicUrl(t.cover_image_path) as string} alt={`${t.name} cover`} loading="lazy" />
                  <span className="name">{t.name}</span>
                  <span className="pub">{t.publisher.name}</span>
                </Link>
              ))}
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
