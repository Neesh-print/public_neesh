import { createHmac, timingSafeEqual } from 'crypto';

// Signed links for actions a reader takes from an email: one-tap unfollow
// and confirming an account deletion. Server only. The token carries the
// action, the subject and an expiry, signed with COLLECT_LINK_SECRET.
//
// Projects that never set COLLECT_LINK_SECRET signed with the service role
// key. That still works, but it ties every emailed link to the database
// master key, so it is logged once per instance. Once the secret is set, new
// links use it and links already sent (unfollow links last a year) still
// verify against the old key.

type Action = 'unfollow' | 'delete';

let warnedFallback = false;

function secrets(): { signing: string; accepted: string[] } {
  const own = process.env.COLLECT_LINK_SECRET;
  const legacy = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (own) return { signing: own, accepted: legacy ? [own, legacy] : [own] };
  if (!legacy) throw new Error('No signing secret');
  if (!warnedFallback) {
    warnedFallback = true;
    console.warn(JSON.stringify({ level: 'warn', event: 'collect_tokens.secret_fallback' }));
  }
  return { signing: legacy, accepted: [legacy] };
}

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

function macMatches(payload: string, mac: string, key: string): boolean {
  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(mac);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function makeToken(action: Action, subject: string, days: number): string {
  const expires = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
  const payload = Buffer.from(JSON.stringify({ a: action, s: subject, e: expires })).toString('base64url');
  return `${payload}.${sign(payload, secrets().signing)}`;
}

// The subject when the token is genuine, unexpired and for this action.
export function readToken(token: string | null | undefined, action: Action): string | null {
  if (!token) return null;
  const [payload, mac] = token.split('.');
  if (!payload || !mac) return null;
  if (!secrets().accepted.some((key) => macMatches(payload, mac, key))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { a: string; s: string; e: number };
    if (data.a !== action || data.e < Date.now() / 1000) return null;
    return data.s;
  } catch {
    return null;
  }
}
