// The five curated packs (v2 design copy). Order CTAs keep the live Stripe
// payment links from the current site; the prototype routed them to retailer
// signup instead — flagged as an open design decision.
export interface Pack {
  slug: string;
  name: string;
  rooms: string;
  blurb: string;
  count: string;
  retail: string;
  image: string;
  order: string;
  withStand: string;
  // Directory niches used to pick representative covers for the detail page.
  niches: string[];
  // Confirmed pack contents (directory slugs) — pinned first in the
  // "What's in the box" grid; niche-matched titles fill the rest.
  knownSlugs: string[];
}

export const PACKS: Pack[] = [
  {
    slug: 'waiting-room',
    name: 'The Waiting Room',
    rooms: 'Spas · Therapy Offices · Clinics · Salons',
    blurb:
      'Plants, mushrooms, slow attention, and the body. Print that lowers the heart rate of the room it sits in.',
    count: '9 titles',
    retail: '$250.00',
    image: '/assets/pack-waiting-room.jpg',
    order: 'https://buy.stripe.com/8x2eVd50Q0Q34Fa7RNabK00',
    withStand: 'https://buy.stripe.com/8x26oH3WM9mzb3y5JFabK01',
    niches: ['Nature & Environment', 'Lifestyle', 'Ideas & Science'],
    knownSlugs: ['mother-tongue', 'pleasant-place', 'mushroom-people'],
  },
  {
    slug: 'studio',
    name: 'The Studio',
    rooms: 'Design Studios · Agencies · Workshops',
    blurb:
      'Nobody in a studio needs another screen. They need the thing on the table that starts an argument about a typeface. This pack is the one your team will quietly take home. Titles run toward design, architecture, photography, and craft.',
    count: '9 titles',
    retail: '$253.50',
    image: '/assets/pack-studio.jpg',
    order: 'https://buy.stripe.com/4gMcN58d27er5JegojabK02',
    withStand: 'https://buy.stripe.com/7sYdR978Y0Q31sYgojabK03',
    niches: ['Design & Architecture', 'Art', 'Photography'],
    knownSlugs: [],
  },
  {
    slug: 'listening-room',
    name: 'The Listening Room',
    rooms: 'Record Shops · Bars · Listening Bars',
    blurb:
      "Music print goes deep, and most of it never makes it past four shops on two continents. This pack is the good stuff: scene documentation, label histories, and the kind of writing that sends you to a record you'd never have found. Titles run toward music, club culture, and sound.",
    count: '10 titles',
    retail: '$240.00',
    image: '/assets/pack-listening-room.jpg',
    order: 'https://buy.stripe.com/5kQ6oHbpefKX0oUdc7abK04',
    withStand: 'https://buy.stripe.com/3cIbJ18d2fKX7RmegbabK05',
    niches: ['Music'],
    knownSlugs: ['off-licence', 'get-familiar'],
  },
  {
    slug: 'locker-room',
    name: 'The Locker Room',
    rooms: 'Gyms · Climbing Walls · Saunas · Run Clubs',
    blurb:
      'Sport print has gotten very good and almost nobody stocks it. This pack is for the room where people are already in their bodies and want to read about it. Titles run toward movement, endurance, outdoors, and the culture around all three.',
    count: '9 titles',
    retail: '$232.00',
    image: '/assets/pack-table-service.jpg',
    order: 'https://buy.stripe.com/6oUaEX78YbuH6Nic83abK06',
    withStand: 'https://buy.stripe.com/7sY3cveBqbuH2x2fkfabK07',
    niches: ['Sport & Outdoors'],
    knownSlugs: ['mountain-gazette', 'the-surfers-journal', 'pitch'],
  },
  {
    slug: 'table-service',
    name: 'Table Service',
    rooms: 'Restaurants · Cafés · Wine Bars',
    blurb:
      'Solo diners, early arrivals, and anyone waiting on a table. Food print is beautiful, it photographs well, and it keeps people at the counter one more drink. Titles run toward food, drink, agriculture, and hospitality.',
    count: '10 titles',
    retail: '$249.00',
    image: '/assets/pack-table-service-alt.jpg',
    order: 'https://buy.stripe.com/14A28r3WMbuH6Ni0plabK08',
    withStand: 'https://buy.stripe.com/dRmfZh78Y56j2x22xtabK09',
    niches: ['Food & Drink', 'Travel'],
    knownSlugs: ['plates', 'cake-zine'],
  },
];

export function getPack(slug: string): Pack | undefined {
  return PACKS.find((p) => p.slug === slug);
}
