// The magazine calculator's math. Ported line for line from the approved
// prototype (neesh-magazine-calculator.html). No DOM access: every function
// takes the plan it works on. Benchmarks live in benchmarks.ts; formatting
// in format.ts. The acceptance checks in model.test.ts pin the four example
// plans to the prototype's numbers to the dollar, so a change here that
// moves a result is a change to the product, not a refactor.

import { bandFor } from './benchmarks';
import { clamp, fmt, fmtN, pct } from './format';

export type ChannelKey = 'subs' | 'single' | 'spaces' | 'dist' | 'brands';
export type PrintMode = 'est' | 'quotes';
export type Trim = 'digest' | 'standard' | 'oversize';
export type Paper = 'uncoated' | 'coated' | 'premium';
export type Color = 'mono' | 'four';
export type Binding = 'saddle' | 'perfect' | 'sewn';
export type Via = 'self' | 'neesh';
export type Fulfil = 'self' | 'neesh';
export type NeeshFulfilPaid = 'free' | 'paid';

export interface Quote {
  q: number;
  u: number;
}

/** The fields BASE carries: assumptions every plan shares until edited. */
export interface BasePlan {
  printMode: PrintMode;
  trim: Trim;
  paper: Paper;
  color: Color;
  binding: Binding;
  quotes: Quote[];
  printDeposit: number;
  edBefore: number;
  otherBefore: number;
  feePct: number;
  cpo: number;
  pack: number;
  shipAbsorb: number;
  wCpo: number;
  spaceShip: number;
  via: Via;
  wTerms: number;
  fulfil: Fulfil;
  neeshFulfilPaid: NeeshFulfilPaid;
  wPackPerOrder: number;
  xPct: number;
  xSell: number;
  xFreight: number;
  xTerms: number;
  subPost: number;
  subRenew: number;
  adDeposit: number;
  pre: number;
  subsSec: number;
  wSec: number;
  adSec: number;
  eventsSec: number;
  bSec: number;
  /** Confirmed grant money for this issue. Counts only once promised, so it is in confirmed money and lands before printing. */
  grant: number;
}

/** A complete plan: BASE plus the figures that differ per magazine. */
export interface Plan extends BasePlan {
  price: number;
  pages: number;
  ipy: number;
  run: number;
  freight: number;
  comps: number;
  editorial: number;
  otherFixed: number;
  subs: number;
  subPrice: number;
  dCopies: number;
  wCopies: number;
  wPct: number;
  xCopies: number;
  adPages: number;
  adRate: number;
  events: number;
  eventRate: number;
  bCopies: number;
  /** Which channels are switched on in the sentence and side panel. */
  ch?: Record<ChannelKey, boolean>;
  /** Copies parked when a channel is switched off, restored when it returns. */
  stash?: Partial<Record<ChannelKey, Record<string, number>>>;
}

export type NumericPlanKey = {
  [K in keyof Plan]-?: Plan[K] extends number ? K : never;
}[keyof Plan];

export const BASE: BasePlan = {
  printMode: 'est', trim: 'standard', paper: 'coated', color: 'four', binding: 'perfect',
  quotes: [{ q: 1000, u: 0 }, { q: 2000, u: 0 }, { q: 3000, u: 0 }, { q: 5000, u: 0 }],
  printDeposit: 50, edBefore: 100, otherBefore: 50, feePct: 2.9, cpo: 1.2, pack: 1.5, shipAbsorb: 0, wCpo: 10, spaceShip: 0.8, via: 'self', wTerms: 30, fulfil: 'self', neeshFulfilPaid: 'free', wPackPerOrder: 6,
  xPct: 40, xSell: 50, xFreight: 0.4, xTerms: 120, subPost: 5.5, subRenew: 60, adDeposit: 50, pre: 0, subsSec: 0, wSec: 0, adSec: 0, eventsSec: 0, bSec: 0, grant: 0,
};

export type PresetKey = 'indie' | 'zine' | 'annual' | 'creator';

export const PRESET_NAMES: Record<PresetKey, string> = {
  zine: 'Zine',
  indie: 'Indie biannual',
  annual: 'Big annual',
  creator: 'Creator launch',
};

