import { NextRequest, NextResponse } from 'next/server';
import { HONEYPOT_FIELD } from './honeypot';

export { HONEYPOT_FIELD };

// Shared plumbing for the public form routes. Every form posts natively (so
// it works with JS off) and lands back on the page it came from with a
// ?submitted= notice; JSON callers get JSON.

// HONEYPOT_FIELD is rendered by <Honeypot />. People never see or fill it;
// form bots fill every field. A filled trap is answered exactly like a
// success so the bot learns nothing, and the submission is dropped.

export function isFormRequest(req: NextRequest): boolean {
  const contentType = req.headers.get('content-type') ?? '';
  return (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  );
}

export type Submission =
  | { ok: true; isForm: boolean; raw: unknown; trapped: boolean }
  | { ok: false; isForm: boolean };

/**
 * Reads a form post (trimmed, empty fields dropped, honeypot removed) or a
 * JSON body. The honeypot key never reaches the schemas, several of which
 * are strict.
 */
export async function readSubmission(req: NextRequest): Promise<Submission> {
  const isForm = isFormRequest(req);
  try {
    if (isForm) {
      const fd = await req.formData();
      const entries: Record<string, string> = {};
      let trapped = false;
      for (const [k, v] of fd.entries()) {
        if (typeof v !== 'string') continue;
        if (k === HONEYPOT_FIELD) {
          if (v.trim() !== '') trapped = true;
          continue;
        }
        if (v.trim() !== '') entries[k] = v.trim();
      }
      return { ok: true, isForm, raw: entries, trapped };
    }
    const raw: unknown = await req.json();
    let trapped = false;
    if (raw && typeof raw === 'object' && HONEYPOT_FIELD in raw) {
      const record = raw as Record<string, unknown>;
      trapped = typeof record[HONEYPOT_FIELD] === 'string' && record[HONEYPOT_FIELD] !== '';
      delete record[HONEYPOT_FIELD];
    }
    return { ok: true, isForm, raw, trapped };
  } catch {
    return { ok: false, isForm };
  }
}

/**
 * 303 back to the submitting page with ?submitted={notice}. Only a
 * same-origin Referer is followed; anything else lands on fallbackPath, so
 * the route cannot be used to bounce visitors to another site.
 */
export function redirectWithNotice(
  req: NextRequest,
  notice: string,
  fallbackPath = '/index',
  hash?: string
): NextResponse {
  let url = new URL(fallbackPath, req.url);
  const referer = req.headers.get('referer');
  if (referer) {
    try {
      const ref = new URL(referer);
      if (ref.origin === new URL(req.url).origin) url = ref;
    } catch {
      // malformed referer: use the fallback
    }
  }
  url.searchParams.set('submitted', notice);
  if (hash) url.hash = hash;
  return NextResponse.redirect(url, 303);
}

export function tooManyRequests(): NextResponse {
  return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '600' } });
}

export function domainMatch(email: string, website: string | null | undefined): boolean {
  if (!website) return false;
  try {
    const emailDomain = email.split('@')[1]?.toLowerCase();
    const siteDomain = new URL(website).hostname.toLowerCase().replace(/^www\./, '');
    return Boolean(emailDomain) && (emailDomain === siteDomain || emailDomain.endsWith(`.${siteDomain}`));
  } catch {
    return false;
  }
}
