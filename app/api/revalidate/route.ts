import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

// Token-protected on-demand revalidation (spec 5). Hit after imports, edits,
// or removals. With no paths in the body it refreshes the whole tree, which
// is the right default after a bulk import.
export async function POST(req: NextRequest) {
  const token = process.env.REVALIDATE_TOKEN;
  const auth = req.headers.get('authorization') ?? '';
  const provided =
    auth.replace(/^Bearer\s+/i, '') || req.nextUrl.searchParams.get('token') || '';
  if (!token || provided !== token) {
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
    return NextResponse.json({ ok: true, revalidated: ['/ (layout)'] });
  }
  for (const path of paths) revalidatePath(path);
  return NextResponse.json({ ok: true, revalidated: paths });
}