export const DEFAULTS: Record<PresetKey, Plan> = {
  indie: { ...BASE, price: 25, pages: 140, ipy: 2, run: 1500, freight: 0.6, comps: 100, editorial: 6000, otherFixed: 1500,
    subs: 200, subsSec: 120, subPrice: 55, pre: 80, dCopies: 220, wCopies: 400, wSec: 120, wPct: 50, xCopies: 300, adPages: 2, adSec: 1, adRate: 500, events: 2, eventsSec: 1, eventRate: 250, bCopies: 0 },
  zine: { ...BASE, price: 12, pages: 48, trim: 'digest', paper: 'uncoated', color: 'mono', binding: 'saddle', ipy: 4, run: 300, freight: 0.3, comps: 25, editorial: 600, otherFixed: 200,
    subs: 40, subsSec: 30, subPrice: 50, subPost: 2.5, pre: 30, dCopies: 60, cpo: 1.3, pack: 1, wCopies: 90, wSec: 30, wPct: 50, wCpo: 6, wPackPerOrder: 4, spaceShip: 0.5, xCopies: 0, adPages: 0, adRate: 150, events: 0, eventRate: 250, bCopies: 0 },
  annual: { ...BASE, price: 35, pages: 240, ipy: 1, run: 3000, freight: 0.9, comps: 200, editorial: 18000, otherFixed: 4000, paper: 'premium',
    subs: 400, subsSec: 300, subPrice: 40, subPost: 7, pre: 150, dCopies: 450, cpo: 1.1, pack: 2, wCopies: 700, wSec: 200, wPct: 52, wCpo: 12, wPackPerOrder: 7, xCopies: 800, xSell: 55, xFreight: 0.5, adPages: 8, adSec: 5, adRate: 1500, events: 3, eventsSec: 2, eventRate: 500, bCopies: 100, bSec: 100 },
  creator: { ...BASE, price: 40, pages: 180, ipy: 2, run: 2000, printMode: 'quotes', quotes: [{ q: 1000, u: 16 }, { q: 2000, u: 13.5 }, { q: 3000, u: 12.2 }, { q: 5000, u: 0 }], freight: 1.2, comps: 150, editorial: 10000, otherFixed: 2500,
    subs: 500, subsSec: 350, subPrice: 85, subPost: 6, pre: 400, dCopies: 400, feePct: 3.5, pack: 1.25, wCopies: 250, wSec: 60, wPct: 50, wCpo: 8, via: 'neesh', fulfil: 'neesh', xCopies: 0, adPages: 4, adSec: 2, adRate: 2500, events: 2, eventsSec: 2, eventRate: 500, bCopies: 0 },
};

export const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

/** Fields that count copies for each channel. Zeroed when the channel is off. */
export const CHF: Record<ChannelKey, NumericPlanKey[]> = {
  subs: ['subs', 'subsSec'],
  single: ['pre', 'dCopies'],
  spaces: ['wCopies', 'wSec'],
  dist: ['xCopies'],
  brands: ['adPages', 'adSec', 'events', 'eventsSec', 'bCopies', 'bSec', 'grant'],
};

/** Confirmed count never exceeds its planned total. */
export const SECPAIRS: Partial<Record<NumericPlanKey, NumericPlanKey>> = {
  subsSec: 'subs', wSec: 'wCopies', adSec: 'adPages', eventsSec: 'events', bSec: 'bCopies',
};

/** Fill in channel switches and stash for plans saved before they existed. */
export function deriveCh(s: Plan): Plan {
  if (!s.ch) {
    const ch = {} as Record<ChannelKey, boolean>;
    (Object.keys(CHF) as ChannelKey[]).forEach((k) => {
      ch[k] = CHF[k].some((f) => s[f] > 0);
    });
    s.ch = ch;
  }
  if (!s.stash) s.stash = {};
  return s;
}

/* ---------------- print model ---------------- */

export function estPrint(s: Plan, run: number): { u: number; m: 'offset' | 'digital' } {
  const trimF = { digest: 0.55, standard: 1, oversize: 1.45 }[s.trim] || 1;
  const paperF = { uncoated: 0.95, coated: 1, premium: 1.4 }[s.paper] || 1;
  const colorF = { mono: 0.55, four: 1 }[s.color] || 1;
  const bind = ({ saddle: 0.15, perfect: 0.85, sewn: 1.8 }[s.binding] || 0.85) * trimF;
  const r = Math.max(run, 1);
  const offset = (1400 + 7 * s.pages * colorF) / r + s.pages * 0.02 * trimF * paperF * colorF + bind + 0.35;
  const digital = s.pages * 0.04 * trimF * paperF * colorF + bind + 0.5 + 60 / r;
  return offset < digital ? { u: offset, m: 'offset' } : { u: digital, m: 'digital' };
}

