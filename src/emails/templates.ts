// Every transactional template from neesh-transactional-copy.md that is not
// yet wired to a live trigger, with the handoff section 5 corrections
// applied. Wired today: 1.1a/1.1b (claim, /api/claim), 1.2 (approval,
// scripts/approve-claim.ts), 1.6 (removal, scripts/remove.ts), 3.3 (stock
// request) and 3.4 (want-near) in /api/signal. The order emails (2.x) wait
// on the commerce flows in the main app; the digests (3.1, 3.2) wait on the
// v1.1 send pipeline with the signal floor. Sender for all of these is
// Neesh <hi@neesh.art>, reply-to monitored by a person; transactional sends
// skip the unsubscribe link and use "Questions? Just reply to this email."

export interface EmailTemplate {
  subject: string;
  text: string;
}

// 1.3 Welcome, publisher who listed a new title
export function publisherTitleLive(vars: {
  name: string;
  title: string;
  niche: string;
  pageUrl: string;
}): EmailTemplate {
  return {
    subject: `${vars.title} is live on Neesh`,
    text:
      `Hi ${vars.name},\n\n` +
      `${vars.title} is in the index and live now. Anyone browsing ${vars.niche} ` +
      `magazines can find it, and retailers can order from you directly.\n\n` +
      `See your page: ${vars.pageUrl}\n\n` +
      `Add your wholesale terms when you get a chance so orders can come through ` +
      `without a back and forth. If you'd rather we handled fulfillment, reply and ` +
      `tell us. Neesh Fulfillment is in beta and taking a small number of publishers.`,
  };
}

// 1.4 Welcome, space
export function spaceWelcome(vars: {
  name: string;
  businessName: string;
  packsUrl: string;
  indexUrl: string;
}): EmailTemplate {
  return {
    subject: `Welcome to Neesh, ${vars.businessName}`,
    text:
      `Hi ${vars.name},\n\n` +
      `You're set up. Here's what happens now.\n\n` +
      `Pick a pack built for your kind of room, or browse the index and build your ` +
      `own. Either way it's one order, no account minimums, and nothing locked in.\n\n` +
      `See the packs: ${vars.packsUrl}\nBrowse the index: ${vars.indexUrl}\n\n` +
      `Most spaces start with a pack and swap to a custom shelf once they know what ` +
      `their people pick up. No wrong order.\n\n` +
      `Questions? Just reply.`,
  };
}

// 1.5 Log in link (passwordless)
export function loginLink(vars: { loginUrl: string }): EmailTemplate {
  return {
    subject: 'Your Neesh login link',
    text:
      `Log in to Neesh: ${vars.loginUrl}\n\n` +
      `Works for 15 minutes, once. If you didn't ask for this, ignore it.`,
  };
}

// 2.1 Order confirmation, pack
export function packOrderConfirmation(vars: {
  name: string;
  packName: string;
  titleCount: number;
  withStand: boolean;
  orderNumber: string;
  total: string;
  address: string;
  timeframe: string;
  orderUrl: string;
}): EmailTemplate {
  return {
    subject: `Your ${vars.packName} is on the way`,
    text:
      `Hi ${vars.name},\n\n` +
      `Thanks for the order. Here's what's coming.\n\n` +
      `${vars.packName}\n` +
      `${vars.titleCount} titles · ${vars.withStand ? 'with' : 'without'} a handmade wooden stand\n` +
      `Order #${vars.orderNumber} · ${vars.total}\n\n` +
      `Shipping to:\n${vars.address}\n\n` +
      `It ships within ${vars.timeframe} and we'll email tracking. Everything arrives ` +
      `packed flat and ready to put out, with a card listing every title so you can ` +
      `answer the question when a customer asks.\n\n` +
      `View your order: ${vars.orderUrl}\n\n` +
      `Questions? Just reply.`,
  };
}

// 2.2 Order confirmation, custom order from the index
export function customOrderConfirmation(vars: {
  name: string;
  titleCount: number;
  publisher: string;
  orderNumber: string;
  total: string;
  titleList: string;
  timeframe: string;
  orderUrl: string;
}): EmailTemplate {
  return {
    subject: `Order confirmed, ${vars.titleCount} titles from ${vars.publisher}`,
    text:
      `Hi ${vars.name},\n\n` +
      `Your order is in.\n\n` +
      `Order #${vars.orderNumber} · ${vars.total}\n${vars.titleList}\n\n` +
      `${vars.publisher} ships this one directly, usually within ${vars.timeframe}. ` +
      `You'll get tracking when it goes out. If anything's off, reply here and we'll ` +
      `sort it with them.\n\n` +
      `View your order: ${vars.orderUrl}`,
  };
}

// 2.3 Shipped
export function orderShipped(vars: {
  name: string;
  orderNumber: string;
  trackingUrl: string;
  dateRange: string;
}): EmailTemplate {
  return {
    subject: 'Your Neesh order shipped',
    text:
      `Hi ${vars.name},\n\n` +
      `Order #${vars.orderNumber} is on its way.\n\n` +
      `Track it: ${vars.trackingUrl}\n\n` +
      `Expected ${vars.dateRange}. When it lands, put it somewhere people sit.`,
  };
}

