import type { Metadata } from 'next';
import Link from 'next/link';
import { canonical } from '@/lib/seo';
import { PacksShowcase, type PackSlide } from '@/components/PacksShowcase';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Curated magazine packs for cafés, hotels, spas, and studios | Neesh',
  description:
    'Five curated packs of independent magazines, built for specific kinds of rooms. $200 per pack, or $300 with a handmade wooden stand. No distributor account, no minimums.',
  alternates: { canonical: canonical('/packs') },
};

// Stripe checkout links carried over from the live pack page; /curatedpacks
// 301s here so existing links keep working. The layout is the original
// curated-packs page (hero grid, marquee, slider, band sections); the copy
// is the new site copy.
const PACKS: PackSlide[] = [
  {
    id: 'the-waiting-room',
    name: 'The Waiting Room',
    audience: 'Spas · Clinics · Salons',
    body: [
      'The waiting room is the most underrated shelf in your business. People are already sitting, already restless, already reaching for something. Give them a magazine worth the wait and the wait stops feeling like one.',
      'Titles run toward beauty, wellness, design, and long-form reading that survives an interruption.',
    ],
    image: '/curatedpacks/assets/waitingroom_stack.jpg',
    interiors: [
      '/curatedpacks/assets/waitingroom_01_mother-tongue_interior.jpg',
      '/curatedpacks/assets/waitingroom_02_interior.jpg',
      '/curatedpacks/assets/waitingroom_03_elementum_interior.jpg',
      '/curatedpacks/assets/waitingroom_04_pleasant-place_interior.jpg',
    ],
    order: 'https://buy.stripe.com/8x2eVd50Q0Q34Fa7RNabK00',
    withStand: 'https://buy.stripe.com/8x26oH3WM9mzb3y5JFabK01',
  },
  {
    id: 'the-studio',
    name: 'The Studio',
    audience: 'Design Studios · Agencies · Workshops',
    body: [
      'Nobody in a studio needs another screen. They need the thing on the table that starts an argument about a typeface. This pack is the one your team will quietly take home.',
      'Titles run toward design, architecture, photography, and craft.',
    ],
    image: '/curatedpacks/assets/studio_stack.jpg',
    interiors: [
      '/curatedpacks/assets/studio_01_the-plant_interior.jpg',
      '/curatedpacks/assets/studio_02_backstage-talks_interior.jpg',
      '/curatedpacks/assets/studio_03_interior.jpg',
      '/curatedpacks/assets/studio_04_interior.jpg',
    ],
    order: 'https://buy.stripe.com/4gMcN58d27er5JegojabK02',
    withStand: 'https://buy.stripe.com/7sYdR978Y0Q31sYgojabK03',
  },
  {
    id: 'the-listening-room',
    name: 'The Listening Room',
    audience: 'Record Shops · Bars · Listening Bars',
    body: [
      "Music print goes deep, and most of it never makes it past four shops on two continents. This pack is the good stuff: scene documentation, label histories, and the kind of writing that sends you to a record you'd never have found.",
      'Titles run toward music, club culture, and sound.',
    ],
    image: '/curatedpacks/assets/listeningroom_stack.jpg',
    interiors: [
      '/curatedpacks/assets/listeningroom_01_interior.jpg',
      '/curatedpacks/assets/listeningroom_02_interior.jpg',
      '/curatedpacks/assets/listeningroom_03_off-licence_interior.jpg',
      '/curatedpacks/assets/listeningroom_04_get-familiar_interior.jpg',
    ],
    order: 'https://buy.stripe.com/5kQ6oHbpefKX0oUdc7abK04',
    withStand: 'https://buy.stripe.com/3cIbJ18d2fKX7RmegbabK05',
  },
  {
    id: 'the-locker-room',
    name: 'The Locker Room',
    audience: 'Gyms · Climbing Walls · Saunas · Run Clubs',
    body: [
      'Sport print has gotten very good and almost nobody stocks it. This pack is for the room where people are already in their bodies and want to read about it.',
      'Titles run toward movement, endurance, outdoors, and the culture around all three.',
    ],
    image: '/curatedpacks/assets/lockerroom_stack.jpg',
    interiors: [
      '/curatedpacks/assets/lockerroom_01_mountain-gazette_interior.jpg',
      '/curatedpacks/assets/lockerroom_02_the-surfer-s-journal_interior.jpg',
      '/curatedpacks/assets/lockerroom_03_pitch_interior.jpg',
    ],
    order: 'https://buy.stripe.com/6oUaEX78YbuH6Nic83abK06',
    withStand: 'https://buy.stripe.com/7sY3cveBqbuH2x2fkfabK07',
  },
  {
    id: 'table-service',
    name: 'Table Service',
    audience: 'Restaurants · Cafés · Wine Bars',
    body: [
      'Solo diners, early arrivals, and anyone waiting on a table. Food print is beautiful, it photographs well, and it keeps people at the counter one more drink.',
      'Titles run toward food, drink, agriculture, and hospitality.',
    ],
    image: '/curatedpacks/assets/tableservice_stack.jpg',
    interiors: [
      '/curatedpacks/assets/tableservice_01_plates_interior.jpg',
      '/curatedpacks/assets/tableservice_02_cake-zine_interior.jpg',
      '/curatedpacks/assets/tableservice_03_interior.jpg',
    ],
    order: 'https://buy.stripe.com/14A28r3WMbuH6Ni0plabK08',
    withStand: 'https://buy.stripe.com/dRmfZh78Y56j2x22xtabK09',
  },
];

