import type { Metadata } from 'next';
import Link from 'next/link';
import { canonical } from '@/lib/seo';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Neesh | The Marketplace for Independent Magazines',
  description:
    'Where indie mags meet the shops, cafés, hotels, and waiting rooms that stock them. Browse 300+ indie titles. Flat 10 percent fee.',
  alternates: { canonical: canonical('/') },
  openGraph: {
    title: 'Neesh | The Marketplace for Independent Magazines',
    url: canonical('/'),
  },
};

// The layout is the original neesh.art homepage design (hero grid, dual
// value prop over the faded magazine wall, mission block with the video,
// tilted-image closing CTA). Only the copy changed.
export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="mk-section">
        <div className="container mk-hero-grid">
          <div>
            <h1>Publish. We&apos;ll handle the shelves.</h1>
            <p className="lede">
              Neesh connects independent magazines with the shops, cafés, hotels, and
              waiting rooms that want them. Retailers order in a few clicks. You keep your
              terms and see every sale in real time so you can retire your spreadsheets.
            </p>
            <div className="cta-row">
              <Link className="button" href="/auth">
                Claim your title
              </Link>
              <Link className="button ghost" href="/index">
                Browse the index
              </Link>
            </div>
          </div>
          <div className="mk-image">
            <img
              src="/assets/hero-magazine-flatlay.jpg"
              alt="A colorful flatlay of independent magazines"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      {/* Dual value prop over the faded magazine wall */}
      <section className="mk-section mk-dual">
        <div className="mk-dual-bg" aria-hidden="true">
          <img src="/assets/section-bg-magazines.jpg" alt="" loading="lazy" />
        </div>
        <div className="container">
          <div className="mk-dual-col">
            <span className="eyebrow">For publishers</span>
            <h2>Set your terms. We bring the shelves.</h2>
            <p>
              You price it. You decide whether to fulfill it yourself or let us handle
              it.* Every order shows you who bought it, where they are, and when they
              reorder.
            </p>
            <p>
              We sell on your behalf, remind buyers to reorder, and make it easy to get
              paid. 100+ retailers in 30+ countries are already browsing. You only pay a
              flat 10%.
            </p>
            <p className="footnote">
              *Neesh Fulfillment is currently in beta, accepting a small number of
              fulfillment orders.
            </p>
            <Link className="button" href="/auth">
              Claim your title
            </Link>
          </div>
          <div className="mk-dual-col">
            <span className="eyebrow">For spaces</span>
            <h2>Curate the room. We&apos;ll stock it.</h2>
            <p>
              Magazines get your room photographed and shared. They keep people sitting
              longer once they&apos;re in. And they give regulars something new to come
              back to.
            </p>
            <p>
              Pick a pack built for your kind of room, or build your own from the index.
              Signup takes under a minute and nothing is locked in.
            </p>
            <Link className="button" href="/packs">
              See the packs
            </Link>
          </div>
        </div>
      </section>

      {/* Manifesto on the band */}
      <section className="mk-section band">
        <div className="container mk-manifesto">
          <h2>Bad and worse</h2>
          <p>Independent publishers get two options.</p>
          <p>
            Door one is a distributor. They take 60 points, pay in 90 days, send sales
            reports that are out of date when they arrive, and destroy what doesn&apos;t
            sell. You find out where your magazine went months after it went there.
          </p>
          <p>
            Door two is doing it yourself. Dozens of store relationships in a spreadsheet.
            Invoices you chase for six months. Reorders that only happen when you remember
            to ask.
          </p>
          <p>
            Most publishers pick door two and call it independence. It&apos;s really unpaid
            logistics work, eating the time you have to make the next issue.
          </p>
        </div>
      </section>

      {/* Mission block: index text left, the video right */}
      <section className="mk-section">
        <div className="container mk-mission">
          <div>
            <h2>Every independent magazine, in one place</h2>
            <p>
              300+ independent titles from 30+ countries. Food, music, fashion, sport,
              architecture, art, travel, and about thirty other niches.
            </p>
            <p>Publishers, your title is probably already here. Claim it and take the keys.</p>
            <Link className="button ghost" href="/index">
              Browse the index
            </Link>
          </div>
          <div className="mk-video">
            <iframe
              src="https://www.youtube-nocookie.com/embed/393cjk5hc5Q?autoplay=0&rel=0"
              title="Neesh - The Marketplace for Independent Magazines"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* Packs strip as the card grid */}
      <section className="mk-section band">
        <div className="container">
          <div className="mk-cards cols-3">
            <Link className="mk-card" href="/packs#the-waiting-room">
              <strong>The Waiting Room</strong>
              <span>For rooms where people sit longer than they planned.</span>
            </Link>
            <Link className="mk-card" href="/packs#the-studio">
              <strong>The Studio</strong>
              <span>For creative spaces that need something worth stealing an idea from.</span>
            </Link>
            <Link className="mk-card" href="/packs#the-listening-room">
              <strong>The Listening Room</strong>
              <span>For bars, record shops, and anywhere with a good soundsystem.</span>
            </Link>
            <Link className="mk-card" href="/packs#the-locker-room">
              <strong>The Locker Room</strong>
              <span>For gyms, climbing walls, and saunas.</span>
            </Link>
            <Link className="mk-card" href="/packs#table-service">
              <strong>Table Service</strong>
              <span>For restaurants and cafés with a bar people linger at.</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Closing CTA with the tilted images */}
      <section className="mk-cta-final">
        <img className="mk-cta-img left" src="/assets/cta-couch.jpg" alt="" loading="lazy" />
        <img className="mk-cta-img right" src="/assets/cta-flowers.jpg" alt="" loading="lazy" />
        <div className="mk-cta-center">
          <h2>Print didn&apos;t die. The shelf did.</h2>
          <p>
            Magazines live or die on shelves, and the shelves disappeared with the
            newsstands. We&apos;re rebuilding them in the spaces where people actually
            spend time.
          </p>
          <p>
            An index of every title worth knowing about, and the rails to move them into
            the world. Fifty years from now, someone should still be able to make a
            magazine and make a living.
          </p>
          <div className="cta-row">
            <Link className="button" href="/auth">
              Claim your title
            </Link>
            <Link className="button ghost" href="/packs">
              See the packs
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
