import { createHash } from 'crypto';
import { z } from 'zod';

export const SIGNAL_TYPES = [
  'view',
  'stock_request',
  'want_near',
  'outbound_click',
  'claim_click',
  'reader_order',
] as const;

export type SignalType = (typeof SIGNAL_TYPES)[number];

const beaconPayload = z.object({ referrer: z.string().max(2000).optional() }).strict();

export const payloadSchemas: Record<SignalType, z.ZodTypeAny> = {
  view: beaconPayload,
  outbound_click: beaconPayload,
  claim_click: beaconPayload,
  // A reader clicked through Order on Neesh: demand we can't sell to yet.
  reader_order: beaconPayload,
  // The merged "Want this title?" form sends email + postcode + role for
  // both audiences; the older per-audience fields stay accepted so any
  // in-flight submissions from cached pages still land.
  stock_request: z
    .object({
      email: z.string().email().max(320),
      postcode: z.string().min(2).max(16).optional(),
      role: z.enum(['space', 'reader']).optional(),
      business_name: z.string().min(1).max(200).optional(),
      venue_type: z.string().min(1).max(100).optional(),
      city: z.string().min(1).max(100).optional(),
      note: z.string().max(2000).optional(),
    })
    .strict(),
  want_near: z
    .object({
      postcode: z.string().min(2).max(16),
      email: z.string().email().max(320),
      role: z.enum(['space', 'reader']).optional(),
    })
    .strict(),
};

export const signalSchema = z.object({
  title_id: z.string().uuid(),
  signal_type: z.enum(SIGNAL_TYPES),
  payload: z.record(z.unknown()).optional().default({}),
});

const BOT_UA =
  /bot|crawl|spider|slurp|headless|lighthouse|python|curl|wget|monitor|scrape|preview|facebookexternalhit|whatsapp|telegram|pingdom|uptime/i;

// Cheap bot filter (spec 1.3): no UA or a known bot substring drops the event.
export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return BOT_UA.test(userAgent);
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

// ip_hash = sha256(ip + daily_salt) where daily_salt = sha256(secret + date).
// The daily rotation means no stable identifier for a person is ever stored.
export function ipHash(ip: string): string {
  const secret = process.env.SIGNAL_SALT_SECRET ?? 'neesh-directory';
  const day = new Date().toISOString().slice(0, 10);
  const dailySalt = sha256(secret + day);
  return sha256(ip + dailySalt);
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return headers.get('x-real-ip') ?? '0.0.0.0';
}
