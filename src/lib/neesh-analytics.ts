// Neesh dataLayer helpers for Google Tag Manager.
//
// Each function pushes one custom event onto window.dataLayer. The GTM
// container ("Neesh Web") carries a Custom Event trigger per event name with
// a GA4 event tag behind it, so nothing here talks to GA4 directly. Call
// these on success callbacks, not on button presses; trackPackCtaClick is
// the one click event by definition.

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

function push(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

/**
 * A curated pack was paid for. Fire on the Stripe checkout success return
 * for a pack, never on the buy click. `value` is the order total in whole
 * currency units (200 for a pack, 300 with the stand); GTM forwards value
 * and currency to GA4 as the conversion value.
 */
export function trackPackPurchase(value: number, currency = 'USD'): void {
  push('pack_purchase', { value, currency });
}

/**
 * A new space (retailer) completed signup. Fire once the account has been
 * created, not on login and not on a repeat visit.
 */
export function trackSpaceSignup(): void {
  push('space_signup_complete');
}

/**
 * The buy CTA on the curated packs page was clicked, i.e. the click that
 * leaves for Stripe.
 */
export function trackPackCtaClick(): void {
  push('pack_cta_click');
}

/**
 * A message to a publisher was sent. Fire when the send resolves
 * successfully, not on submit.
 */
export function trackPublisherMessage(): void {
  push('publisher_message_sent');
}

/**
 * A title request was confirmed. Fire on the confirmation state after the
 * request has been accepted, not on submit.
 */
export function trackTitleRequest(): void {
  push('title_request_submitted');
}

/* ---------------- magazine calculator ---------------- */
// Each event below needs a Custom Event trigger and a GA4 event tag in the
// GTM container. See docs/calculator-gtm.md for the list. No plan
// financials leave the page beyond the four quiz inputs.

/**
 * The last quiz answer was submitted. `funding` lists the money-beyond-copies
 * sources ticked (ads, partners, grants), comma separated, or "none".
 */
export function trackCalculatorQuizComplete(q: { price: number; pages: number; run: number; issuesPerYear: number; funding: string[] }): void {
  push('calculator_quiz_complete', { price: q.price, pages: q.pages, run: q.run, issues_per_year: q.issuesPerYear, funding: q.funding.length ? q.funding.join(',') : 'none' });
}

/** An example plan (Zine, Indie biannual, Big annual, Creator launch) was opened. */
export function trackCalculatorExampleOpen(example: string): void {
  push('calculator_example_open', { example });
}

/** A tab was opened by the reader. */
export function trackCalculatorTabView(tab: string): void {
  push('calculator_tab_view', { tab });
}

/** A plan was saved in the browser. */
export function trackCalculatorPlanSaved(): void {
  push('calculator_plan_saved');
}

/** Copy link succeeded. Fire once the clipboard write resolves. */
export function trackCalculatorLinkCopied(): void {
  push('calculator_link_copied');
}

/** The plan email was sent. Fire when the send resolves, not on submit. */
export function trackCalculatorPlanEmailed(newsletterOptIn: boolean): void {
  push('calculator_plan_emailed', { newsletter_opt_in: newsletterOptIn });
}

/** Claim your title was clicked at the foot of the calculator. */
export function trackCalculatorClaimClick(): void {
  push('calculator_claim_click');
}
