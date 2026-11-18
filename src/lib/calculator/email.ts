// The plan email. Pure: takes a plan and returns the subject and body, so
// the route and the tests share one source. Copy is a first draft for Gem
// to edit; the figures and verdict are the calculator's own.

import { fmt, fmtN } from './format';
import { breakEven, cash, model, securedState, verdict, type Plan } from './model';

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

export function planEmail(s: Plan, name: string | undefined, shareUrl: string): { subject: string; text: string } {
  const f = planFigures(s);
  const title = name && name.trim() ? name.trim() : 'your magazine';
  const lines = [
    `**Profit** ${fmt(f.profit)}`,
    `**Confirmed only** ${fmt(f.profitConfirmed)}`,
    `**Cash needed** ${f.cashNeeded > 0 ? fmt(f.cashNeeded) : '$0'}`,
    `**Break-even** ${f.breakEvenCopies === null ? 'Never' : `${fmtN(f.breakEvenCopies)} copies`}`,
  ];
  return {
    subject: `Your plan for ${title}`,
    text:
      `Hi,\n\n` +
      `Here is the plan you built on the Neesh magazine calculator: ${fmtN(s.run)} copies of a ${fmtN(s.pages)}-page magazine at ${fmt(s.price)}, ${s.ipy} ${s.ipy === 1 ? 'time' : 'times'} a year.\n\n` +
      `${lines.join('\n')}\n\n` +
      `${f.verdict}\n\n` +
      `Open and edit your plan: ${shareUrl}\n\n` +
      `Planning estimates. Get real quotes before you print.\n\n` +
      `Questions? Just reply to this email.`,
  };
}