export function quoteFit(s: Plan): { a: number; b: number; n: number } | null {
  const pts = (s.quotes || []).filter((p) => p.q > 0 && p.u > 0);
  if (!pts.length) return null;
  if (pts.length === 1) return { a: pts[0].u, b: 0, n: 1 };
  // fit unit = a + b/q
  const xs = pts.map((p) => 1 / p.q), ys = pts.map((p) => p.u), n = pts.length;
  const mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  let sxy = 0, sxx = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
  let b = sxx > 0 ? sxy / sxx : 0;
  if (b < 0) b = 0;
  let a = my - b * mx;
  if (a < 0) { a = 0; b = my / mx; }
  return { a, b, n };
}

export function printUnit(s: Plan, run: number): number {
  if (s.printMode === 'quotes') {
    const f = quoteFit(s);
    if (f) return f.a + f.b / Math.max(run, 1);
  }
  return estPrint(s, run).u;
}

/* ---------------- core model ---------------- */

export type RevenueKey = 'sub' | 'single' | 'space' | 'dist' | 'bulk' | 'ads' | 'events' | 'grant';
export type CopiesKey = 'sub' | 'single' | 'space' | 'dist' | 'bulk';

export interface ModelResult {
  run: number;
  pu: number;
  unit: number;
  R: Record<RevenueKey, number>;
  V: Record<RevenueKey, number>;
  copiesBy: Record<CopiesKey, number>;
  allocated: number;
  production: number;
  fixed: number;
  revenue: number;
  variable: number;
  gross: number;
  profit: number;
  sold: number;
  xSold: number;
  wPrice: number;
  subPer: number;
  unsold: number;
}

/** The plan with only confirmed money in it. */
export function securedState(s: Plan): Plan {
  return { ...s, subs: s.subsSec, dCopies: 0, wCopies: s.wSec, xCopies: 0, adPages: s.adSec, events: s.eventsSec, bCopies: s.bSec };
}

export function model(s: Plan, o: { run?: number } = {}): ModelResult {
  const run = o.run ?? s.run, P = s.price, ipy = Math.max(1, s.ipy);
  const pu = printUnit(s, run), unit = pu + s.freight;
  const subs = s.subs, pre = s.pre, d = s.dCopies, w = s.wCopies, x = s.xCopies, b = s.bCopies;
  const xSold = (x * s.xSell) / 100, wPrice = (P * s.wPct) / 100, fee = s.feePct / 100;
  // revenue
  const subPer = s.subPrice / ipy;
  const R: Record<RevenueKey, number> = {
    sub: subs * subPer, single: (pre + d) * P, space: w * wPrice, dist: (xSold * P * s.xPct) / 100, bulk: b * wPrice, ads: s.adPages * s.adRate, events: s.events * s.eventRate, grant: s.grant,
  };
  // variable selling costs
  const singleOrders = (pre + d) / s.cpo, wOrders = w / Math.max(1, s.wCpo);
  const V: Record<RevenueKey, number> = {
    sub: R.sub * fee + (subs * 0.3) / ipy + subs * s.subPost,
    single: R.single * fee + singleOrders * (0.3 + s.pack + s.shipAbsorb),
    space: s.via === 'neesh'
      ? R.space * 0.1 + (s.fulfil === 'self' ? wOrders * s.wPackPerOrder : s.neeshFulfilPaid === 'paid' ? R.space * 0.15 : 0)
      : R.space * fee + wOrders * (0.3 + s.wPackPerOrder),
    dist: x * s.xFreight,
    bulk: b > 0 ? s.wPackPerOrder : 0,
    ads: 0,
    events: 0,
    grant: 0,
  };
  const copiesBy: Record<CopiesKey, number> = { sub: subs, single: pre + d, space: w, dist: x, bulk: b };
  const allocated = subs + pre + d + w + x + b + s.comps;
  const production = unit * run;
  const fixed = s.editorial + s.otherFixed;
  const revenue = Object.values(R).reduce((a, c) => a + c, 0);
  const variable = Object.values(V).reduce((a, c) => a + c, 0);
  const gross = revenue - variable - production;
  const profit = gross - fixed;
  const sold = subs + pre + d + w + xSold + b;
  return { run, pu, unit, R, V, copiesBy, allocated, production, fixed, revenue, variable, gross, profit, sold, xSold, wPrice, subPer, unsold: Math.max(0, run - allocated) + (x - xSold) };
}

