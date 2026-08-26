import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowIcon } from '@/components/Logo';

export const metadata: Metadata = {
  title: 'For Spaces | Neesh',
  description:
    'A shelf of independent magazines is the quickest way to make a room feel like someone chose it. Buy at wholesale, nothing locked in.',
  alternates: { canonical: '/spaces' },
};

const HOW: [string, string, string][] = [
  ['01', 'Pick your pack', 'A suite of packs, each curated for a specific kind of room. Or build your own from the index.'],
  ['02', 'One order', 'Pay however you want. Signup takes under a minute and nothing is locked in. Your pack arrives ready to display.'],
  ['03', 'Refresh when you want', "Seasonal, quarterly, or whenever. Your shelf stays current and you don't think about it."],
];

const FAQ: [string, string][] = [
  ['Do I need a distributor account?', "No. That's the point."],
  ["What's the minimum order?", 'For packs, none. For individual titles from the index, it depends on the publisher.'],
  [
    'How much does a pack cost?',
    '$200 for 8 to 10 considered titles. $300 with a handmade wooden magazine stand. Less than what you spend on flowers.',
  ],
  [
    'Do I have to sell them?',
    'Up to you. Plenty of our spaces put them out for guests and never ring one up. Others sell every copy. Fully your call.',
  ],
  [
    'Can I choose the titles?',
    "Packs come pre-curated to take the decision off your plate. If you'd rather choose, dig into the index and build your own.",
  ],
  ['What if my customers take them?', 'Then it worked.'],
];

export default function SpacesPage() {
  return (
    <>
      <section className="page-hero">
        <img
          src="/assets/shop-browsing.jpg"
          alt="People browsing the magazine shelves in a shop"
          style={{ objectPosition: '50% 42%' }}
        />
        <div
          className="scrim"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.58) 30%, rgba(0,0,0,0.66) 60%, rgba(0,0,0,0.82) 100%)',
          }}
        />
        <div className="page-hero-content">
          <span className="eyebrow">For spaces</span>
          <h1 style={{ maxWidth: '15ch' }}>Your space has a feed problem.</h1>
          <div className="page-hero-row">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p>
                Every caf&eacute; looks like every caf&eacute; now. Same plants, same playlist,
                same renovation the algorithm suggested to everyone at once.
              </p>
              <p>
                A shelf of independent magazines is the quickest way to make a room feel like
                someone chose it.
              </p>
            </div>
            <div className="page-hero-cta">
              <Link href="/packs" className="btn white hero">
                See the packs
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="manifesto">
        <div className="wrap">
          <span className="eyebrow on-black">The Status Quo</span>
          <h2 style={{ maxWidth: '16ch', marginBottom: 'clamp(36px,4.4vw,64px)' }}>
            Nobody makes this easy
          </h2>
          <div className="manifesto-cols">
            <div className="manifesto-col">
              <span className="manifesto-num">01</span>
              <p>
                Try buying magazines for a business. Distributors want a full account, a minimum
                order, and paperwork, all for someone who wants eight good titles refreshed a few
                times a year. Buying them retail one at a time costs a fortune and eats an
                afternoon.
              </p>
            </div>
            <div className="manifesto-col">
              <span className="manifesto-num accent" style={{ color: 'var(--accent)' }}>
                02
              </span>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontVariationSettings: "'wdth' 110",
                  fontWeight: 600,
                  fontSize: 'clamp(22px,2.4vw,36px)',
                  lineHeight: 1.14,
                  letterSpacing: '-0.024em',
                  maxWidth: '24ch',
                  color: '#fff',
                }}
              >
                So the shelf never happens. And the room stays interchangeable.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="plain-section">
        <div className="wrap">
          <h2 className="section-label">How it works</h2>
          <div className="how-grid">
            {HOW.map(([num, heading, body]) => (
              <div className="how-col" key={num}>
                <span className="how-num">{num}</span>
                <h3>{heading}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="feature-band tint">
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

      <section className="plain-section">
        <div className="wrap">
          <div className="feature-cols">
            <div className="feature-copy" style={{ gap: 22 }}>
              <span className="eyebrow muted">What print does to a room</span>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontVariationSettings: "'wdth' 112",
                  fontWeight: 600,
                  fontSize: 'clamp(24px,2.8vw,42px)',
                  lineHeight: 1.12,
                  letterSpacing: '-0.026em',
                  margin: 0,
                  maxWidth: '26ch',
                  textWrap: 'pretty',
                }}
              >
                One of our publishers left a single copy at her hairdresser&rsquo;s. Months later,
                strangers were still messaging her about it.
              </p>
              <p className="lede" style={{ color: 'var(--muted-2)', maxWidth: '48ch' }}>
                A magazine on a table gets picked up, photographed, and remembered in a way a
                screen never is. It tells people who walk in that somebody here made a choice.
              </p>
              <p className="lede" style={{ color: 'var(--muted-2)', maxWidth: '48ch' }}>
                Generic spaces compete on price. Rooms with a point of view don&rsquo;t have to.
              </p>
            </div>
            <img
              src="/assets/reader-yolo.jpg"
              alt="A reader with a copy of YOLO Journal"
              style={{
                width: '100%',
                aspectRatio: '4 / 5',
                objectFit: 'cover',
                objectPosition: '50% 40%',
                borderRadius: 8,
                display: 'block',
              }}
            />
          </div>
        </div>
      </section>

      <section className="tint-section">
        <div className="wrap">
          <h2 className="section-label">FAQ</h2>
          <div className="faq-list">
            {FAQ.map(([q, a]) => (
              <div className="faq-row" key={q}>
                <h3>{q}</h3>
                <p>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="closing closing-big-cta">
        <img src="/assets/table-sport.jpg" alt="Magazines laid out on a table" style={{ opacity: 0.42 }} />
        <div className="closing-content">
          <h2 style={{ maxWidth: '20ch' }}>Make the room say something</h2>
          <div className="closing-ctas">
            <Link href="/packs" className="btn white hero">
              See the packs
            </Link>
            <Link href="/index" className="btn ghost-white hero">
              Browse the index
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
