import type { Metadata } from 'next';
import Link from 'next/link';
import { canonical, faqPageLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Sell your magazine wholesale | Neesh for publishers',
  description:
    'List your independent magazine on Neesh and reach retailers, cafés, hotels, and studios worldwide. Your terms, real-time sales data, flat 10 percent commission.',
  alternates: { canonical: canonical('/publishers') },
};

const FAQ = [
  {
    question: 'Is Neesh a distributor?',
    answer:
      "No. We're a marketplace and the software underneath it. You set terms, we connect you with buyers and handle the transaction. If you already work with a distributor, Neesh sits alongside it and reaches the shops they don't call on.",
  },
  {
    question: 'What does Neesh cost?',
    answer: '10 percent of wholesale. Free to list, free to sell.',
  },
  {
    question: 'Do I have to ship the orders?',
    answer:
      'Your call. Self-fulfill and keep control, or use Neesh Fulfillment and stop touching boxes. Fulfillment is in beta and taking a small number of orders.',
  },
  {
    question: "What if my magazine isn't in the index yet?",
    answer: "Tell us and we'll add it. Takes a day.",
  },
  {
    question: 'Can I take my page down?',
    answer: 'Yes, same day, no questions.',
  },
  {
    question: 'Do you take back issues?',
    answer:
      "Yes, and we'd rather you sold them than stored them. Back issues do well in spaces where nobody's chasing the new one.",
  },
];

// Original PublishersPage layout (hero grid with image, band sections,
// numbered steps, card grid, centered closing CTA); new copy.
export default function ForPublishersPage() {
  return (
    <>
      <JsonLd data={faqPageLd(FAQ)} />

      {/* Hero */}
      <section className="mk-section">
        <div className="container mk-hero-grid">
          <div>
            <h1>You made a magazine. Not a logistics company.</h1>
            <p className="lede">
              Neesh gives independent publishers wholesale distribution without the
              distributor. Claim your page, set your own terms, and get your money as soon
              as it hits.
            </p>
            <Link className="button" href="/auth">
              Claim your title
            </Link>
          </div>
          <div className="mk-image">
            <img
              src="/assets/publishers-hero.png"
              alt="Publisher workspace with stacks of independent magazines"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      {/* Manifesto on the band */}
      <section className="mk-section band">
        <div className="container mk-manifesto">
          <h2>What distribution costs you</h2>
          <p>
            A distributor takes 60 points. You wait 90 days for the money. The sales
            reports arrive stale, if they arrive, and you learn where your copies went
            long after you could have done anything about it. What doesn&apos;t sell gets
            pulped, and you paid to print it.
          </p>
          <p>
            The alternative is worse in a different way. You become the distributor.
            Outreach, invoicing, reorders, chasing, and the spreadsheet that quietly
            becomes your second job.
          </p>
          <p>
            Both doors end in the same place. Publishers sell about half of what they
            print, because nobody gives them real numbers to plan with. Every unsold copy
            gets paid for twice, once at the printer and once in hours you didn&apos;t
            spend making the next issue.
          </p>
        </div>
      </section>

      {/* How it works: numbered circles */}
      <section className="mk-section">
        <div className="container">
          <h2 className="mk-heading">How it works</h2>
          <div className="mk-steps cols-3">
            <div className="mk-step">
              <div className="n">1</div>
              <h3>Claim your page</h3>
              <p>Your title is probably already in our index. Claim it and share your link.</p>
            </div>
            <div className="mk-step">
              <div className="n">2</div>
              <h3>Set your terms</h3>
              <p>
                Your wholesale price, your minimums, your rules. Fulfill it yourself or
                hand it to us.
              </p>
            </div>
            <div className="mk-step">
              <div className="n">3</div>
              <h3>We bring the shelves</h3>
              <p>
                Retailers and spaces order through the platform. You see every order,
                every location, and every reorder as it happens.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits card grid on the band */}
      <section className="mk-section band">
        <div className="container">
          <div className="mk-cards">
            <div className="mk-card">
              <h3>Real numbers, finally</h3>
              <p>
                Live sales data by title and location. You&apos;ll know what sold in
                Portland this month, what&apos;s reordering in Berlin, and what your next
                print run should actually be.
              </p>
            </div>
            <div className="mk-card">
              <h3>Rooms you&apos;d never have pitched</h3>
              <p>
                Half our buyers aren&apos;t bookshops. They&apos;re cafés, climbing gyms,
                hotels, studios, spas, and one very well-read ketamine clinic. Publishers
                tell us the best placements are the ones they&apos;d never have thought to
                ask for.
              </p>
            </div>
            <div className="mk-card">
              <h3>Your relationships stay yours</h3>
              <p>
                We&apos;re the rails, not the owner. You keep your terms, your pricing, and
                your direct line to the people stocking you.
              </p>
            </div>
            <div className="mk-card">
              <h3>One fee</h3>
              <p>10 percent of wholesale. Free to list, free to sell, no annual contract.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mk-section faq-section">
        <div className="container">
          <dl className="faq-list">
            {FAQ.map((item) => (
              <div key={item.question}>
                <dt>{item.question}</dt>
                <dd>{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mk-closing band">
        <div className="container">
          <h2>Get back to publishing</h2>
          <Link className="button" href="/auth">
            Claim your title
          </Link>
        </div>
      </section>
    </>
  );
}