// 2.4 New order, to publisher
export function newOrderToPublisher(vars: {
  name: string;
  buyerBusinessName: string;
  city: string;
  copies: number;
  title: string;
  wholesaleTotal: string;
  venueType: string;
  orderUrl: string;
  timeframe: string;
  paymentTiming: string;
}): EmailTemplate {
  return {
    subject: `New order: ${vars.copies} copies of ${vars.title}`,
    text:
      `Hi ${vars.name},\n\n` +
      `You have an order.\n\n` +
      `${vars.buyerBusinessName} · ${vars.city}\n` +
      `${vars.copies} copies of ${vars.title} · ${vars.wholesaleTotal}\n` +
      `${vars.venueType}\n\n` +
      `See the order: ${vars.orderUrl}\n\n` +
      `Ship within ${vars.timeframe} and mark it sent in your dashboard so the buyer ` +
      `gets tracking. Payment lands ${vars.paymentTiming}.`,
  };
}

// 2.5 Reorder nudge, to space. Conditional: fires only after a gap of
// {months} with no order, never on a schedule.
export function reorderNudge(vars: {
  name: string;
  months: number;
  packName: string;
  indexCount: number;
  refreshUrl: string;
  indexUrl: string;
  preferencesUrl: string;
}): EmailTemplate {
  return {
    subject: 'Ready for a new shelf?',
    text:
      `Hi ${vars.name},\n\n` +
      `It's been ${vars.months} months since your ${vars.packName}. Most spaces ` +
      `refresh around now, but there's no schedule you're breaking by ignoring this.\n\n` +
      `If you want something different this time, the index has ${vars.indexCount}+ ` +
      `titles and a build-your-own option.\n\n` +
      `Refresh your pack: ${vars.refreshUrl}\nBrowse the index: ${vars.indexUrl}\n\n` +
      `If you'd rather hear from us less often, change that here: ${vars.preferencesUrl}`,
  };
}

// 2.6 Reorder alert, to publisher
export function reorderAlert(vars: {
  name: string;
  buyerBusinessName: string;
  city: string;
  title: string;
  ordinal: string;
  orderUrl: string;
}): EmailTemplate {
  return {
    subject: `${vars.buyerBusinessName} reordered ${vars.title}`,
    text:
      `Hi ${vars.name},\n\n` +
      `${vars.buyerBusinessName} in ${vars.city} just reordered ${vars.title}. ` +
      `That's their ${vars.ordinal} order.\n\n` +
      `See the order: ${vars.orderUrl}\n\n` +
      `Worth knowing which rooms keep coming back. It's usually the ones you'd never ` +
      `have pitched.`,
  };
}

// 3.1 Publisher demand digest, unclaimed profile. Monthly, the conversion
// engine. Send only when the title clears the signal floor (spec 6.4).
export function unclaimedDigest(vars: {
  publisher: string;
  title: string;
  views: number;
  wantNear: number;
  stockClicks: number;
  claimUrl: string;
}): EmailTemplate {
  return {
    subject: `${vars.views} people looked for ${vars.title} last month`,
    text:
      `Hi ${vars.publisher},\n\n` +
      `${vars.title} has a page on Neesh, the index of independent print. Last month ` +
      `it got ${vars.views} views, ${vars.wantNear} people asked where they could buy ` +
      `it near them, and ${vars.stockClicks} shops clicked through to stock it.\n\n` +
      `We can't pass those along until the page is claimed. Claiming takes a minute, ` +
      `costs nothing, and you can take the page down whenever you like.\n\n` +
      `Claim ${vars.title}: ${vars.claimUrl}\n\n` +
      `If you'd rather we removed the page entirely, reply and it's gone today.`,
  };
}

// 3.2 Publisher demand digest, claimed profile. Conditional: skip the month
// entirely if all counts are zero.
export function claimedDigest(vars: {
  name: string;
  title: string;
  month: string;
  views: number;
  wantNear: number;
  wantNearCities: number;
  stockClicks: number;
  orders: number;
  detailUrl: string;
  topDemandCity?: string;
}): EmailTemplate {
  const cityLine = vars.topDemandCity
    ? `\n\nThe most requests came from ${vars.topDemandCity}, where nobody's stocking ` +
      `you yet. Want us to work on that? Just reply.`
    : '';
  return {
    subject: `${vars.title} last month on Neesh`,
    text:
      `Hi ${vars.name},\n\n` +
      `Here's how ${vars.title} did in ${vars.month}.\n\n` +
      `${vars.views} page views\n` +
      `${vars.wantNear} people asked where to buy it near them, in ${vars.wantNearCities} cities\n` +
      `${vars.stockClicks} shops clicked through to stock it\n` +
      `${vars.orders} orders\n\n` +
      `See the detail: ${vars.detailUrl}` +
      cityLine,
  };
}
