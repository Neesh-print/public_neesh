import type { Metadata } from 'next';
import Link from 'next/link';
import { canonical, faqPageLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Stock independent magazines in your shop, café, hotel, or studio | Neesh',
  description:
    'Curated packs of independent magazines for shops, cafés, hotels, spas, gyms, and studios. One order, no distributor account, refreshed on your schedule.',
  alternates: { canonical: canonical('/spaces') },
};

const FAQ = [
  { question: 'Do I need a distributor account?', answer: "No. That's the point." },
  {
    question: "What's the minimum order?",
    answer: 'For packs, none. For individual titles from the index, it depends on the publisher.',
  },
  {
    question: 'How much does a pack cost?',
    answer:
      '$200 for 8 to 10 considered titles. $300 with a handmade wooden magazine stand. Less than what you spend on flowers.',
  },
  {
    question: 'Do I have to sell them?',
    answer:
      'Up to you. Plenty of our spaces put them out for guests and never ring one up. Others sell every copy. Fully your call.',
  },
  {
    question: 'Can I choose the titles?',
    answer:
      "Packs come pre-curated to take the decision off your plate. If you'd rather choose, dig into the index and build your own.",
  },
  { question: 'What if my customers take them?', answer: 'Then it worked.' },
];

const PACKS = [
  {
    name: 'The Waiting Room',
    line: 'For spas, clinics, salons, and anywhere people sit longer than they planned. Titles worth the wait.',
  },
  {
    name: 'The Studio',
    line: 'For design studios, agencies, and workshops. The magazines your team will steal ideas from.',
  },
  {
    name: 'The Listening Room',
    line: 'For record shops, bars, and rooms with a real soundsystem. Music print, deep and strange.',
  },
  {
    name: 'The Locker Room',
    line: 'For gyms, climbing walls, saunas, and run clubs. Sport, movement, and the culture around it.',
  },
  {
    name: 'Table Service',
    line: 'For restaurants and cafés with a bar people linger at. Food, drink, and the good kind of distraction.',
  },
];

export default function ForSpacesPage() {
  return (
    <>
      <JsonLd data={faqPageLd(FAQ)} />

      <section className="m-hero">
        <div className="container">
          <h1>Your space has a feed problem.</h1>
          <p className="lede">
            Every café looks like every café now. Same plants, same playlist, same
            renovation the algorithm suggested to everyone at once.
          </p>
          <p className="lede">
            A shelf of independent magazines is the quickest way to make a room feel like
            someone chose it.
          </p>
          <Link className="button" href="/packs">
            See the packs
          </Link>
        </div>
      </section>

      <section className="band">
        <div className="container manifesto">
          <h2>Nobody makes this easy</h2>
          <p>
            Try buying magazines for a business. Distributors want a full account, a
            minimum order, and paperwork, all for someone who wants eight good titles
            refreshed a few times a year. Buying them retail one at a time costs a fortune
            and eats an afternoon.
          </p>
          <p>So the shelf never happens. And the room stays interchangeable.</p>
        </div>
      </section>

      <section className="steps-section">
        <div className="container">
          <h2>How it works</h2>
          <div className="steps">
            <div className="step">
              <div className="n">1</div>
              <div>
                <strong>Pick your pack.</strong>
                <p>A suite of packs, each curated for a specific kind of room. Or build your own from the index.</p>
              </div>
            </div>
            <div className="step">
              <div className="n">2</div>
              <div>
                <strong>One order.</strong>
                <p>
                  Pay however you want. Signup takes under a minute and nothing is locked
                  in. Your pack arrives ready to display.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="n">3</div>
              <div>
                <strong>Refresh when you want.</strong>
                <p>
                  Seasonal, quarterly, or whenever. Your shelf stays current and you
                  don&apos;t think about it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="container">
          <h2>The packs</h2>
          <ul className="packs-strip">
            {PACKS.map((pack) => (
              <li key={pack.name}>
                <Link href={`/packs#${pack.name.toLowerCase().replace(/ /g, '-')}`}>
                  <strong>{pack.name}</strong>
                  <span>{pack.line}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link className="button ghost" href="/packs">
            See all packs
          </Link>
        </div>
      </section>

      <section className="audience-block">
        <div className="container">
          <h2>What print does to a room</h2>
          <p>
            One of our publishers left a single copy at her hairdresser&apos;s. Months
            later, strangers were still messaging her about it.
          </p>
          <p>
            A magazine on a table gets picked up, photographed, and remembered in a way a
            screen never is. It tells people who walk in that somebody here made a choice.
          </p>
          <p>Generic spaces compete on price. Rooms with a point of view don&apos;t have to.</p>
        </div>
      </section>

      <section className="faq-section band">
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

      <section className="closing-band">
        <div className="container">
          <h2>Make the room say something</h2>
          <div className="cta-row">
            <Link className="button" href="/packs">
              See the packs
            </Link>
            <Link className="button ghost" href="/index">
              Browse the index
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
