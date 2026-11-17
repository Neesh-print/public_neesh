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

// Title-page CTA clicks. Click events by definition, like
// trackPackCtaClick: they fire on the click itself and never hold up the
// navigation or form post behind it, so every CTA still works with JS off.

/**
 * A "Stock it" CTA was clicked: "Order wholesale on Neesh" on a title page
 * (the order button and the line under the stockist list), which leads into
 * the wholesale order fork.
 */
export function trackStockItClick(titleSlug: string): void {
  push('stock_it_click', { title_slug: titleSlug });
}

/**
 * A "Request it" CTA was used: the "Let me know" submit on the "Buy it
 * wholesale." form. The confirmed request is still title_request_submitted
 * (trackTitleRequest); this one is the attempt.
 */
export function trackRequestItClick(titleSlug: string): void {
  push('request_it_click', { title_slug: titleSlug });
}

/**
 * A "See where it's stocked" CTA was clicked: "Find shops" on a title page
 * that is not orderable, and "See where it's stocked" on the reader branch
 * of the order fork. Both jump to the stockist list.
 */
export function trackSeeStockedClick(titleSlug: string): void {
  push('see_stocked_click', { title_slug: titleSlug });
}

/**
 * A reader added their email in the "Save it to your collection" sheet and
 * the sign-in link was sent. Fire on the successful send, not the submit.
 * `source` is the page path the sheet was opened on.
 */
export function trackCollectionEmail(source?: string): void {
  push('collection_email_submitted', source ? { source } : {});
}