const MARQUEE = [
  '/curatedpacks/assets/listeningroom_04_get-familiar_interior.jpg',
  '/curatedpacks/assets/waitingroom_02_interior.jpg',
  '/curatedpacks/assets/lockerroom_02_the-surfer-s-journal_interior.jpg',
  '/curatedpacks/assets/studio_02_backstage-talks_interior.jpg',
  '/curatedpacks/assets/tableservice_01_plates_interior.jpg',
  '/curatedpacks/assets/waitingroom_01_mother-tongue_interior.jpg',
  '/curatedpacks/assets/studio_03_interior.jpg',
  '/curatedpacks/assets/listeningroom_02_interior.jpg',
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

function StandSvg() {
  return (
    <svg viewBox="0 0 460 320" role="img" aria-label="Rendering of the wooden pack stand holding three magazines">
      <defs>
        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C09A66" />
          <stop offset="1" stopColor="#96703F" />
        </linearGradient>
        <linearGradient id="woodside" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7d5a30" />
          <stop offset="1" stopColor="#96703F" />
        </linearGradient>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,.35)" />
          <stop offset=".4" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <g transform="translate(150,18) rotate(-4)">
        <rect width="140" height="192" rx="3" fill="#26403a" />
        <rect width="140" height="192" rx="3" fill="url(#sheen)" />
        <rect width="6" height="192" fill="rgba(0,0,0,.3)" />
        <text x="16" y="38" fill="#fff" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="16">
          ANCHOA
        </text>
      </g>
      <g transform="translate(196,32) rotate(2)">
        <rect width="140" height="192" rx="3" fill="#111114" />
        <rect width="140" height="192" rx="3" fill="url(#sheen)" />
        <rect width="6" height="192" fill="rgba(255,255,255,.08)" />
        <text x="16" y="38" fill="#fff" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="14">
          WAX POETICS
        </text>
      </g>
      <g transform="translate(120,50) rotate(-1)">
        <rect width="140" height="192" rx="3" fill="#f2ede2" />
        <rect width="6" height="192" fill="rgba(0,0,0,.12)" />
        <text x="16" y="38" fill="#111" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="14">
          BLUMENHAUS
        </text>
        <circle cx="94" cy="122" r="34" fill="#d88293" opacity=".45" />
      </g>
      <rect x="66" y="244" width="328" height="13" rx="3" fill="url(#wood)" />
      <rect x="66" y="257" width="328" height="7" fill="url(#woodside)" />
      <rect x="78" y="226" width="304" height="9" rx="3" fill="url(#wood)" />
      <rect x="92" y="264" width="13" height="40" fill="url(#woodside)" />
      <rect x="355" y="264" width="13" height="40" fill="url(#woodside)" />
      <ellipse cx="230" cy="310" rx="170" ry="7" fill="rgba(0,0,0,.08)" />
    </svg>
  );
}

