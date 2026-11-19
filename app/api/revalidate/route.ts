import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { limitRequest } from '@/lib/rate-limit';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';

// Constant-time comparison of the provided token against REVALIDATE_TOKEN.
// Hashing first makes both sides the same length.
function tokenMatches(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

// Token-protected on-demand revalidation (spec 5). Hit after imports, edits,
// or removals. With no paths in the body it refreshes the whole tree, which
// is the right default after a bulk import. The token travels only in the
// Authorization header: a query-string token ends up in access logs.
export async function POST(req: NextRequest) {
  if (!(await limitRequest(req, 'revalidate', 10, 60))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  const token = process.env.REVALIDATE_TOKEN;
  const provided = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token || !provided || !tokenMatches(provided, token)) {
    log('warn', 'revalidate.unauthorized');
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let paths: string[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.paths)) paths = body.paths.filter((p: unknown) => typeof p === 'string');
  } catch {
    // empty body is fine
  }

  if (paths.length === 0) {
    revalidatePath('/', 'layout');
    log('info', 'revalidate.all');
    return NextResponse.json({ ok: true, revalidated: ['/ (layout)'] });
  }
  for (const path of paths) revalidatePath(path);
  log('info', 'revalidate.paths', { paths });
  return NextResponse.json({ ok: true, revalidated: paths });
}
