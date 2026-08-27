import type { Metadata } from 'next';
import { ArrowIcon } from '@/components/Logo';
import { PackShelf } from '@/components/PackShelf';
import { PACKS } from '@/lib/packs';
import { coverPublicUrl } from '@/lib/supabase';
import { getCatalogTitles } from '@/lib/queries';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Curated Packs | Neesh',
  description:
    'A Neesh curated pack fills your space with independent print no one else carries, chosen for your room and shipped in one box. $200 flat, shipping included.',
  alternates: { canonical: '/packs' },
};

const STEPS: [string, string, string][] = [
  ['01', 'Pick your pack', 'Thoughtful themes built for design-forward spaces. Choose the one that fits your room.'],
  ['02', 'We pack and ship', 'One box, one tracking number, shipping included. Nothing new for your team to manage.'],
  ['03', 'Own every copy', "Display them or sell them, they're yours. No consignment, no returns paperwork."],
];

export default async function PacksPage() {
  // Cover marquee runs real index covers.
  const covers = (await getCatalogTitles())
    .filter((t) => t.cover_image_path)
    .slice(0, 20)
    .map((t) => ({ name: t.name, src: coverPublicUrl(t.cover_image_path) as string }));

  const marqueeSeq = (
    <div className="cover-marquee-seq">
      {covers.map((c) => (
        <img key={c.name} src={c.src} alt={c.name} loading="lazy" />
      ))}
    </div>
  );

  return (
    <>
      <section>
        <div className="wrap packs-hero">
          <div className="packs-hero-copy">
            <span className="eyebrow dim">Curated packs</span>
            <h1>Turn dead space into cultural moments.</h1>
            <p className="lede">
              A Neesh curated pack fills your space with independent print no one else carries,
              chosen for your room and shipped effortlessly in one box. Let your shelf introduce
              you before a word is said.
            </p>
            <a href="#the-packs" className="btn solid">
              See the packs
              <ArrowIcon />
            </a>
          </div>
          <img className="feature-img" src="/assets/pack-hero.jpg" alt="A curated pack, stacked" />
        </div>
      </section>

      {covers.length > 0 && (
        <div className="cover-marquee" aria-hidden="true">
          <div className="cover-marquee-track">
            {marqueeSeq}
            {marqueeSeq}
          </div>
        </div>
      )}

      <section className="benefits">
        <div className="wrap wide">
          <h2 className="d2">Make your space worth staying for</h2>
          <p className="sub">
            Independent magazines complete the visual story of the space and signal the
            authenticity and cultural fluency your guests are looking for.
          </p>
          <div className="benefits-grid">
            <div className="benefit">
              <h3>Stand out on sight.</h3>
              <p>
                Your space reads like every other in its category. Titles no one else carries tell
                guests you get it on sight, and rooms worth photographing get shared.
              </p>
            </div>
            <div className="benefit">
              <h3>Minutes become dollars.</h3>
              <p>
                Guests fill the wait with a phone screen. A beautiful magazine is the one object
                that competes with a feed, and guests who linger spend more.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PackShelf packs={PACKS} />

      <section className="tint-section">
        <div className="wrap pack-how">
          <div className="pack-how-copy">
            <h2>How it works</h2>
            <p>
              Ace Hotel, Soho House, and the caf&eacute;s your guests post from have used print as
              brand identity for years. It used to take an editorial team and a distributor
              relationship to pull off.
            </p>
            <p>
              Neesh is the wholesale marketplace for independent print. We work with publishers
              directly, read hundreds of titles a year, and pack the ones your guests will
              actually pick up.
            </p>
            <p>No account to open, no minimums, no rep to chase. You know your space. We know the shelf.</p>
          </div>
          <div className="pack-steps">
            {STEPS.map(([num, heading, body]) => (
              <div className="pack-step" key={num}>
                <span className="num">{num}</span>
                <div>
                  <h3>{heading}</h3>
                  <p>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="closing scrimmed">
        <img src="/assets/couch-pair.jpg" alt="Two people reading magazines" style={{ opacity: 0.44 }} />
        <div
          className="scrim"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.66) 100%)',
          }}
        />
        <div className="closing-content">
          <h2>Culture you can stock.</h2>
          <p>
            Order a pack and your space starts saying something your competitors can&rsquo;t. Skip
            it and the room stays interchangeable.
          </p>
          <a href="#the-packs" className="btn white hero" style={{ marginTop: 6 }}>
            Choose your pack
          </a>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.78)' }}>
            Want a custom pack for your space? Write to{' '}
            <a href="mailto:hi@neesh.art" style={{ color: '#fff', textDecoration: 'underline' }}>
              hi@neesh.art
            </a>
          </span>
        </div>
      </section>
    </>
  );
}