/* ---------------- cash timeline ---------------- */

export type CashItem = [string, number];
export interface CashStage {
  n: string;
  items: CashItem[];
  total: number;
  cum: number;
}
export interface CashResult {
  stages: CashStage[];
  low: number;
  final: number;
  m: ModelResult;
}

export function cash(s: Plan): CashResult {
  const m = model(s), fee = s.feePct / 100, ipy = Math.max(1, s.ipy), P = s.price;
  const subSecNet = s.subsSec * (m.subPer * (1 - fee) - 0.3 / ipy), subNewNet = (s.subs - s.subsSec) * (m.subPer * (1 - fee) - 0.3 / ipy);
  const preNet = s.pre * P * (1 - fee) - (s.pre / s.cpo) * 0.3;
  const wNetPer = m.wPrice - (s.via === 'neesh' ? m.wPrice * 0.1 : m.wPrice * fee + 0.3 / Math.max(1, s.wCpo));
  const wPackPer = s.via === 'neesh' && s.fulfil === 'neesh' ? (s.neeshFulfilPaid === 'paid' ? m.wPrice * 0.15 : 0) : s.wPackPerOrder / Math.max(1, s.wCpo);
  const printOnly = m.pu * s.run;
  const A: CashItem[] = [], B: CashItem[] = [], C: CashItem[] = [], D: CashItem[] = [];
  const add = (arr: CashItem[], l: string, v: number) => { if (Math.abs(v) > 0.5) arr.push([l, v]); };
  // A before print
  add(A, 'Editorial, design, photo', (-s.editorial * s.edBefore) / 100);
  add(A, 'Launch, marketing, software', (-s.otherFixed * s.otherBefore) / 100);
  add(A, 'Printer deposit', (-printOnly * s.printDeposit) / 100);
  add(A, 'Paid subscribers (this issue)', subSecNet);
  add(A, 'Preorders', preNet);
  add(A, 'Ad deposits', (s.adSec * s.adRate * s.adDeposit) / 100);
  add(A, 'Signed launch partners', s.eventsSec * s.eventRate);
  if (s.via === 'neesh') add(A, 'Confirmed space orders', s.wSec * wNetPer);
  add(A, 'Confirmed brand order', s.bSec * m.wPrice);
  add(A, 'Grant money', s.grant);
  // B delivery
  add(B, 'Printer balance', -printOnly * (1 - s.printDeposit / 100));
  add(B, 'Freight in', -s.freight * s.run);
  add(B, 'Rest of editorial', -s.editorial * (1 - s.edBefore / 100));
  add(B, 'Rest of launch costs', -s.otherFixed * (1 - s.otherBefore / 100));
  add(B, 'Mailing paid subscribers', -s.subsSec * s.subPost);
  add(B, 'Shipping preorders', (-s.pre / s.cpo) * (s.pack + s.shipAbsorb));
  add(B, 'Packing confirmed space orders', -s.wSec * wPackPer);
  add(B, 'Freight to distributor', -s.xCopies * s.xFreight);
  add(B, 'Packing brand order', -(s.bCopies > 0 ? s.wPackPerOrder : 0));
  // C first 60 days
  add(C, 'New subscribers', subNewNet - (s.subs - s.subsSec) * s.subPost);
  add(C, 'Single copies', s.dCopies * P * (1 - fee) - (s.dCopies / s.cpo) * (0.3 + s.pack + s.shipAbsorb));
  const wNew = s.wCopies - s.wSec;
  if (s.via === 'neesh') add(C, 'New space orders', wNew * (wNetPer - wPackPer));
  else if (s.wTerms <= 60) add(C, 'Space invoices paid', s.wCopies * wNetPer - wNew * wPackPer);
  add(C, 'Ad balance and new ads', s.adSec * s.adRate * (1 - s.adDeposit / 100) + (s.adPages - s.adSec) * s.adRate);
  add(C, 'New launch partners', (s.events - s.eventsSec) * s.eventRate);
  add(C, 'New brand orders', (s.bCopies - s.bSec) * m.wPrice);
  // D later
  add(D, 'Distributor settlement', m.R.dist);
  if (s.via === 'self' && s.wTerms > 60) add(D, 'Space invoices paid', s.wCopies * wNetPer - wNew * wPackPer);
  const stages: CashStage[] = [
    { n: 'Before printing', items: A, total: 0, cum: 0 },
    { n: 'Printer delivers', items: B, total: 0, cum: 0 },
    { n: 'First 60 days on sale', items: C, total: 0, cum: 0 },
    { n: `Day ${s.xTerms} and later`, items: D, total: 0, cum: 0 },
  ];
  let cum = 0, low = 0;
  stages.forEach((st) => { st.total = st.items.reduce((a, c) => a + c[1], 0); cum += st.total; st.cum = cum; low = Math.min(low, cum); });
  return { stages, low, final: cum, m };
}

