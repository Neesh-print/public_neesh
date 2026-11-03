import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowIcon } from '@/components/Logo';

// Orphan landing page for the free-fulfillment offer to Neesh's first 100
// publishers. Linked only from publisher outreach email: kept out of the nav,
// the sitemap and search results.
export const metadata: Metadata = {
  title: 'Free fulfillment for our first 100 publishers | Neesh',
  description:
    'Send us your copies and we pick, pack and ship every Neesh order, free until June 2027. Open to the first 100 publishers on Neesh.',
  alternates: { canonical: '/fulfillment' },
  robots: { index: false, follow: false },
};

const HOW: [string, string, string][] = [
  ['01', 'Claim your page', 'Your title is probably already on the Neesh Index. Claim it, set your wholesale price and minimums, and tell us you want fulfillment.'],
  ['02', 'Send us your copies', 'Ship a stack of the current issue and any back issues you want to sell. We send you the delivery address once you’re approved.'],
  ['03', 'We ship every order', 'Spaces order on Neesh, we pick, pack and ship, and you get paid as soon as the order is on its way.'],
];

const TERMS: [string, string][] = [
  ['Free until June 2027', 'No fulfillment fee, no storage fee and no packing fee until June 2027. You pay the same 10 percent of wholesale as every publisher on Neesh.'],
  ['Spaces pay shipping', 'Postage to the space is charged at checkout. You never pay to ship an order.'],
  ['Paid when it ships', 'Your payout is released as soon as we confirm the order has shipped.'],
  ['A year on the shelf', 'We hold your stock for 365 days from arrival. Copies that haven’t sold can go into our curated packs, and anything still left comes back to you at your cost.'],
];

const FAQ: [string, string][] = [
  ['Who can join?', 'The first 100 independent publishers to claim their page and sign up. Once the spots are gone, they’re gone.'],
  ['Do I still set my own price?', 'Yes. Your wholesale price, your minimums and your terms stay yours. We only handle the boxes.'],
  ['Can I keep my distributor?', 'Yes. Neesh sits alongside any distributor you already use and reaches the shops they don’t call on.'],
  ['What happens after June 2027?', 'Fulfillment becomes an extra 15 percent of wholesale, so 25 percent in total on orders we ship for you. Keep it, or take your copies back and ship orders yourself at the usual 10 percent. Either way, your page and your spaces stay with you.'],
];

export default function FulfillmentPage() {
  return (
    <>
      <section className="page-hero">
        <img
          fetchPriority="high"
          src="/assets/hero-magazine-flatlay.jpg"
          alt="Independent magazines laid out on a table"
          style={{ objectPosition: '50% 50%' }}
        />
        <div className="scrim" />
        <div className="page-hero-content">
          <span className="eyebrow">For our first 100 publishers</span>
          <h1>We&rsquo;ll ship your magazine. Free.</h1>
          <div className="page-hero-row">
            <p>
              Send us your copies and we pick, pack and ship every Neesh order, free until June
              2027. No fulfillment fee. You make the magazine, we move it.
            </p>
            <div className="page-hero-cta">
              <Link href="/auth/publisher" className="btn accent hero">
                Claim your spot
                <ArrowIcon />
              </Link>
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

      <section className="benefits">
        <div className="wrap">
          <div className="benefits-grid roomy">
            {TERMS.map(([heading, body]) => (
              <div className="benefit" key={heading}>
                <h3>{heading}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="plain-section" id="faq">
        <div className="wrap">
          <h2 className="section-label">The fine print</h2>
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

      <section className="closing scrimmed closing-big-cta">
        <img
          loading="lazy"
          decoding="async"
          src="/assets/market-print.jpg"
          alt="A publisher handling a print"
          style={{ objectPosition: '50% 36%', opacity: 0.5 }}
        />
        <div className="scrim" style={{ position: 'absolute', inset: 0 }} />
        <div className="closing-content">
          <h2>Get back to publishing</h2>
          <Link href="/auth/publisher" className="btn accent hero">
            Claim your spot
            <ArrowIcon />
          </Link>
          <span className="hand-note">We review every publisher by hand.</span>
        </div>
      </section>
    </>
  );
}
