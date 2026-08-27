import Link from 'next/link';
import { ArrowIcon } from '@/components/Logo';
import { NewsletterForm } from '@/components/NewsletterForm';
import { getFeaturedTitles } from '@/lib/queries';

export const revalidate = 86400;

const FILM_URL = 'https://www.youtube.com/watch?v=393cjk5hc5Q';

// Homepage, v2 design. Hero → title marquee → two-door fork → the Status Quo
// manifesto → Mission with the film → packs band → newsletter strip →
// closing photo CTA.
export default async function HomePage() {
  // The marquee runs real index titles (most recently updated first) rather
  // than the prototype's sample names.
  const marqueeTitles = (await getFeaturedTitles(14)).map((t) => t.name);

  const marqueeSeq = (
    <div className="marquee-seq">
      <span className="tag">In the index</span>
      {marqueeTitles.map((name) => (
        <span key={name}>{name}</span>
      ))}
    </div>
  );

  return (
    <>
      <section className="home-hero">
        <img src="/assets/flatlay-red-wide.jpg" alt="Independent magazines laid out on a red backdrop" />
        <div className="scrim" />
        <div className="home-hero-content">
          <span className="eyebrow">300+ independent titles from 30+ countries</span>
          <h1 className="d1">Publish. We&rsquo;ll handle the shelves.</h1>
          <div className="home-hero-row">
            <p>
              Neesh connects independent magazines with the shops, caf&eacute;s, hotels, and waiting
              rooms that want them. Retailers order in a few clicks. You keep your terms and see
              every sale in real time so you can retire your spreadsheets.
            </p>
            <div className="home-hero-ctas">
              <Link href="/auth" className="btn white hero">
                Claim your title
              </Link>
              <Link href="/index" className="btn ghost-white hero">
                Browse the index
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

      <section className="doors">
        <Link href="/publishers" className="door publisher">
          <img src="/assets/bench-tempura.jpg" alt="A publisher reading on a bench" />
          <div className="scrim" />
          <div className="door-content">
            <span className="eyebrow">For publishers</span>
            <span className="door-title">
              <span className="hl">Set your terms. We bring the shelves.</span>
            </span>
            <span className="door-body">
              You price it. You decide whether to fulfill it yourself or let us handle it (
              <em>currently in beta</em>). Every order shows you who bought it, where they are, and
              when they reorder.
            </span>
            <span className="door-body">
              We sell on your behalf, remind buyers to reorder, and make it easy to get paid. 100+
              retailers in 30+ countries are already browsing. You only pay a flat 10%.
            </span>
            <span className="door-cta">
              Claim your title
              <ArrowIcon />
            </span>
          </div>
        </Link>
        <Link href="/spaces" className="door spaces">
          <img src="/assets/table-sport.jpg" alt="Magazines laid out on a table in a room" />
          <div className="scrim" />
          <div className="door-content">
            <span className="eyebrow">For spaces</span>
            <span className="door-title">
              <span className="hl">Curate the room. We&rsquo;ll stock it.</span>
            </span>
            <span className="door-body">
              Magazines get your room photographed and shared. They keep people sitting longer once
              they&rsquo;re in. And they give regulars something new to come back to.
            </span>
            <span className="door-body">
              Pick a pack built for your kind of room, or build your own from the index. Sign up in
              under a minute to buy the best independent magazines at wholesale, with nothing
              locked in.
            </span>
            <span className="door-cta">
              See the packs
              <ArrowIcon />
            </span>
          </div>
        </Link>
      </section>

      <section className="manifesto">
        <div className="wrap">
          <span className="eyebrow on-black">The Status Quo</span>
          <h2>Bad and worse</h2>
          <p className="kicker">Independent publishers get two options.</p>
          <div className="manifesto-cols">
            <div className="manifesto-col">
              <span className="manifesto-num">01</span>
              <p>
                Door one is a distributor. They take 60 points, pay in 90 days, send sales reports
                that are out of date when they arrive, and destroy what doesn&rsquo;t sell. You
                find out where your magazine went months after it went there.
              </p>
            </div>
            <div className="manifesto-col">
              <span className="manifesto-num">02</span>
              <p>
                Door two is doing it yourself. Dozens of store relationships in a spreadsheet.
                Invoices you chase for six months. Reorders that only happen when you remember to
                ask.
              </p>
            </div>
          </div>
          <p className="manifesto-close">
            Most publishers pick door two and call it independence. It&rsquo;s really unpaid
            logistics work, eating the time you have to make the next issue.
          </p>
        </div>
      </section>

      <section className="feature-band">
        <div className="wrap">
          <div className="feature-cols">
            <div className="feature-copy">
              <span className="eyebrow muted">Mission</span>
              <h2 className="d2">Every independent magazine, in one place</h2>
              <p className="lede" style={{ color: 'var(--muted-2)' }}>
                300+ independent titles from 30+ countries. Food, music, fashion, sport,
                architecture, art, travel, and about thirty other niches.
              </p>
              <p className="lede" style={{ color: 'var(--muted-2)' }}>
                Publishers, your title is probably already here. Claim it and retire your
                spreadsheet.
              </p>
              <Link href="/index" className="btn ghost">
                Browse the index
              </Link>
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
                Five packs, each built around a kind of room: the waiting room, the cafe, the shop
                floor. $200 flat, shipping included, eight to ten titles no one else in your
                neighborhood carries.
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
              <h2>What landed on the shelf this month</h2>
              <p>New titles in the index, physical media news and stuff we&rsquo;re reading. 1x a month.</p>
            </div>
            <NewsletterForm />
          </div>
        </div>
      </section>

      <section className="closing">
        <img src="/assets/couch-pair.jpg" alt="Two people reading magazines on a couch" />
        <div className="closing-content">
          <h2>Print didn&rsquo;t die. The shelf did.</h2>
          <p>
            Magazines live or die on shelves, and the shelves disappeared with the newsstands.
            We&rsquo;re rebuilding them in the spaces where people actually spend time.
          </p>
          <p>
            An index of every title worth knowing about, and the rails to move them into the world.
            Fifty years from now, someone should still be able to make a magazine and make a
            living.
          </p>
          <div className="closing-ctas">
            <Link href="/auth" className="btn white hero">
              Claim your title
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