/* ---------------- break-even ---------------- */

export interface BreakEven {
  copies: number;
  k?: number;
  feasible: boolean;
}

export function breakEven(s: Plan): BreakEven {
  // scale every copy channel proportionally; ads, print, fixed constant
  const z: Plan = { ...s, subs: 0, pre: 0, dCopies: 0, wCopies: 0, xCopies: 0, bCopies: 0 };
  const m0 = model(z), m1 = model(s);
  const C = m1.profit - m0.profit;
  if (C <= 0) return { copies: Infinity, feasible: false };
  const k = Math.max(0, -m0.profit / C);
  const allocAt = s.comps + k * (m1.allocated - s.comps);
  return { copies: k * m1.sold, k, feasible: allocAt <= s.run };
}

/* ---------------- cases ---------------- */

export function caseState(s: Plan, f: number, stDelta: number): Plan {
  const o: Plan = { ...s };
  const proj = (tot: number, sec: number) => sec + (tot - sec) * f;
  o.subs = proj(s.subs, s.subsSec); o.wCopies = proj(s.wCopies, s.wSec); o.bCopies = proj(s.bCopies, s.bSec);
  o.adPages = proj(s.adPages, s.adSec); o.events = proj(s.events, s.eventsSec); o.dCopies = s.dCopies * f;
  o.xSell = clamp(s.xSell + stDelta, 5, 100);
  // cap projected copies to the run
  const m = model(o);
  if (m.allocated > s.run) {
    const fixedAlloc = s.subsSec + s.pre + s.wSec + s.bSec + s.xCopies + s.comps;
    const projAlloc = (o.subs - s.subsSec) + o.dCopies + (o.wCopies - s.wSec) + (o.bCopies - s.bSec);
    const room = Math.max(0, s.run - fixedAlloc), k = projAlloc > 0 ? Math.min(1, room / projAlloc) : 0;
    o.subs = s.subsSec + (o.subs - s.subsSec) * k; o.dCopies *= k; o.wCopies = s.wSec + (o.wCopies - s.wSec) * k; o.bCopies = s.bSec + (o.bCopies - s.bSec) * k;
  }
  return o;
}

/** The four columns of the Scenarios table. lo and hi are fractions of plan. */
export function caseSet(s: Plan, lo: number, hi: number): [string, Plan][] {
  return [['Slow', caseState(s, lo, -15)], ['Expected', s], ['Strong', caseState(s, hi, 10)], ['Confirmed only', securedState(s)]];
}

/* ---------------- levers and per-copy economics ---------------- */

export interface Levers {
  sub: number;
  stockist: number;
  single: number;
}

export function leverValues(s: Plan): Levers {
  const fee = s.feePct / 100, ipy = Math.max(1, s.ipy), P = s.price, wPrice = (P * s.wPct) / 100;
  const sub = (s.subPrice / ipy) * (1 - fee) - 0.3 / ipy - s.subPost;
  const wPer = s.via === 'neesh'
    ? wPrice * 0.9 - (s.fulfil === 'self' ? s.wPackPerOrder / s.wCpo : s.neeshFulfilPaid === 'paid' ? wPrice * 0.15 : 0)
    : wPrice * (1 - fee) - (0.3 + s.wPackPerOrder) / s.wCpo;
  const stockist = wPer * s.wCpo;
  const single = P * (1 - fee) - (0.3 + s.pack + s.shipAbsorb) / s.cpo;
  return { sub, stockist, single };
}

