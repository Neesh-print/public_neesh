import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { clientIp, ipHash, isBot, payloadSchemas, signalSchema } from '@/lib/signals';
import { notify } from '@/lib/notify';

export const dynamic = 'force-dynamic';

function noContent() {
  return new NextResponse(null, { status: 204 });
}

function redirectBack(req: NextRequest, param: string) {
  const referer = req.headers.get('referer');
  const url = referer ? new URL(referer) : new URL('/directory', req.url);
  url.searchParams.set('submitted', param);
  return NextResponse.redirect(url, 303);
}

function prune(fields: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === 'string' && v.trim() !== '') out[k] = v.trim();
  }
  return out;
}

// Demand signal ingest (spec 8). Always answers 204 (or a 303 back to the
// form page) so the client never branches on the result.
export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? '';
  const isForm =
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data');

  let raw: unknown = null;
  let signalTypeForRedirect = 'ok';
  try {
    if (isForm) {
      const fd = await req.formData();
      const entries: Record<string, string> = {};
      for (const [k, v] of fd.entries()) {
        if (typeof v === 'string') entries[k] = v;
      }
      const { title_id, signal_type, ...rest } = entries;
      signalTypeForRedirect = signal_type ?? 'ok';
      raw = { title_id, signal_type, payload: prune(rest) };
    } else {
      raw = await req.json();
    }
  } catch {
    return isForm ? redirectBack(req, signalTypeForRedirect) : noContent();
  }
  const done = () => (isForm ? redirectBack(req, signalTypeForRedirect) : noContent());

  const ua = req.headers.get('user-agent');
  if (isBot(ua)) return done();

  const parsed = signalSchema.safeParse(raw);
  if (!parsed.success) return done();
  const payload = payloadSchemas[parsed.data.signal_type].safeParse(parsed.data.payload);
  if (!payload.success) return done();

  try {
    const supabase = serviceClient();
    const { error } = await supabase.from('directory_demand_signals').insert({
      title_id: parsed.data.title_id,
      signal_type: parsed.data.signal_type,
      payload: payload.data,
      ip_hash: ipHash(clientIp(req.headers)),
      user_agent: ua ? ua.slice(0, 500) : null,
    });
    if (error) {
      console.error('signal insert failed', error.message);
      return done();
    }

    if (
      parsed.data.signal_type === 'stock_request' ||
      parsed.data.signal_type === 'want_near'
    ) {
      const { data: title } = await supabase
        .from('directory_titles')
        .select('name, slug')
        .eq('id', parsed.data.title_id)
        .maybeSingle();
      const label =
        parsed.data.signal_type === 'stock_request' ? 'Stock request' : 'Want-near';
      await notify(
        `${label} for ${title?.name ?? parsed.data.title_id}`,
        `${label} for ${title?.name ?? 'unknown title'} (/titles/${title?.slug ?? '?'})\n\n` +
          JSON.stringify(payload.data, null, 2)
      );
    }
  } catch (err) {
    console.error('signal ingest failed', err);
  }
  return done();
}
