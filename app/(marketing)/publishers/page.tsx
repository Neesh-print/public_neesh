import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowIcon } from '@/components/Logo';

export const metadata: Metadata = {
  title: 'For Publishers | Neesh',
  description:
    'Wholesale distribution without the distributor. Claim your page, set your own terms, and get your money as soon as it hits.',
  alternates: { canonical: '/publishers' },
};

const FAQ: [string, string][] = [
  [
    'Is Neesh a distributor?',
    "No. We're a marketplace and the software underneath it. You set terms, we connect you with buyers and handle the transaction. If you already work with a distributor, Neesh sits alongside it and reaches the shops they don't call on.",
  ],
  ['What does Neesh cost?', '10 percent of wholesale. Free to list, free to sell.'],
  [
    'Do I have to ship the orders?',
    'Your call. Self-fulfill and keep control, or use Neesh Fulfillment and stop touching boxes. Fulfillment is in beta and taking a small number of orders.',
  ],
  ["What if my magazine isn't in the index yet?", "Tell us and we'll add it. Takes a day."],
  ['Can I take my page down?', 'Yes, same day, no questions.'],
  [
    'Do you take back issues?',
    "Yes, and we'd rather you sold them than stored them. Back issues do well in spaces where nobody's chasing the new one.",
  ],
];

const BENEFITS: [string, string][] = [
  [
    'Real numbers, finally',
    "Live sales data by title and location. You'll know what sold in Portland this month, what's reordering in Berlin, and what your next print run should actually be.",
  ],
  [
    "Rooms you'd never have pitched",
    "Half our buyers aren't bookshops. They're cafés, climbing gyms, hotels, studios, spas, and one very well-read ketamine clinic. Publishers tell us the best placements are the ones they'd never have thought to ask for.",
  ],
  [
    'Your relationships stay yours',
    "We're the rails, not the owner. You keep your terms, your pricing, and your direct line to the people stocking you.",
  ],
  ['One fee', '10 percent of wholesale. Free to list, free to sell, no annual contract.'],
];

const HOW: [string, string, string][] = [
  ['01', 'Claim your page', 'Your title is probably already in our index. Claim it and share your link.'],
  ['02', 'Set your terms', 'Your wholesale price, your minimums, your rules. Fulfill it yourself or hand it to us.'],
  [
    '03',
    'We bring the shelves',
    'Retailers and spaces order through the platform. You see every order, every location, and every reorder as it happens.',
  ],
];

export default function PublishersPage() {
  return (
    <>
      <section className="page-hero">
        <img
          src="/assets/publisher-portrait.jpg"
          alt="A publisher with her magazines"
          style={{ objectPosition: '50% 24%' }}
        />
        <div className="scrim" />
        <div className="page-hero-content">
          <span className="eyebrow">For publishers</span>
          <h1>You made a magazine. Not a logistics company.</h1>
          <div className="page-hero-row">
            <p>
              Neesh gives independent publishers wholesale distribution without the distributor.
              Claim your page, set your own terms, and get your money as soon as it hits.
            </p>
            <div className="page-hero-cta">
              <Link href="/auth/publisher" className="btn accent hero">
                Claim your title
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
            {BENEFITS.map(([heading, body]) => (
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

      <section className="closing scrimmed closing-big-cta">
        <img
          src="/assets/market-print.jpg"
          alt="A publisher handling a print"
          style={{ objectPosition: '50% 36%', opacity: 0.5 }}
        />
        <div className="scrim" style={{ position: 'absolute', inset: 0 }} />
        <div className="closing-content">
          <h2>Get back to publishing</h2>
          <Link href="/auth/publisher" className="btn accent hero">
            Claim your title
            <ArrowIcon />
          </Link>
          <span className="hand-note">We review every claim by hand.</span>
        </div>
      </section>
    </>
  );
}