export type PartKey = 'print' | 'fees' | 'shop' | 'dist' | 'you';
export interface PerCopyRow {
  g: number;
  parts: [PartKey, number][];
}
export type PerCopy = Record<'sub' | 'single' | 'space' | 'dist', PerCopyRow>;

export const youPart = (d: PerCopyRow): number => d.parts.find((p) => p[0] === 'you')![1];

export function perCopy(s: Plan): PerCopy {
  const P = s.price, unit = printUnit(s, s.run) + s.freight, ipy = Math.max(1, s.ipy), fee = s.feePct / 100;
  const o = {} as PerCopy;
  {
    const per = s.subPrice / ipy, f = per * fee + 0.3 / ipy + s.subPost;
    o.sub = { g: per, parts: [['print', unit], ['fees', f], ['shop', 0], ['dist', 0], ['you', per - unit - f]] };
  }
  {
    const f = P * fee + (0.3 + s.pack + s.shipAbsorb) / s.cpo;
    o.single = { g: P, parts: [['print', unit], ['fees', f], ['shop', 0], ['dist', 0], ['you', P - unit - f]] };
  }
  {
    const w = (P * s.wPct) / 100;
    let f: number;
    if (s.via === 'neesh') { f = w * 0.1 + (s.fulfil === 'self' ? s.wPackPerOrder / s.wCpo : s.neeshFulfilPaid === 'paid' ? w * 0.15 : 0); }
    else f = w * fee + (0.3 + s.wPackPerOrder) / s.wCpo;
    o.space = { g: P, parts: [['print', unit], ['fees', f], ['shop', P - w], ['dist', 0], ['you', w - unit - f]] };
  }
  {
    const st = s.xSell / 100, you = ((P * s.xPct) / 100) * st, pr = unit + s.xFreight, shop = P * st * (1 - s.xPct / 100) * 0.67, dist = P * st * (1 - s.xPct / 100) * 0.33 + P * (1 - st);
    o.dist = { g: P, parts: [['print', pr], ['fees', 0], ['shop', shop], ['dist', dist], ['you', you - pr]] };
  }
  return o;
}

/* ---------------- recommendations ---------------- */

export interface Rec {
  title: string;
  why: string;
  /** Profit added. */
  d: number;
  /** Cash need removed (positive means less cash needed). */
  dc: number;
}

