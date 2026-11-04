import { NextRequest, NextResponse } from 'next/server';
import { emailFromLinkToken, SESSION_COOKIE, sessionCookieOptions, sessionToken } from '@/lib/listing/server';

export const dynamic = 'force-dynamic';

// The emailed link lands here: a valid link sets the session cookie and
// opens the editor; an expired or altered one goes back to the sign-in page.
// A mail scanner that follows the link only gets a cookie of its own.
export async function GET(req: NextRequest) {
  const email = emailFromLinkToken(req.nextUrl.searchParams.get('t'));
  if (!email) {
    return NextResponse.redirect(new URL('/listing?submitted=listing_expired', req.url), 303);
  }
  const res = NextResponse.redirect(new URL('/listing/edit', req.url), 303);
  res.cookies.set(SESSION_COOKIE, sessionToken(email), sessionCookieOptions());
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}
