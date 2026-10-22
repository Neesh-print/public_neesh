// The six curated packs. Order CTAs point at each pack's Stripe Payment Link
// in the "Neesh Print" account ($200 pack, $300 with the stand).

// Until a pack's Stripe links exist, its order buttons open an email to
// hi@neesh.art instead, so the page never shows a dead button.
const PENDING_ORDER = (pack: string) =>
  `mailto:hi@neesh.art?subject=${encodeURIComponent(`Order: ${pack}`)}`;

// One title in a pack's box. Titles in the directory carry a slug and render
// as linked cards with their directory cover; the rest ship a static cover
// under /assets/covers. A static image set alongside a slug overrides the
// directory cover (for records whose stored cover is wrong).
export interface PackTitle {
  title: string;
  slug?: string;
  image?: string;
}

export interface Pack {
  slug: string;
  name: string;
  rooms: string;
  // Two-room label for the shelf tiles (the tile only fits ~two room types).
  short: string;
  price: number;
  blurb: string;
  count: string;
  retail: string;
  image: string;
  order: string;
  withStand: string;
  // The actual box contents, in stack order (per the pack cover manifest).
  contents: PackTitle[];
}

export const PACKS: Pack[] = [
  {
    slug: 'waiting-room',
    name: 'The Waiting Room',
    rooms: 'Spas · Therapy Offices · Clinics · Salons',
    short: 'Spas · Clinics',
    price: 200,
    blurb:
      'Plants, mushrooms, slow attention, and the body. Print that lowers the heart rate of the room it sits in.',
    count: '9 titles',
    retail: '$250.00',
    image: '/assets/pack-waiting-room.jpg',
    order: 'https://buy.stripe.com/eVq9AS0L4034bRBarI7N600',
    withStand: 'https://buy.stripe.com/9B67sK8dw5no3l51Vc7N601',
    contents: [
      { title: 'Different Leaf', slug: 'different-leaf' },
      { title: 'Blumenhaus', image: '/assets/covers/waitingroom_02_blumenhaus.jpg' },
      { title: 'Mother Tongue', slug: 'mother-tongue' },
      { title: 'Mushroom People', slug: 'mushroom-people' },
      { title: 'Catnip', slug: 'catnip' },
      { title: 'Elastic', slug: 'elastic' },
      { title: 'Undergrowth', image: '/assets/covers/waitingroom_07_undergrowth.jpg' },
      { title: 'Elementum', image: '/assets/covers/waitingroom_08_elementum.jpg' },
      { title: 'Pleasant Place', slug: 'pleasant-place' },
    ],
  },
  {
    slug: 'fitting-room',
    name: 'The Fitting Room',
    rooms: 'Boutiques · Concept Stores · Showrooms · Vintage Shops',
    short: 'Boutiques · Showrooms',
    price: 200,
    blurb:
      "Cloth, cut, closets, and the people who live in them. Print that tells a customer they're in the right shop before they touch a hanger.",
    count: '9 titles',
    retail: '$282.10',
    image: '/assets/pack-fitting-room.jpg',
    // TODO(stripe): replace with the Fitting Room $200 and $300 Payment Links.
    order: PENDING_ORDER('The Fitting Room'),
    withStand: PENDING_ORDER('The Fitting Room, with stand'),
    contents: [
      { title: 'MANY OF THEM', slug: 'many-of-them' },
      { title: 'Petit Mort', slug: 'petit-mort' },
      { title: 'Majin', slug: 'majin-magazine' },
      { title: 'Wardrobe Theory Project', slug: 'wardrobe-theory-project' },
      { title: 'Fay', slug: 'fay' },
      { title: 'Viscose Journal', slug: 'viscose-journal' },
      { title: 'ALL–IN', slug: 'allin-magazine' },
      { title: 'Acne Paper', slug: 'acne-paper' },
      // Static cover until the Index record's image is replaced in storage.
      { title: 'L’Étiquette', slug: 'letiquette', image: '/assets/covers/fittingroom_letiquette.jpg' },
    ],
  },
  {
    slug: 'listening-room',
    name: 'The Listening Room',
    rooms: 'Record Shops · Bars · Listening Bars',
    short: 'Record Shops · Bars',
    price: 200,
    blurb:
      "Music print goes deep, and most of it never makes it past four shops on two continents. This pack is the good stuff: scene documentation, label histories, and the kind of writing that sends you to a record you'd never have found. Titles run toward music, club culture, and sound.",
    count: '10 titles',
    retail: '$240.00',
    image: '/assets/pack-listening-room.jpg',
    order: 'https://buy.stripe.com/28E9AS1P8g221cXeHY7N603',
    withStand: 'https://buy.stripe.com/cNicN4alE7vw08TgQ67N604',
    contents: [
      { title: 'Living Proof', image: '/assets/covers/listeningroom_01_living-proof.jpg' },
      { title: 'No Way Back', image: '/assets/covers/listeningroom_02_no-way-back.jpg' },
      { title: 'Heartbeat', slug: 'heartbeat' },
      { title: 'No One Magazine', slug: 'no-one-magazine' },
      { title: 'Portland Rave Flyers', slug: 'portland-rave-flyers' },
      { title: 'Wax Poetics', image: '/assets/covers/listeningroom_06_wax-poetics.jpg' },
      { title: 'Brick', slug: 'brick' },
      { title: 'Off Licence', slug: 'off-licence' },
      { title: 'zweikommasieben', slug: 'zweikommasieben' },
      { title: 'Get Familiar', slug: 'get-familiar' },
    ],
  },
  {
    slug: 'trailhead',
    name: 'The Trailhead',
    rooms: 'Outdoor Shops · Running Stores · Climbing Gyms · Run Clubs',
    short: 'Outdoor · Running',
    price: 200,
    blurb:
      "Mountains, courts, long runs, and the people who can't sit still. Print for the room where everyone just got back from somewhere.",
    count: '9 titles',
    retail: '$255.00',
    image: '/assets/pack-trailhead.jpg',
    // TODO(stripe): replace with the Trailhead $200 and $300 Payment Links.
    order: PENDING_ORDER('The Trailhead'),
    withStand: PENDING_ORDER('The Trailhead, with stand'),
    contents: [
      { title: 'Mountain Gazette', slug: 'mountain-gazette' },
      { title: 'Victory Journal', slug: 'victory-journal' },
      { title: 'Racquet', slug: 'racquet-mag' },
      { title: 'Good Sport', slug: 'good-sport' },
      { title: "The Surfer's Journal", slug: 'the-surfers-journal' },
      { title: 'Like the Wind', slug: 'like-the-wind' },
      { title: 'OPEN Tennis', slug: 'open-tennis-magazine' },
      { title: 'Huck', image: '/assets/covers/lockerroom_04_huck.jpg' },
      { title: 'Pitch', slug: 'pitch' },
    ],
  },
  {
    slug: 'table-service',
    name: 'Table Service',
    rooms: 'Cafés · Wine Bars · Wine Shops · Specialty Grocers',
    short: 'Cafés · Wine Bars',
    price: 200,
    blurb:
      'Solo diners, early arrivals, and anyone waiting on a table. Food print is beautiful, it photographs well, and it keeps people at the counter one more drink. Titles run toward food, drink, agriculture, and hospitality.',
    count: '10 titles',
    retail: '$249.00',
    image: '/assets/pack-table-service-alt.jpg',
    order: 'https://buy.stripe.com/28EbJ0eBUcPQ8Fp6bs7N60a',
    withStand: 'https://buy.stripe.com/28E5kC79sbLM7Bl1Vc7N608',
    contents: [
      { title: 'Yolo Journal', slug: 'yolo-journal' },
      { title: 'Anchoa', slug: 'anchoa' },
      { title: 'Fulgurances', image: '/assets/covers/tableservice_03_fulgurances.jpg' },
      { title: 'Cherry Bombe', slug: 'cherry-bombe' },
      { title: 'Plates', slug: 'plates' },
      { title: 'Cake Zine', slug: 'cake-zine' },
      { title: 'FARE', slug: 'fare' },
      { title: 'Eaten', slug: 'eaten' },
      { title: 'Kitchen Table', slug: 'kitchen-table' },
      { title: 'Noble Rot', slug: 'noble-rot' },
    ],
  },
  {
    slug: 'guest-room',
    name: 'The Guest Room',
    rooms: 'Hotels · Design Shops · Home & Gift Boutiques',
    short: 'Hotels · Design Shops',
    price: 200,
    blurb:
      'Rooms, objects, far-off places, and the people who make them. Print that makes a room feel lived in by someone with taste.',
    count: '8 titles',
    retail: '$254.50',
    image: '/assets/pack-guest-room.jpg',
    // TODO(stripe): replace with the Guest Room $200 and $300 Payment Links.
    order: PENDING_ORDER('The Guest Room'),
    withStand: PENDING_ORDER('The Guest Room, with stand'),
    contents: [
      { title: 'Kinfolk', slug: 'kinfolk' },
      { title: 'MacGuffin', slug: 'macguffin' },
      { title: 'Ori Magazine', slug: 'ori-magazine' },
      { title: 'Cabana', slug: 'cabana' },
      { title: 'Openhouse', slug: 'openhouse' },
      { title: 'Magazine B', slug: 'magazine-b' },
      { title: 'Desired Landscapes', slug: 'desired-landscapes' },
      { title: 'Roads & Kingdoms', slug: 'roads-and-kingdoms' },
    ],
  },
];

export function getPack(slug: string): Pack | undefined {
  return PACKS.find((p) => p.slug === slug);
}