export function recCandidates(S: Plan): Rec[] {
  const P = S.price, out: Rec[] = [], m = model(S), band = bandFor(S.pages);
  const cashNeed = Math.max(0, -cash(S).low);
  const tryIt = (title: string, why: string, st: Plan) => {
    const m2 = model(st);
    if (m2.allocated > st.run) return;
    out.push({ title, why, d: m2.profit - m.profit, dc: cashNeed - Math.max(0, -cash(st).low) });
  };
  if (P < band.med) {
    const t = Math.round(band.med);
    tryIt(`Raise your cover to ${fmt(t)}`, `Titles your length sell for ${fmt(band.p25)} to ${fmt(band.p75)}, median ${fmt(band.med, band.med % 1 ? 2 : 0)}. You’re under the median.`, { ...S, price: t });
  } else if (P + 2 <= Math.max(30, band.p75)) tryIt(`Raise your cover by $2, to ${fmt(P + 2)}`, `Still inside the $20 to $30 most indie titles charge. Subscriptions stay put.`, { ...S, price: P + 2 });
  if (S.xCopies > 0) {
    const sold = Math.round(m.xSold);
    tryIt(`Sell your distributor’s ${fmtN(sold)} copies to spaces yourself`, `Same copies sold at ${S.wPct}% wholesale. No returns, no freight to the distributor, paid in weeks.`, { ...S, xCopies: 0, wCopies: S.wCopies + sold });
    const half = Math.round(S.xCopies / 2);
    tryIt(`Ship ${fmtN(half)} fewer copies to the distributor`, `At ${S.xSell}% sell-through each copy shipped earns ${fmt(youPart(perCopy(S).dist), 2)}. Ship fewer, get fewer back.`, { ...S, xCopies: S.xCopies - half });
  }
  const fit = Math.ceil((m.allocated * 1.05) / 50) * 50;
  if (fit < S.run && (S.run - m.allocated) / S.run > 0.1) tryIt(`Print ${fmtN(fit)} instead of ${fmtN(S.run)}`, `${fmtN(S.run - m.allocated)} copies have no buyer. ${fmtN(fit)} covers every planned sale plus 5% spare.`, { ...S, run: fit });
  const convert = Math.round(S.dCopies * 0.2);
  if (convert >= 10 && S.subPrice > 0) tryIt(`Turn ${fmtN(convert)} one-off buyers into subscribers`, `One in five single-copy buyers subscribes at checkout. They pay first and tell you how many to print.`, { ...S, dCopies: S.dCopies - convert, subs: S.subs + convert });
  const inv = S.run - m.allocated;
  if (inv >= S.wCpo * 5) tryIt(`Land 5 more spaces at ${S.wCpo} copies each`, `Moves ${fmtN(S.wCpo * 5)} of your ${fmtN(inv)} unsold copies at wholesale, with no returns.`, { ...S, wCopies: S.wCopies + S.wCpo * 5 });
  if (inv >= 50) tryIt(`Add 50 subscribers`, `Uses copies you already paid to print. Each adds ${fmt(leverValues(S).sub, 2)} this issue.`, { ...S, subs: S.subs + 50 });
  if (S.comps > S.run * 0.08) tryIt(`Cut comps to ${fmtN(Math.round(S.run * 0.05))}`, `Comps are ${pct(S.comps / S.run)} of your run. Each one costs ${fmt(m.unit, 2)} and earns nothing.`, { ...S, comps: Math.round(S.run * 0.05) });
  if (S.wPct < 50) tryIt(`Raise wholesale to 50% of cover`, `50% is the median on Neesh. Spaces still keep half the cover.`, { ...S, wPct: 50 });
  if (S.adRate > 0 && S.adPages < 4 && S.events + S.adPages < 6) tryIt(`Sell one more partner page`, `At your ${fmt(S.adRate)} rate. Start with brands already advertising in titles like yours.`, { ...S, adPages: S.adPages + 1 });
  if (S.printMode === 'est' && S.paper === 'premium') tryIt(`Switch to coated stock`, `Premium paper adds about 40% to paper cost in our estimate. Get a quote for both.`, { ...S, paper: 'coated' });
  return out.filter((r) => r.d > 25).sort((a, b) => b.d - a.d).slice(0, 6);
}

/* ---------------- heat map and profit curve ---------------- */

/** Profit at a print run when share t of sellable copies sells, in the plan's mix. */
export function heatProfit(S: Plan, run: number, t: number): number {
  const sellable = Math.max(0, run - S.comps), soldTarget = sellable * t;
  const m = model(S);
  const mix = { subs: S.subs, pre: S.pre, d: S.dCopies, w: S.wCopies, xs: m.xSold, b: S.bCopies };
  const tot = Object.values(mix).reduce((a, c) => a + c, 0) || 1;
  let k = soldTarget / tot;
  const xs = mix.xs * k, xShip = S.xSell > 0 ? xs / (S.xSell / 100) : 0;
  // shipped returns use inventory too: cap so allocation fits
  const alloc = (mix.subs + mix.pre + mix.d + mix.w + mix.b) * k + xShip;
  if (alloc > sellable && alloc > 0) k *= sellable / alloc;
  const s2: Plan = { ...S, subs: mix.subs * k, pre: mix.pre * k, dCopies: mix.d * k, wCopies: mix.w * k, bCopies: mix.b * k, xCopies: S.xSell > 0 ? (mix.xs * k) / (S.xSell / 100) : 0, run };
  return model(s2, { run }).profit;
}

/* ---------------- plan summary (compare, export) ---------------- */

export function planSummary(s: Plan): Record<string, string | number> {
  const m = model(s), ms = model(securedState(s)), c = cash(s), be = breakEven(s);
  return {
    Price: fmt(s.price), Pages: s.pages, 'Print run': fmtN(s.run), 'Print per copy': fmt(m.pu, 2), Subscribers: fmtN(s.subs), 'Single copies': fmtN(s.pre + s.dCopies), 'Space copies': fmtN(s.wCopies), 'Distributor shipped': fmtN(s.xCopies),
    Revenue: fmt(m.revenue), 'Profit before fixed costs': fmt(m.gross), Profit: fmt(m.profit), 'Profit, confirmed only': fmt(ms.profit), 'Cash needed': fmt(Math.max(0, -c.low)), 'Break-even copies': isFinite(be.copies) ? fmtN(be.copies) : 'Never', 'Unsold copies': fmtN(m.unsold), 'Slow case profit': fmt(model(caseState(s, 0.6, -15)).profit), 'Strong case profit': fmt(model(caseState(s, 1.25, 10)).profit),
  };
}

