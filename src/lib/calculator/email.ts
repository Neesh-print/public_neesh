// The plan email. Pure: takes a plan and returns the subject and body, so
// the route and the tests share one source. The figures and verdict are the
// calculator's own; the copy is Gem's.

import { fmt, fmtN } from './format';
import { breakEven, cash, caseState, model, recCandidates, securedState, verdict, type Plan } from './model';

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

export interface PlanEmailLinks {
  shareUrl: string;
  claimUrl: string;
}

export interface PlanEmail {
  subject: string;
  text: string;
  /** URL to anchor label, for emailHtml. The text carries the bare URLs. */
  links: Record<string, string>;
}

export function planEmail(s: Plan, name: string | undefined | null, links: PlanEmailLinks): PlanEmail {
  const f = planFigures(s);
  const title = name && name.trim() ? name.trim() : 'your magazine';
  const lo = model(caseState(s, 0.6, -15)).profit, hi = model(caseState(s, 1.25, 10)).profit;
  const recs = recCandidates(s).slice(0, 3);

  // Plain and transactional on purpose. A verdict-style subject read as a
  // campaign headline and Gmail filed it under Promotions.
  const subject = `Your plan for ${title}`;

  const moves = recs.length
    ? recs.map((r, i) => `${i + 1}. ${r.title}. Worth +${fmt(r.d)}.`).join('\n')
    : 'Nothing obvious left to change. Price, run and channels are doing their job.';

  // Copy tightened by Gem, Nov 19, 2026.
  const text =
    `Hi,\n\n` +
    `Here is the plan you built on the Neesh magazine calculator. These are planning estimates so get real quotes before you lock this in.\n\n` +
    `**Profit** ${fmt(f.profit)}\n` +
    `**Confirmed only** ${fmt(f.profitConfirmed)}\n` +
    `**Cash needed** ${f.cashNeeded > 0 ? fmt(f.cashNeeded) : '$0'}\n` +
    `**Break-even** ${f.breakEvenCopies === null ? 'Never' : `${fmtN(f.breakEvenCopies)} copies`}\n\n` +
    `Between a slow launch and a strong one, the issue lands between ${fmt(lo)} and ${fmt(hi)}.\n\n` +
    `**What to do first**\n\n${moves}\n\n` +
    `${links.shareUrl}\n\n` +
    `Neesh is where shops, cafés, hotels and studios order independent magazines direct from the publisher. You set the wholesale price and the minimums, they pay at checkout, and we take 10% of the order.\n\n` +
    `${links.claimUrl}\n\n` +
    `Questions? Just reply to this email.`;

  return {
    subject,
    text,
    links: { [links.shareUrl]: 'Open and edit your plan', [links.claimUrl]: 'Claim your title on Neesh for free' },
  };
}

/** Plain-text rendering: bold markers dropped. */
export function emailText(text: string): string {
  return text.replace(/\*\*/g, '');
}