export default function PacksPage() {
  return (
    <>
      {/* Hero */}
      <section className="pk-hero">
        <div className="container grid">
          <div>
            <span className="eyebrow">Packs</span>
            <h1>Five packs. Pick the one that sounds like your room.</h1>
            <p>
              Every pack is 8 to 10 independent titles, chosen for a specific kind of
              space by people who read them. One order, one invoice, delivered ready to
              put out.
            </p>
            <a className="button" href="#packs">
              Order a pack
            </a>
          </div>
          <img
            src="/curatedpacks/assets/hero_stack.jpg"
            fetchPriority="high"
            alt="A fanned stack of independent magazines"
          />
        </div>
      </section>

      {/* Marquee */}
      <div className="pk-marquee" aria-hidden="true">
        <div className="track">
          {[...MARQUEE, ...MARQUEE].map((src, i) => (
            <img loading="lazy" decoding="async" src={src} alt="" key={`${src}-${i}`} />
          ))}
        </div>
      </div>

      {/* Packs slider */}
      <section className="pk-packs" id="packs">
        <div className="container">
          <div className="pk-layout">
            <div className="pk-side">
              <h2>The packs</h2>
              <p className="sub">
                Every pack is 8 to 10 independent titles, chosen for a specific kind of
                space by people who read them.
              </p>
              <p className="pricing">
                <b>
                  <span>$200</span> per pack
                </b>
                One order, one invoice, delivered ready to put out.
              </p>
              <div className="pk-standcard">
                <StandSvg />
                <div className="eyebrow">Handmade in Portland, Oregon</div>
                <b>Add the stand, +$100</b>
                <p>
                  A handmade wooden magazine stand, built to hold the pack upright on a
                  counter or table.
                </p>
              </div>
            </div>
            <PacksShowcase packs={PACKS} />
          </div>
        </div>
      </section>

      {/* What arrives */}
      <section className="pk-why">
        <div className="container">
          <h2>What arrives</h2>
          <div className="grid">
            <div className="col">
              <p>8 to 10 independent titles, current issues, packed flat and ready to display.</p>
            </div>
            <div className="col">
              <p>
                A card listing every title, its publisher, and where it came from, so you
                can answer the question when a customer asks.
              </p>
            </div>
            <div className="col">
              <p>
                Optional: a handmade wooden magazine stand, built to hold the pack upright
                on a counter or table.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing + skip the packs */}
      <section className="pk-how">
        <div className="container">
          <div className="layout">
            <div>
              <h2>$200 a pack. $300 with the stand.</h2>
              <p className="guidep">
                No account setup, no minimums, no contract. Order one pack, order five, or
                don&apos;t order again. Signup takes under a minute.
              </p>
              <p className="guidep">
                Refresh seasonally, quarterly, or whenever you want a new shelf.
                We&apos;ll remind you and you can ignore us.
              </p>
              <a className="button" href="#packs">
                Order a pack
              </a>
            </div>
            <div className="card">
              <h3>Or skip the packs entirely</h3>
              <p>
                Every title in every pack came from our index of 300+ independent
                magazines. If you&apos;d rather choose your own, browse by niche and build
                a shelf that&apos;s only yours.
              </p>
              <Link className="button ghost" href="/index">
                Browse the index
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
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

      {/* Closing */}
      <section className="pk-ctaband band">
        <div className="container">
          <h2>Pick a room</h2>
          <div className="cta-row">
            <a className="button" href="#packs">
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
