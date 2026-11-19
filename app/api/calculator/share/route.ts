import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BASE, type Plan } from '@/lib/calculator/model';
import { PlanSchema } from '@/lib/calculator/share';
import { newShareId, shortShareUrl } from '@/lib/calculator/server';
import { clientIp, ipHash, isBot } from '@/lib/signals';
import { serviceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Copy link on /calculator. Stores the plan with kind 'link' and no email,
// and answers with the short URL. The page falls back to the long link,
// with the plan in it, if this request fails.
const bodySchema = z.object({ plan: PlanSchema, name: z.string().max(80).optional() });

export async function POST(req: NextRequest) {
  if (isBot(req.headers.get('user-agent'))) return NextResponse.json({ ok: false }, { status: 400 });
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const plan = { ...BASE, ...parsed.data.plan } as Plan;
  try {
    const supabase = serviceClient();
    const shareId = newShareId();
    const url = shortShareUrl(shareId);
    const { error } = await supabase.from('calculator_plans').insert({
      kind: 'link',
      share_id: shareId,
      plan_name: parsed.data.name ?? null,
      plan,
      share_url: url,
      ip_hash: ipHash(clientIp(req.headers)),
      user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
    });
    if (error) {
      console.error('calculator share insert failed', error.message);
      return NextResponse.json({ ok: false }, { status: 503 });
    }
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error('calculator share failed', err);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
