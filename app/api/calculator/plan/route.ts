import { NextRequest, NextResponse } from 'next/server';
import { loadSharedPlan } from '@/lib/calculator/server';

export const dynamic = 'force-dynamic';

// The plan behind a short share link, /calculator?s=<id>. Returns the plan
// and its name only; the row's email and attribution never leave the server.
export async function GET(req: NextRequest) {
  const s = req.nextUrl.searchParams.get('s') ?? '';
  const plan = await loadSharedPlan(s);
  if (!plan) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json(
    { ok: true, S: plan.S, name: plan.name },
    { headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' } }
  );
}
