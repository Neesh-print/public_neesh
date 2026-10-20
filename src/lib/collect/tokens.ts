import { createHmac, timingSafeEqual } from 'crypto';

// Signed links for actions a reader takes from an email: one-tap unfollow
// and confirming an account deletion. Server only. The token carries the
// action, the subject and an expiry, signed with COLLECT_LINK_SECRET (or
// the service role key when that isn't set).

type Action = 'unfollow' | 'delete';

function secret(): string {
  const s = process.env.COLLECT_LINK_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('No signing secret');
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function makeToken(action: Action, subject: string, days: number): string {
  const expires = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
  const payload = Buffer.from(JSON.stringify({ a: action, s: subject, e: expires })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

// The subject when the token is genuine, unexpired and for this action.
export function readToken(token: string | null | undefined, action: Action): string | null {
  if (!token) return null;
  const [payload, mac] = token.split('.');
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { a: string; s: string; e: number };
    if (data.a !== action || data.e < Date.now() / 1000) return null;
    return data.s;
  } catch {
    return null;
  }
}
