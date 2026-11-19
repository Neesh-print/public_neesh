// The plan email. Pure: takes a plan and returns the subject and body, so
// the route and the tests share one source. The figures and verdict are the
// calculator's own; the reading of them is editorial and tailored to how
// the plan sells. First draft for Gem to edit.

import { fmt, fmtN } from './format';
import { breakEven, cash, caseState, model, perCopy, recCandidates, securedState, verdict, youPart, type Plan } from './model';

export interface PlanFigures {
  profit: number;
  profitConfirmed: number;
  cashNeeded: number;
  breakEvenCopies: number | null;
  verdict: string;
}

export function planFigures(s: Plan): PlanFigures {
  const m = model(s), ms = model(securedState(s)), c = cash(s), be = breakEven(s);
  return {
    profit: m.profit,
    profitConfirmed: ms.profit,
    cashNeeded: Math.max(0, -c.low),
    breakEvenCopies: isFinite(be.copies) ? be.copies : null,
    verdict: verdict(s),
  };
}

const timesAYear = (n: number) => (n === 1 ? 'once a year' : n === 2 ? 'twice a year' : `${n} times a year`);

function channelsSentence(s: Plan): string {
  const on: string[] = [];
  if (s.subs > 0) on.push('subscribers');
  if (s.pre + s.dCopies > 0) on.push('readers');
  if (s.wCopies > 0) on.push('spaces');
  if (s.xCopies > 0) on.push('a distributor');
  if (s.adPages > 0 || s.events > 0 || s.bCopies > 0 || s.grant > 0) on.push('brands and funders');
  if (!on.length) return '';
  const list = on.length === 1 ? on[0] : `${on.slice(0, -1).join(', ')} and ${on[on.length - 1]}`;
  return `, selling to ${list}`;
}

export interface PlanEmailLinks {
  shareUrl: string;
  claimUrl: string;
}

export function planEmail(s: Plan, name: string | undefined | null, links: PlanEmailLinks): { subject: string; text: string } {
  const f = planFigures(s);
  const title = name && name.trim() ? name.trim() : 'Your issue';
  const lo = model(caseState(s, 0.6, -15)).profit, hi = model(caseState(s, 1.25, 10)).profit;
  const recs = recCandidates(s).slice(0, 3);

  // Plain and transactional on purpose. A verdict-style subject read as a
  // campaign headline and Gmail filed it under Promotions.
  const subject = `Your plan for ${title === 'Your issue' ? 'your magazine' : title}`;

  // The reading.
  const read: string[] = [];
  if (f.profit < 0) {
    read.push(`Fix the plan before you book the printer. Even with every projected copy sold, this issue loses ${fmt(-f.profit)}. That is not a sales problem. It is a price, print cost or run problem, and selling harder will not get you out of it.`);
  } else if (f.profitConfirmed < 0) {
    read.push(`On paper this works. On money you can count on, it does not. ${fmt(-f.profitConfirmed)} of the gap sits on sales that have not happened yet, and the printer wants paying before they do. The job between now and press day is turning projected copies into confirmed ones. Subscribers who have paid, spaces that have ordered, partners who have signed.`);
  } else {
    read.push(`This is a healthy issue. Confirmed money already covers your costs, so the printer is paid whatever happens next, and every copy you sell from here is profit. Most independent publishers never get to that position. Protect it.`);
  }
  if (f.cashNeeded > 0) read.push(`You need ${fmt(f.cashNeeded)} in the bank before you print. Not profit, cash. It comes back as copies sell, but it has to exist first.`);
  else read.push(`You never go below zero. Confirmed money covers each bill as it lands.`);
  read.push(
    `Between a slow launch and a strong one, the issue lands between ${fmt(lo)} and ${fmt(hi)}.` +
      (lo < 0 && f.profit >= 0 ? ' A slow launch puts you in the red, so confirm more money before press day.' : '')
  );

  // The moves.
  const moves = recs.length
    ? recs.map((r, i) => `${i + 1}. ${r.title}. Worth +${fmt(r.d)}.`).join('\n')
    : 'Nothing obvious left to change. Price, run and channels are doing their job.';

  // Where Neesh comes in, tailored to how the plan sells.
  const pc = perCopy(s);
  const viaNeesh = youPart(perCopy({ ...s, via: 'neesh', fulfil: 'self' }).space);
  let neesh: string;
  if (s.xCopies > 0) {
    neesh =
      `You are shipping ${fmtN(s.xCopies)} copies to a distributor. At ${s.xSell}% sell-through each copy shipped leaves you ${fmt(youPart(pc.dist), 2)}, and the money lands around day ${s.xTerms}. ` +
      `The same copy sold to a space through Neesh leaves you ${fmt(viaNeesh, 2)}, paid at checkout, with no returns and no waiting. `;
  } else if (s.wCopies > 0) {
    neesh =
      `${fmtN(s.wCopies)} of your copies go to spaces, the channel that pays fastest and returns nothing. Through Neesh each one leaves you ${fmt(viaNeesh, 2)} after print, fees and packing, and the space pays at checkout. `;
  } else {
    neesh =
      `Spaces are the channel this plan is missing. Shops, cafés and hotels buy at wholesale, keep what they buy and reorder what sells. At your cover price a copy sold to a space through Neesh leaves you ${fmt(viaNeesh, 2)} after print, fees and packing. `;
  }
  neesh +=
    `Neesh is where shops, cafés, hotels and studios order independent magazines direct from the publisher. You set the wholesale price and the minimums, they pay at checkout, and we take 10% of the order. Half our buyers are not bookshops.`;

  const text =
    `Hi,\n\n` +
    `Here is the plan you built on the Neesh magazine calculator. ${fmtN(s.run)} copies of a ${fmtN(s.pages)}-page magazine at ${fmt(s.price)}, ${timesAYear(s.ipy)}${channelsSentence(s)}.\n\n` +
    `**${f.verdict}**\n\n` +
    `**Profit** ${fmt(f.profit)}\n` +
    `**Confirmed only** ${fmt(f.profitConfirmed)}\n` +
    `**Cash needed** ${f.cashNeeded > 0 ? fmt(f.cashNeeded) : '$0'}\n` +
    `**Break-even** ${f.breakEvenCopies === null ? 'Never' : `${fmtN(f.breakEvenCopies)} copies`}\n\n` +
    `**What we read in it**\n\n${read.join('\n\n')}\n\n` +
    `**What to do first**\n\n${moves}\n\n` +
    `**Where Neesh comes in**\n\n${neesh}\n\n` +
    `[Open and edit your plan](${links.shareUrl})\n\n` +
    `[Claim your title on Neesh](${links.claimUrl}). Claiming is free and does not sign you up to sell.\n\n` +
    `Planning estimates. Get real quotes before you print.\n\n` +
    `Questions? Just reply to this email.`;

  return { subject, text };
}

/** Plain-text rendering: bold markers dropped, links as "text, url". */
export function emailText(text: string): string {
  return text.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1, $2');
}
