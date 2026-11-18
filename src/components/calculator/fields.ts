// Side-panel configuration for the magazine calculator: the input groups,
// the channel chips and the sentence's channel labels. Copy is the
// prototype's, word for word. Hints that carry <b> markup are rendered as
// trusted HTML; they are constants, never user input.

import type { BenchType } from '@/lib/calculator/benchmarks';
import type { ChannelKey, NumericPlanKey, Plan } from '@/lib/calculator/model';

export type SegKey = 'printMode' | 'trim' | 'paper' | 'color' | 'binding' | 'via' | 'fulfil' | 'neeshFulfilPaid';

export interface NumFieldDef {
  type?: undefined;
  k: NumericPlanKey;
  l: string;
  min: number;
  max: number;
  step: number;
  hint?: string;
  tag?: BenchType;
  unit?: string;
  secured?: boolean;
  showIf?: (s: Plan) => boolean;
  adv: boolean;
}

export interface SegFieldDef {
  type: 'seg';
  k: SegKey;
  l: string;
  opts: [string, string][];
  showIf?: (s: Plan) => boolean;
  adv: boolean;
}

export interface QuotesFieldDef {
  type: 'quotes';
  k: 'quotes';
  l: string;
  showIf?: (s: Plan) => boolean;
  adv: boolean;
}

export type FieldDef = NumFieldDef | SegFieldDef | QuotesFieldDef;

export interface Group {
  id: string;
  title: string;
  sub: string;
  /** The prototype's flag, which it never applied: every group starts collapsed. Kept for parity. */
  open: boolean;
  ch?: ChannelKey;
  fields: FieldDef[];
}

const PRIMARY = new Set<string>([
  'price', 'ipy', 'run', 'pages', 'printMode', 'quotes', 'editorial', 'otherFixed', 'subs', 'subsSec', 'subPrice', 'pre', 'dCopies', 'wCopies', 'wSec', 'wPct', 'via', 'xCopies', 'xPct', 'xSell', 'adPages', 'adSec', 'adRate', 'events', 'eventsSec', 'eventRate',
]);

type NumOpts = Omit<NumFieldDef, 'k' | 'l' | 'adv' | 'type'>;
const F = (k: NumericPlanKey, l: string, o: NumOpts): NumFieldDef => ({ k, l, ...o, adv: !PRIMARY.has(k) });
const SEG = (k: SegKey, l: string, opts: [string, string][], showIf?: (s: Plan) => boolean): SegFieldDef => ({ type: 'seg', k, l, opts, showIf, adv: !PRIMARY.has(k) });

