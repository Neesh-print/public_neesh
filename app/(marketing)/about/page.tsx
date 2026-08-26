import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About | Neesh',
  description:
    'Magazines live or die on shelves, and the shelves disappeared. Neesh is an index of every title worth knowing about, and the rails to move them into the world.',
  alternates: { canonical: '/about' },
};

const FILM_URL = 'https://www.youtube.com/watch?v=393cjk5hc5Q';

export default function AboutPage() {
  return (
    <>
      <section className="page-hero short">
        <img
          src="/assets/city-reader-wall.jpg"
          alt="A wall of independent magazines"
          style={{ objectPosition: '50% 46%' }}
        />
        <div
          className="scrim"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.56) 0%, rgba(0,0,0,0.52) 34%, rgba(0,0,0,0.66) 100%)',
          }}
        />
        <div className="page-hero-content">
          <span className="eyebrow">About</span>
          <h1 style={{ fontSize: 'clamp(32px,5vw,76px)', maxWidth: '22ch', marginBottom: 0 }}>
            Magazines live or die on shelves, and the shelves disappeared.
          </h1>
        </div>
      </section>

      <section>
        <div className="wrap about-cols">
          <div className="about-col">
            <h2>What we&rsquo;re building</h2>
            <p>
              300+ independent titles from 30+ countries. Food, music, fashion, sport,
              architecture, art, travel, and about thirty other niches.
            </p>
            <p>
              An index of every title worth knowing about, and the rails to move them into the
              world. Fifty years from now, someone should still be able to make a magazine and
              make a living.
            </p>
          </div>
          <div className="about-col">
            <h2>Why us</h2>
            <p>
              We&rsquo;re the rails, not the owner. You keep your terms, your pricing, and your
              direct line to the people stocking you.
            </p>
            <p>
              Half our buyers aren&rsquo;t bookshops. They&rsquo;re caf&eacute;s, climbing gyms,
              hotels, studios, spas, and one very well-read ketamine clinic. Publishers tell us
              the best placements are the ones they&rsquo;d never have thought to ask for.
            </p>
          </div>
        </div>
      </section>

      <section className="founder-band tint-section">
        <div className="wrap">
          <div className="founder-cols">
            <img src="/assets/gem-portrait.jpg" alt="Gem holding a stack of independent magazines" />
            <div className="founder-copy">
              <h2>Who&rsquo;s behind this</h2>
              <p>
                YO! I&rsquo;m Gem, a marketer, vinyl DJ and ex-vintage store owner. I spent most of
                a decade moving physical goods across borders for logistics and supply chain
                companies, and most of my evenings reading independent magazines. I started Neesh
                because the magazines I loved were nearly impossible to find outside a handful of
                shops, and the people making them were spending more time on spreadsheets and
                shipping labels than on the next issue. Distribution decides what gets made, what
                gets moved, and what gets remembered. Independent print deserves infrastructure
                built for it, not hand-me-downs from the newsstand era.
              </p>
              <p>
                I gave the longer version of this argument at Case Sensitive.{' '}
                <a href={FILM_URL} className="text-link" rel="noopener noreferrer" target="_blank">
                  Watch the talk
                </a>
                .
              </p>
            </div>
          </div>
          <div className="work-with">
            <h3>Work with Neesh</h3>
            <p>
              If you publish a magazine,{' '}
              <Link href="/auth/publisher" className="text-link">
                claim your title
              </Link>{' '}
              and set your terms. If you run a space and want help choosing, write to{' '}
              <a href="mailto:hi@neesh.art" className="text-link">
                hi@neesh.art
              </a>{' '}
              and tell me about the room. If you&rsquo;d like to work on Neesh itself, whether
              that&rsquo;s writing, design, or handling the warehouse, send a note to the same
              address and tell me what you&rsquo;re good at.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
