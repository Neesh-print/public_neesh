// Shareable plan links. The current plan travels in `?p=` as base64url JSON
// (the hash is taken by the tabs). Decoding validates with zod and fills any
// missing field from BASE; anything that fails validation is ignored.

import { z } from 'zod';
import { BASE, type Plan } from './model';

const num = z.number().finite();
const quote = z.object({ q: num, u: num });
const bool = z.boolean();

const PlanSchema = z.object({
  printMode: z.enum(['est', 'quotes']).optional(),
  trim: z.enum(['digest', 'standard', 'oversize']).optional(),
  paper: z.enum(['uncoated', 'coated', 'premium']).optional(),
  color: z.enum(['mono', 'four']).optional(),
  binding: z.enum(['saddle', 'perfect', 'sewn']).optional(),
  quotes: z.array(quote).max(8).optional(),
  printDeposit: num.optional(), edBefore: num.optional(), otherBefore: num.optional(),
  feePct: num.optional(), cpo: num.optional(), pack: num.optional(), shipAbsorb: num.optional(),
  wCpo: num.optional(), spaceShip: num.optional(),
  via: z.enum(['self', 'neesh']).optional(),
  wTerms: num.optional(),
  fulfil: z.enum(['self', 'neesh']).optional(),
  neeshFulfilPaid: z.enum(['free', 'paid']).optional(),
  wPackPerOrder: num.optional(),
  xPct: num.optional(), xSell: num.optional(), xFreight: num.optional(), xTerms: num.optional(),
  subPost: num.optional(), subRenew: num.optional(), adDeposit: num.optional(),
  pre: num.optional(), subsSec: num.optional(), wSec: num.optional(), adSec: num.optional(),
  eventsSec: num.optional(), bSec: num.optional(), grant: num.optional(),
  // Per-magazine figures. BASE has no value for these, so a link must carry them.
  price: num, pages: num, ipy: num, run: num, freight: num, comps: num, editorial: num, otherFixed: num,
  subs: num, subPrice: num, dCopies: num, wCopies: num, wPct: num, xCopies: num,
  adPages: num, adRate: num, events: num, eventRate: num, bCopies: num,
  ch: z.object({ subs: bool, single: bool, spaces: bool, dist: bool, brands: bool }).optional(),
});

const PayloadSchema = z.object({
  v: z.literal(1),
  name: z.string().max(80).optional(),
  S: PlanSchema,
});

export interface SharedPlan {
  S: Plan;
  name?: string;
}

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** The `p` query value for a plan. Drops the stash; it is session state. */
export function encodePlan(S: Plan, name?: string): string {
  const { stash: _stash, ...rest } = S;
  void _stash;
  return toBase64Url(JSON.stringify({ v: 1, name, S: rest }));
}

/** A plan from a `p` query value, or null when it is not one of ours. */
export function decodePlan(p: string | null | undefined): SharedPlan | null {
  if (!p) return null;
  try {
    const parsed = PayloadSchema.safeParse(JSON.parse(fromBase64Url(p)));
    if (!parsed.success) return null;
    const S = { ...BASE, ...parsed.data.S } as Plan;
    return { S, name: parsed.data.name };
  } catch {
    return null;
  }
}

export function shareUrl(S: Plan, name?: string): string {
  const url = new URL(window.location.href);
  url.search = `?p=${encodePlan(S, name)}`;
  url.hash = '';
  return url.toString();
}