// Field order matches the prototype after its reshuffle: pages sits with the
// issue basics, comps closes the printing group.
export const GROUPS: Group[] = [
  { id: 'issue', title: 'The issue', sub: 'price, pages, run', open: true, fields: [
    F('price', 'Cover price', { min: 5, max: 80, step: 1, hint: 'priceHint', tag: 'obs' }),
    F('pages', 'Page count', { min: 16, max: 400, step: 4 }),
    F('ipy', 'Issues a year', { min: 1, max: 12, step: 1 }),
    F('run', 'Print run', { min: 50, max: 10000, step: 50 }),
  ] },
  { id: 'print', title: 'Printing', sub: 'spec or quotes', open: true, fields: [
    SEG('printMode', 'Print cost from', [['est', 'Estimate'], ['quotes', 'My quotes']]),
    SEG('trim', 'Trim size', [['digest', 'Digest / A5'], ['standard', 'Letter / A4'], ['oversize', 'Oversize']], (s) => s.printMode === 'est'),
    SEG('paper', 'Paper stock', [['uncoated', 'Uncoated'], ['coated', 'Coated'], ['premium', 'Premium']], (s) => s.printMode === 'est'),
    SEG('color', 'Color', [['mono', '1-2 color'], ['four', 'Full color']], (s) => s.printMode === 'est'),
    SEG('binding', 'Binding', [['saddle', 'Saddle'], ['perfect', 'Perfect'], ['sewn', 'Sewn']], (s) => s.printMode === 'est'),
    { type: 'quotes', k: 'quotes', l: 'Printer quotes', showIf: (s) => s.printMode === 'quotes', adv: false },
    F('freight', 'Freight to you, per copy', { min: 0, max: 6, step: 0.05, tag: 'quote', hint: 'Cross-border freight cost us <b>$2 to $3</b> a copy. Domestic usually runs under $1.' }),
    F('printDeposit', 'Printer deposit before printing', { min: 0, max: 100, step: 5, unit: '%', hint: 'Many printers take 50% up front, the rest on delivery.' }),
    F('comps', 'Comps and press copies', { min: 0, max: 1000, step: 5, hint: 'Contributors, press, samples. Printed, never sold.' }),
  ] },
  { id: 'fixed', title: 'Fixed costs', sub: 'paid once per issue', open: false, fields: [
    F('editorial', 'Editorial, design, photo', { min: 0, max: 60000, step: 250 }),
    F('edBefore', 'Share paid before printing', { min: 0, max: 100, step: 5, unit: '%' }),
    F('otherFixed', 'Launch, marketing, software', { min: 0, max: 30000, step: 100 }),
    F('otherBefore', 'Share paid before printing', { min: 0, max: 100, step: 5, unit: '%' }),
  ] },
  { id: 'subs', ch: 'subs', title: 'Subscribers', sub: 'paid before you print', open: true, fields: [
    F('subs', 'Subscribers getting this issue', { min: 0, max: 10000, step: 10, hint: 'Count subscribers you still expect.' }),
    F('subsSec', 'Of those, already paid', { min: 0, max: 10000, step: 10, secured: true }),
    F('subPrice', 'Subscription price, per year', { min: 0, max: 400, step: 1, hint: 'subHint' }),
    F('subPost', 'Postage and packing per issue', { min: 0, max: 30, step: 0.25, tag: 'est', hint: 'Domestic. Subscribers abroad cost far more.' }),
    F('subRenew', 'Renewal rate', { min: 0, max: 95, step: 1, unit: '%', tag: 'est' }),
  ] },
  { id: 'direct', ch: 'single', title: 'Single copies to readers', sub: 'your own shop', open: false, fields: [
    F('pre', 'Preorders, already paid', { min: 0, max: 10000, step: 10, secured: true, hint: 'Paid before you print. Counted as confirmed.' }),
    F('dCopies', 'Copies you expect to sell after launch', { min: 0, max: 10000, step: 10 }),
    F('cpo', 'Copies per order', { min: 1, max: 4, step: 0.1 }),
    F('feePct', 'Payment processing', { min: 0, max: 6, step: 0.1, unit: '%', hint: 'Plus 30¢ per order. Also applies to subscriptions.' }),
    F('pack', 'Packaging per order', { min: 0, max: 6, step: 0.05 }),
    F('shipAbsorb', 'Shipping you absorb per order', { min: 0, max: 20, step: 0.5, hint: 'Zero if readers pay shipping at checkout.' }),
  ] },
  { id: 'spaces', ch: 'spaces', title: 'Direct to spaces', sub: 'shops, cafés, hotels', open: false, fields: [
    F('wCopies', 'Copies sold to spaces', { min: 0, max: 10000, step: 10, hint: 'No returns. Spaces that buy direct keep what they buy.' }),
    F('wSec', 'Of those, in confirmed orders', { min: 0, max: 10000, step: 10, secured: true }),
    F('wPct', 'Wholesale, % of cover', { min: 30, max: 80, step: 1, unit: '%', tag: 'obs', hint: 'wHint' }),
    F('wCpo', 'Copies per space order', { min: 1, max: 50, step: 1 }),
    F('spaceShip', 'Shipping the space pays, per copy', { min: 0, max: 5, step: 0.1, hint: "Comes out of the space's margin, so it affects reorders." }),
    SEG('via', 'How spaces order', [['self', 'Email, DM, invoice'], ['neesh', 'Through Neesh']]),
    F('wTerms', 'Days until spaces pay you', { min: 0, max: 90, step: 5, showIf: (s) => s.via === 'self', hint: 'Invoiced spaces often pay in 30 days. Neesh orders are paid at checkout.' }),
    SEG('fulfil', 'Who packs Neesh orders', [['self', 'You do'], ['neesh', 'Neesh does']], (s) => s.via === 'neesh'),
    SEG('neeshFulfilPaid', 'Neesh fulfillment', [['free', 'Free to June 2027'], ['paid', 'After that, 15%']], (s) => s.via === 'neesh' && s.fulfil === 'neesh'),
    F('wPackPerOrder', 'Your packing cost per order', { min: 0, max: 15, step: 0.5, showIf: (s) => !(s.via === 'neesh' && s.fulfil === 'neesh') }),
  ] },
  { id: 'dist', ch: 'dist', title: 'Distributor', sub: 'newsstand, sale or return', open: false, fields: [
    F('xCopies', 'Copies shipped to distributor', { min: 0, max: 10000, step: 10, hint: "Shipped is not sold. You're paid only for copies that sell." }),
    F('xPct', 'You receive, % of cover', { min: 20, max: 60, step: 1, unit: '%', tag: 'quote', hint: 'One design publisher gets <b>40%</b>. The distributor takes 20%, the shop 40%.' }),
    F('xSell', 'Sell-through', { min: 10, max: 100, step: 1, unit: '%', tag: 'anec', hint: 'One long-time publisher calls <b>50%</b> a good result.' }),
    F('xFreight', 'Freight to distributor, per copy', { min: 0, max: 5, step: 0.05 }),
    F('xTerms', 'Days until the distributor pays', { min: 30, max: 240, step: 10, hint: 'Distributors settle after the on-sale period and returns. 90 to 180 days is common.', tag: 'est' }),
  ] },
  { id: 'brands', ch: 'brands', title: 'Brand money', sub: 'ads, sponsors, bulk', open: false, fields: [
    F('adPages', 'Ad or partner pages', { min: 0, max: 40, step: 1 }),
    F('adSec', 'Of those, signed', { min: 0, max: 40, step: 1, secured: true }),
    F('adRate', 'Rate per page', { min: 0, max: 15000, step: 50, tag: 'est', hint: 'Use your rate card.' }),
    F('adDeposit', 'Ad deposit before printing', { min: 0, max: 100, step: 5, unit: '%' }),
    F('events', 'Launch-night partners', { min: 0, max: 20, step: 1 }),
    F('eventsSec', 'Of those, signed', { min: 0, max: 20, step: 1, secured: true }),
    F('eventRate', 'Per partner', { min: 0, max: 5000, step: 50, tag: 'obs', hint: 'Our New York launch partnerships start at <b>$250</b>.' }),
    F('bCopies', 'Copies a brand buys to gift', { min: 0, max: 3000, step: 10, hint: 'Gift-with-purchase or client gifts, at your wholesale price.' }),
    F('bSec', 'Of those, ordered', { min: 0, max: 3000, step: 10, secured: true }),
  ] },
];

/** Hints computed from the plan rather than fixed copy. */
export const DYNAMIC_HINTS = new Set(['priceHint', 'subHint', 'wHint']);

export const CHIPS: [string, [ChannelKey, string][]][] = [
  ['Sell it yourself', [['subs', 'Subscribers'], ['single', 'Readers, one copy at a time'], ['spaces', 'Shops, cafés, hotels']]],
  ['Hand it off', [['dist', 'A distributor']]],
  ['Beyond copies', [['brands', 'Brands and sponsors']]],
];

/** Channel words in the fill-in sentence. */
export const SCH: [ChannelKey, string][] = [
  ['subs', 'subscribers'], ['single', 'readers'], ['spaces', 'spaces'], ['dist', 'a distributor'], ['brands', 'brands'],
];

export const TABS = ['do', 'cash', 'channels', 'pricing', 'scenarios', 'statement', 'sources'] as const;
export type Tab = (typeof TABS)[number];
export const isTab = (t: string): t is Tab => (TABS as readonly string[]).includes(t);
