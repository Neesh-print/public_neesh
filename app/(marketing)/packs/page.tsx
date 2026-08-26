import type { Metadata } from 'next';
import Link from 'next/link';
import { canonical } from '@/lib/seo';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Curated magazine packs for cafés, hotels, spas, and studios | Neesh',
  description:
    'Five curated packs of independent magazines, built for specific kinds of rooms. $200 per pack, or $300 with a handmade wooden stand. No distributor account, no minimums.',
  alternates: { canonical: canonical('/packs') },
};

// Stripe checkout links carried over from the live pack page; /curatedpacks
// 301s here so existing links keep working.
const PACKS = [
  {
    id: 'the-waiting-room',
    name: 'The Waiting Room',
    audience: 'For spas, clinics, salons, and anywhere people sit longer than they planned.',
    body: [
      'The waiting room is the most underrated shelf in your business. People are already sitting, already restless, already reaching for something. Give them a magazine worth the wait and the wait stops feeling like one.',
      'Titles run toward beauty, wellness, design, and long-form reading that survives an interruption.',
    ],
    image: '/curatedpacks/assets/waitingroom_stack.jpg',
    order: 'https://buy.stripe.com/8x2eVd50Q0Q34Fa7RNabK00',
    withStand: 'https://buy.stripe.com/8x26oH3WM9mzb3y5JFabK01',
  },
  {
    id: 'the-studio',
    name: 'The Studio',
    audience: 'For design studios, agencies, workshops, and any room where people make things.',
    body: [
      'Nobody in a studio needs another screen. They need the thing on the table that starts an argument about a typeface. This pack is the one your team will quietly take home.',
      'Titles run toward design, architecture, photography, and craft.',
    ],
    image: '/curatedpacks/assets/studio_stack.jpg',
    order: 'https://buy.stripe.com/4gMcN58d27er5JegojabK02',
    withStand: 'https://buy.stripe.com/7sYdR978Y0Q31sYgojabK03',
  },
  {
    id: 'the-listening-room',
    name: 'The Listening Room',
    audience: 'For record shops, bars, listening bars, and rooms with a real soundsystem.',
    body: [
      "Music print goes deep, and most of it never makes it past four shops on two continents. This pack is the good stuff: scene documentation, label histories, and the kind of writing that sends you to a record you'd never have found.",
      'Titles run toward music, club culture, and sound.',
    ],
    image: '/curatedpacks/assets/listeningroom_stack.jpg',
    order: 'https://buy.stripe.com/5kQ6oHbpefKX0oUdc7abK04',
    withStand: 'https://buy.stripe.com/3cIbJ18d2fKX7RmegbabK05',
  },
  {
    id: 'the-locker-room',
    name: 'The Locker Room',
    audience: 'For gyms, climbing walls, saunas, run clubs, and studios.',
    body: [
      'Sport print has gotten very good and almost nobody stocks it. This pack is for the room where people are already in their bodies and want to read about it.',
      'Titles run toward movement, endurance, outdoors, and the culture around all three.',
    ],
    image: '/curatedpacks/assets/lockerroom_stack.jpg',
    order: 'https://buy.stripe.com/6oUaEX78YbuH6Nic83abK06',
    withStand: 'https://buy.stripe.com/7sY3cveBqbuH2x2fkfabK07',
  },
  {
    id: 'table-service',
    name: 'Table Service',
    audience: 'For restaurants, cafés, wine bars, and anywhere with a bar people linger at.',
    body: [
      'Solo diners, early arrivals, and anyone waiting on a table. Food print is beautiful, it photographs well, and it keeps people at the counter one more drink.',
      'Titles run toward food, drink, agriculture, and hospitality.',
    ],
    image: '/curatedpacks/assets/tableservice_stack.jpg',
    order: 'https://buy.stripe.com/14A28r3WMbuH6Ni0plabK08',
    withStand: 'https://buy.stripe.com/dRmfZh78Y56j2x22xtabK09',
  },
];

const FAQ = [
  {
    question: 'How many magazines come in a pack?',
    answer: '8 to 10, depending on the titles and their trim sizes.',
  },
  {
    question: 'Are the titles always the same?',
    answer:
      "No. Packs get refreshed as new issues come out and new titles join the index. Order the same pack twice and you'll get a different shelf.",
  },
  {
    question: 'Can I swap titles out?',
    answer:
      'Not inside a pack. If you want control over specific titles, build your own from the index.',
  },
  {
    question: 'Do you ship outside the US?',
    answer: "Ask us. Depends where you are and what's in the pack.",
  },
  {
    question: "What's the wooden stand made of?",
    answer:
      "Wood, by hand, in small batches. It holds a pack upright and it doesn't look like office furniture.",
  },
];

export default function PacksPage() {
  return (
    <>
      <section className="m-hero">
        <div className="container">
          <h1>Five packs. Pick the one that sounds like your room.</h1>
          <p className="lede">
            Every pack is 8 to 10 independent titles, chosen for a specific kind of space
            by people who read them. One order, one invoice, delivered ready to put out.
          </p>
          <a className="button" href="#the-waiting-room">
            Order a pack
          </a>
        </div>
      </section>

      {PACKS.map((pack, i) => (
        <section className={`pack-section${i % 2 === 0 ? ' band' : ''}`} id={pack.id} key={pack.id}>
          <div className="container pack-grid">
            <img src={pack.image} alt={`${pack.name} pack`} loading="lazy" />
            <div>
              <h2>{pack.name}</h2>
              <p className="pack-audience">{pack.audience}</p>
              {pack.body.map((para) => (
                <p key={para.slice(0, 24)}>{para}</p>
              ))}
              <div className="cta-row">
                <a className="button" href={pack.order}>
                  Order this pack
                </a>
                <a className="button ghost" href={pack.withStand}>
                  With stand, $300
                </a>
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="audience-block">
        <div className="container">
          <h2>What arrives</h2>
          <p>8 to 10 independent titles, current issues, packed flat and ready to display.</p>
          <p>
            A card listing every title, its publisher, and where it came from, so you can
            answer the question when a customer asks.
          </p>
          <p>
            Optional: a handmade wooden magazine stand, built to hold the pack upright on
            a counter or table.
          </p>
        </div>
      </section>

      <section className="audience-block band">
        <div className="container">
          <h2>$200 a pack. $300 with the stand.</h2>
          <p>
            No account setup, no minimums, no contract. Order one pack, order five, or
            don&apos;t order again. Signup takes under a minute.
          </p>
          <p>
            Refresh seasonally, quarterly, or whenever you want a new shelf. We&apos;ll
            remind you and you can ignore us.
          </p>
          <a className="button" href="#the-waiting-room">
            Order a pack
          </a>
        </div>
      </section>

      <section className="audience-block">
        <div className="container">
          <h2>Or skip the packs entirely</h2>
          <p>
            Every title in every pack came from our index of 300+ independent magazines.
            If you&apos;d rather choose your own, browse by niche and build a shelf
            that&apos;s only yours.
          </p>
          <Link className="button ghost" href="/index">
            Browse the index
          </Link>
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
          <h2>Pick a room</h2>
          <div className="cta-row">
            <a className="button" href="#the-waiting-room">
              Order a pack
            </a>
            <Link className="button ghost" href="/index">
              Browse the index
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