/* ---------------- quiz ---------------- */

export type FundingKey = 'ads' | 'partners' | 'grants';

export interface QuizState {
  price: number;
  pages: number;
  ipy: number;
  run: number;
  ch: Record<ChannelKey, boolean>;
  /** Money beyond copies: ads, launch partners, grants. */
  fund: Record<FundingKey, boolean>;
  /** Rate per ad page, when ads are ticked. Zero until the reader gives one. */
  adRate: number;
  /** Confirmed grant money, when grants are ticked. */
  grant: number;
  sold: number;
  touched: boolean;
}

export const QUIZ_START: QuizState = {
  price: 25, pages: 120, ipy: 2, run: 1000, ch: { subs: true, single: true, spaces: true, dist: false, brands: false },
  fund: { ads: false, partners: false, grants: false }, adRate: 0, grant: 0, sold: 650, touched: false,
};

export const r10 = (v: number): number => Math.round(v / 10) * 10;

export function fromQuiz(Q: QuizState): Plan {
  const P = Q.price;
  const base = clone(BASE);
  // Comps start at 5% of the run and give way as the sales guess climbs, so
  // a title can sell out: at 100% sold there are no comps left.
  const comps = Math.min(Math.round((Q.run * 0.05) / 5) * 5, Math.max(0, Q.run - Q.sold));
  const s: Plan = {
    ...base,
    price: P, pages: Q.pages, ipy: Q.ipy, run: Q.run, freight: 0.6, comps, editorial: Math.round((Q.pages * 40) / 250) * 250, otherFixed: 1000,
    binding: Q.pages <= 64 ? 'saddle' : 'perfect', subPrice: Math.round(P * Q.ipy * 0.9 + base.subPost * Q.ipy), wPct: 50, adRate: Q.fund.ads ? Q.adRate : 0, eventRate: 250,
    subs: 0, pre: 0, dCopies: 0, wCopies: 0, xCopies: 0, adPages: 0, events: 0, bCopies: 0, grant: Q.fund.grants ? Q.grant : 0,
  };
  const W: Record<'subs' | 'single' | 'spaces' | 'dist', number> = { subs: 20, single: 30, spaces: 35, dist: 15 };
  const on = (Object.keys(W) as (keyof typeof W)[]).filter((k) => Q.ch[k]), tw = on.reduce((a, k) => a + W[k], 0) || 1;
  const sold = Math.min(Q.sold, Q.run - s.comps), part = (k: keyof typeof W) => (Q.ch[k] ? (sold * W[k]) / tw : 0);
  s.subs = r10(part('subs')); s.dCopies = r10(part('single')); s.wCopies = r10(part('spaces')); s.xCopies = r10(part('dist') / (s.xSell / 100));
  if (Q.fund.ads) s.adPages = 2;
  if (Q.fund.partners) s.events = 1;
  (['xCopies', 'dCopies', 'wCopies', 'subs'] as const).forEach((k) => {
    const over = s.subs + s.dCopies + s.wCopies + s.xCopies + s.comps - s.run;
    if (over > 0) s[k] = Math.max(0, s[k] - over);
  });
  s.ch = { ...Q.ch, brands: Q.fund.ads || Q.fund.partners || Q.fund.grants }; s.stash = {};
  return s;
}

/* ---------------- verdict ---------------- */

/** The one-sentence verdict above the four figures. */
export function verdict(s: Plan): string {
  const m = model(s), ms = model(securedState(s)), c = cash(s), be = breakEven(s);
  const need = -c.low;
  const mk = (x: number) => (x >= 0 ? `makes ${fmt(x)}` : `loses ${fmt(-x)}`);
  if (!isFinite(be.copies)) return 'Every copy loses money at this price. Raise it or cut the cost per copy.';
  return `This issue ${mk(m.profit)} ${m.profit < 0 ? 'even ' : ''}if sales hit plan${need > 0 ? ',' : ' and'} ${m.profit < 0 && ms.profit < 0 ? fmt(-ms.profit) : mk(ms.profit)} on confirmed money alone${need > 0 ? `, and needs ${fmt(need)} up front` : ''}.`;
}
