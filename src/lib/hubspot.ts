// HubSpot client for the newsletter sync (/api/cron/hubspot-sync). Server
// only. Needs HUBSPOT_ACCESS_TOKEN, a private app token with the scopes
// crm.objects.contacts.read, crm.objects.contacts.write and
// communication_preferences.read_write. HUBSPOT_SUBSCRIPTION_ID is the
// subscription type readers opt in to (the newsletter); without it contacts
// are still created but nobody is subscribed or unsubscribed.

const API = 'https://api.hubapi.com';
const TIMEOUT_MS = 10_000;

export type SyncAction = 'subscribe' | 'unsubscribe' | 'upsert';

export interface QueueRow {
  id: number;
  email: string;
  action: SyncAction;
  source: string;
}

/** HubSpot said slow down: stop this run and leave the rest for the next. */
export class HubSpotRateLimited extends Error {}

export class HubSpotError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

// The latest queued change per address wins; earlier ones for the same
// address are settled with it. An address that is subscribed and then
// unsubscribed before a run ends up unsubscribed, never subscribed.
export function collapse(rows: QueueRow[]): { email: string; action: SyncAction; source: string; ids: number[] }[] {
  const byEmail = new Map<string, { email: string; action: SyncAction; source: string; ids: number[] }>();
  for (const row of [...rows].sort((a, b) => a.id - b.id)) {
    const email = row.email.trim().toLowerCase();
    const entry = byEmail.get(email);
    if (entry) {
      entry.ids.push(row.id);
      // A later upsert (contact only) never overrides a consent change.
      if (row.action !== 'upsert' || entry.action === 'upsert') {
        entry.action = row.action;
        entry.source = row.source;
      }
    } else {
      byEmail.set(email, { email, action: row.action, source: row.source, ids: [row.id] });
    }
  }
  return [...byEmail.values()];
}

async function call(path: string, body: unknown): Promise<{ status: number; text: string }> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) throw new HubSpotError('HUBSPOT_ACCESS_TOKEN is not set', 0);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
    const text = await res.text();
    if (res.status === 429) throw new HubSpotRateLimited('HubSpot rate limit');
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

/** Creates or updates contacts by email, 100 per request. */
export async function upsertContacts(emails: string[]): Promise<void> {
  for (let i = 0; i < emails.length; i += 100) {
    const inputs = emails.slice(i, i + 100).map((email) => ({ idProperty: 'email', id: email, properties: { email } }));
    const { status, text } = await call('/crm/v3/objects/contacts/batch/upsert', { inputs });
    if (status >= 300) throw new HubSpotError(`contact upsert ${status}: ${text.slice(0, 300)}`, status);
  }
}

// HubSpot answers 400 when the address is already in the requested state.
const ALREADY = /already (subscribed|unsubscribed)|not subscribed|is already/i;

/** Subscribes or unsubscribes one address from the newsletter subscription type. */
export async function setSubscription(email: string, action: 'subscribe' | 'unsubscribe', source: string): Promise<void> {
  const subscriptionId = process.env.HUBSPOT_SUBSCRIPTION_ID;
  if (!subscriptionId) throw new HubSpotError('HUBSPOT_SUBSCRIPTION_ID is not set', 0);
  const { status, text } = await call(`/communication-preferences/v3/${action}`, {
    emailAddress: email,
    subscriptionId,
    legalBasis: 'CONSENT_WITH_NOTICE',
    legalBasisExplanation:
      action === 'subscribe'
        ? `Opted in to the Neesh newsletter on neesh.art (${source}).`
        : `Opted out on neesh.art (${source}).`,
  });
  if (status < 300) return;
  if (status === 400 && ALREADY.test(text)) return;
  throw new HubSpotError(`${action} ${status}: ${text.slice(0, 300)}`, status);
}
