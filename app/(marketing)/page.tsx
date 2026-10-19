import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowIcon } from '@/components/Logo';
import { NewsletterForm } from '@/components/NewsletterForm';
import { ScannedLine } from '@/components/ScannedLine';
import { getFeaturedTitles } from '@/lib/queries';

export const revalidate = 86400;

const FILM_URL = 'https://www.youtube.com/watch?v=393cjk5hc5Q';

const TITLE = 'Neesh | Discover & Stock Independent Magazines';
const DESCRIPTION =
  'Explore 300+ independent magazines from 30+ countries. Discover new titles, find stockists, or stock your space with curated packs.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/' },
  twitter: { title: TITLE, description: DESCRIPTION },
};

// Homepage, v3 (fall 2026 awareness campaign). Hero → title marquee →
// manifesto → three doors (readers, spaces, publishers) → the Index with the
// film → packs band → newsletter strip → closing photo CTA. The distributor
// "Bad and worse" section moved to /publishers.
export default async function HomePage() {
  // The marquee runs real index titles (most recently updated first), each
  // linked to its Index page so homepage visits pass into the long tail.
  const marqueeTitles = await getFeaturedTitles(14);

  const marqueeSeq = (
    <div className="marquee-seq">
      <span className="tag">In the index</span>
      {marqueeTitles.map((t) => (
        <Link key={t.slug} href={`/titles/${t.slug}`} tabIndex={-1}>
          {t.name}
        </Link>
      ))}
    </div>
  );

  return (
    <>
      <section className="home-hero">
        <img src="/assets/flatlay-red-wide.jpg" alt="Independent magazines laid out on a red backdrop" />
        <div className="scrim" />
        <div className="home-hero-content">
          <span className="eyebrow">Independent magazines &middot; 300+ titles &middot; 30+ countries</span>
          <ScannedLine />
          <h1 className="d1">Where independent magazines find their people.</h1>
          <div className="home-hero-row">
            <p>
              Discover 300+ independent magazines about everything under the sun. Neesh helps you
              find the good ones and gets them onto shelves worth browsing.
            </p>
            <div className="home-hero-ctas">
              <Link href="/index" className="btn white hero">
                Browse the Index
              </Link>
              <Link href="/spaces" className="btn ghost-white hero">
                Stock your space
              </Link>
            </div>
          </div>
        </div>
      </section>

      {marqueeTitles.length > 0 && (
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {marqueeSeq}
            {marqueeSeq}
          </div>
        </div>
      )}

      <section className="manifesto home-mission">
        <div className="wrap">
          <span className="eyebrow on-black">Mission</span>
          <h2>Print didn&rsquo;t die. The newsstand did.</h2>
          <p className="kicker">
            Magazines live or die on shelves, and the shelves disappeared with the newsstands.
            We&rsquo;re rebuilding them in the places people actually spend time.
          </p>
          <p className="manifesto-close">
            Good magazines deserve to be found and the people making them deserve to make a living.
          </p>
        </div>
      </section>

      <section className="doors">
        <Link href="/index" className="door readers">
          <img src="/assets/reader-yolo.jpg" alt="A reader holding YOLO magazine on a couch" />
          <div className="scrim" />
          <div className="door-content">
            <span className="eyebrow">For readers</span>
            <span className="door-title">
              <span className="hl">For people who judge books by their covers.</span>
            </span>
            <span className="door-body">
              Find the magazine you&rsquo;d want to be seen holding. Browse 300+ independent titles
              by subject, country and vibe, then see where to pick them up in your city.
            </span>
            <span className="door-cta">
              Browse the Index
              <ArrowIcon />
            </span>
          </div>
        </Link>
        <Link href="/packs" className="door spaces">
          <img src="/assets/table-sport.jpg" alt="Magazines laid out on a table in a room" />
          <div className="scrim" />
          <div className="door-content">
            <span className="eyebrow">For spaces</span>
            <span className="door-title">
              <span className="hl">Give people something to judge you by.</span>
            </span>
            <span className="door-body">
              Independent magazines that make a statement about your space. Pick a pack built for
              your kind of room, or build your own shelf from the Index at wholesale. Nothing locked
              in.
            </span>
            <span className="door-cta">
              See the packs
              <ArrowIcon />
            </span>
          </div>
        </Link>
        <Link href="/publishers" className="door publisher">
          <img src="/assets/bench-tempura.jpg" alt="A publisher reading on a bench" />
          <div className="scrim" />
          <div className="door-content">
            <span className="eyebrow">For publishers</span>
            <span className="door-title">
              <span className="hl">Set your terms. We bring the shelves.</span>
            </span>
            <span className="door-body">
              We get your magazines onto more shelves. Keep your buyer relationships and see every
              order as it happens. Flat 10% fee. No exclusivity or ongoing commitments.
            </span>
            <span className="door-cta">
              Claim your title
              <ArrowIcon />
            </span>
          </div>
        </Link>
      </section>

      <section className="feature-band">
        <div className="wrap">
          <div className="feature-cols">
            <div className="feature-copy">
              <span className="eyebrow muted">The Index</span>
              <h2 className="d2">Every independent magazine, in one place</h2>
              <p className="lede" style={{ color: 'var(--muted-2)' }}>
                Explore 300+ independent titles across art, food, music, design and everything in
                between. Find out who&rsquo;s stocking them near you.
              </p>
              <div className="feature-actions">
                <Link href="/index" className="btn ghost">
                  Browse the Index
                </Link>
                <Link href="/cities" className="text-link">
                  Find magazines near you
                  <ArrowIcon />
                </Link>
              </div>
            </div>
            <a href={FILM_URL} className="film-link" rel="noopener noreferrer" target="_blank">
              <img src="/assets/city-reader-wall.jpg" alt="Still from the Neesh film" />
              <span className="film-play">
                <span>
                  <svg width="20" height="22" viewBox="0 0 20 22" fill="#FFFFFF" aria-hidden="true">
                    <path d="M0 0 L20 11 L0 22 Z" />
                  </svg>
                </span>
              </span>
              <span className="film-tag">The film</span>
            </a>
          </div>
        </div>
      </section>

      <section className="feature-band tint" id="packs">
        <div className="wrap">
          <div className="feature-cols">
            <img
              className="feature-img"
              src="/assets/pack-waiting-room.jpg"
              alt="The Waiting Room pack, stacked"
            />
            <div className="feature-copy">
              <span className="eyebrow dim">Curated packs</span>
              <h2 className="d2">A shelf, chosen for you. Shipped in one box.</h2>
              <p className="lede">
                Six packs, five built around a kind of room and one built around home: the waiting
                room, the cafe, the Pacific Northwest. $200 flat, shipping included, eight to ten
                titles no one else in your neighborhood carries.
              </p>
              <p className="lede">
                You don&rsquo;t have time to become a magazine buyer. We already are. Order a pack
                and your space starts saying something before anyone sits down.
              </p>
              <Link href="/packs" className="btn solid">
                See the packs
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="newsletter-strip">
        <div className="wrap">
          <div className="newsletter-strip-inner">
            <div className="newsletter-strip-copy">
              <span className="eyebrow">Indexed, monthly</span>
              <h2>What we&rsquo;re reading, stocking and talking about</h2>
              <p>
                New titles in the Index, physical media news and whatever else comes up. One email a
                month.
              </p>
            </div>
            <NewsletterForm />
          </div>
        </div>
      </section>

      <section className="closing">
        <img src="/assets/couch-pair.jpg" alt="Two people reading magazines on a couch" />
        <div className="closing-content">
          <h2>Magazines belong where people are.</h2>
          <div className="closing-ctas">
            <Link href="/index" className="btn white hero">
              Browse the Index
            </Link>
            <Link href="/packs" className="btn ghost-white hero">
              See the packs
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
