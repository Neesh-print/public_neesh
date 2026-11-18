// Benchmark tables behind the magazine calculator. These are the observed,
// quoted and estimated figures the page cites; update them here without
// touching the math in model.ts. Values and dates are the prototype's.

export type BenchType = 'obs' | 'quote' | 'est' | 'policy' | 'anec';

export const BENCH_TYPE_LABEL: Record<BenchType, string> = {
  obs: 'Observed',
  quote: 'Quoted',
  est: 'Estimate',
  policy: 'Neesh terms',
  anec: 'Anecdotal',
};

/** US shelf price histogram, 156 independent titles. */
export const HIST: { lo: number; hi: number; n: number; l: string }[] = [
  { lo: 0, hi: 15, n: 10, l: 'Under $15' },
  { lo: 15, hi: 20, n: 23, l: '$15-20' },
  { lo: 20, hi: 25, n: 40, l: '$20-25' },
  { lo: 25, hi: 30, n: 37, l: '$25-30' },
  { lo: 30, hi: 40, n: 31, l: '$30-40' },
  { lo: 40, hi: 1e9, n: 15, l: '$40+' },
];

export interface PriceBand {
  name: string;
  lo: number;
  hi: number;
  med: number;
  p25: number;
  p75: number;
  n: number;
}

/** Cover price by page count, from 41 Neesh listings with page counts. */
export const BANDS: PriceBand[] = [
  { name: 'Under 64 pages', lo: 0, hi: 63, med: 15, p25: 9, p75: 18, n: 6 },
  { name: '64 to 119 pages', lo: 64, hi: 119, med: 23.5, p25: 18, p75: 27, n: 14 },
  { name: '120 to 179 pages', lo: 120, hi: 179, med: 25, p25: 20, p75: 30, n: 14 },
  { name: '180+ pages', lo: 180, hi: 1e9, med: 24, p25: 20, p75: 28, n: 7 },
];

export const bandFor = (pages: number): PriceBand =>
  BANDS.find((b) => pages >= b.lo && pages <= b.hi) ?? BANDS[BANDS.length - 1];

/** [benchmark, value, sample, type, source, collected] */
export type BenchRow = [string, string, string, BenchType, string, string];

export const BENCH: BenchRow[] = [
  ['US shelf price', 'Median $25. Half sit between $20 and $30. 80% fall between $15.50 and $38', '156 titles', 'obs', 'Neesh marketplace listings (56 titles) plus the full online catalog of a US independent magazine shop (107 titles). 7 overlap. No mainstream titles', 'Nov 17, 2026'],
  ['London shelf price', 'Median £16. Half sit between £12 and £22', '213 titles', 'obs', "A London independent magazine shop's online catalog. First page in full, second page in part", 'Nov 17, 2026'],
  ['Import price gap', 'The US price is about 1.5 times the London £ price', '21 titles sold in both shops', 'obs', 'Same two shop catalogs', 'Nov 17, 2026'],
  ['Price by page count', '$15 under 64 pages, $23.50 at 64 to 119, $25 at 120 to 179, $24 at 180 and up', '41 listings', 'obs', 'Neesh marketplace listings that include page count', 'Nov 17, 2026'],
  ['Wholesale as a share of cover', 'Median 50%. Half sit between 50 and 60%. 80% fall between 42 and 70%', '76 listings (56 titles)', 'obs', 'Neesh marketplace, the wholesale price publishers set against their suggested retail. One Korean distributor catalog left out', 'Nov 17, 2026'],
  ['Direct wholesale offers', '40 to 60% of cover, no returns', '5 publishers', 'quote', 'Wholesale terms quoted to Neesh by a US surf quarterly, a US journal, a London design title, a French large-format title and a Dutch design title', 'Aug to Sep 2026'],
  ['Distributor split', '40% to the publisher, 20% or more to the distributor, 40% to the shop', '1 publisher', 'quote', 'A Dutch design magazine describing its standard split. Its agent sells to US shops at 40% off cover', 'Aug 2026'],
  ['Distributor sell-through', 'About 50% is a good result', '1 publisher', 'anec', 'A publisher with two decades running magazines, relayed by a partner', 'Aug 2026'],
  ['Freight in, cross-border', '$2 to $3 a copy, landed', '3 quotes', 'quote', 'Amsterdam to Seattle, about 40 copies for about €100. Courier surcharge of $10 to $15 per box of 20. BC to Seattle, 10 to 20 copies for $30 to $40', 'Aug to Sep 2026'],
  ['Launch-night partners', 'From $250 per brand', '1 event', 'obs', 'Neesh x Ori launch, New York. The venue cost $1,400', 'Nov 2026'],
  ['Neesh fees', '10% of each order, paid by the publisher. Spaces pay shipping. Fulfillment is free to June 2027, then 15%', '', 'policy', 'Neesh publisher terms', 'Nov 2026'],
  ['Space margin', 'Most spaces expect 40 to 50% of cover. Under 25% after shipping, few reorder', '', 'policy', 'Neesh guidance to publishers, from space conversations', 'Nov 2026'],
  ['Small-run print price', '£3.25 a copy before delivery, for 30 copies of an A5, 84-page, perfect-bound photo zine (170gsm silk inside, 300gsm uncoated cover)', '1 job', 'obs', 'Mixam, a UK online printer, in a public Instagram post about a customer job', 'Nov 17, 2026'],
  ['Print cost estimate', 'Built from trim, pages, paper, color, binding and run', '', 'est', 'Our model, checked against public printer price lists. Replace it with real quotes', 'Nov 2026'],
  ['Subscription postage, renewal', '$5.50 an issue in the US, 60% renewal', '', 'est', 'No first-hand data yet', ''],
  ['Ad rates', 'None suggested', '', 'est', 'Too few first-hand rate cards to suggest one', ''],
];
