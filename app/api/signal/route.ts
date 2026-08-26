import { NextRequest, NextResponse } from 'next/server';
import { anonClient, serviceClient } from '@/lib/supabase';
import { clientIp, ipHash, isBot, payloadSchemas, signalSchema } from '@/lib/signals';
import { emailHtml, notify, sendEmail } from '@/lib/notify';
import { canonical } from '@/lib/seo';
import { TAG_THRESHOLD } from '@/lib/queries';

export const dynamic = 'force-dynamic';

function noContent() {
  return new NextResponse(null, { status: 204 });
}

function redirectBack(req: NextRequest, param: string) {
  const referer = req.headers.get('referer');
  const url = referer ? new URL(referer) : new URL('/index', req.url);
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

      // Email 3.3 to the requester (handoff 5.4): stock requests are never
      // forwarded to the publisher, and the email must not claim otherwise.
      if (parsed.data.signal_type === 'stock_request' && title) {
        const request = payload.data as { business_name: string; email: string };
        // Primary niche and its live-title count, through the anon client so
        // the count respects the visibility predicate.
        let nichePara = '';
        try {
          const { data: tagged } = await anonClient()
            .from('directory_titles')
            .select('directory_title_tags(tag:directory_tags(id, slug, name))')
            .eq('id', parsed.data.title_id)
            .maybeSingle();
          const tag = (
            tagged as unknown as {
              directory_title_tags?: { tag: { id: string; slug: string; name: string } }[];
            } | null
          )?.directory_title_tags?.[0]?.tag;
          if (tag) {
            const { count } = await anonClient()
              .from('directory_title_tags')
              .select('title_id', { count: 'exact', head: true })
              .eq('tag_id', tag.id);
            const others = Math.max(0, (count ?? 0) - 1);
            if (others >= 2) {
              const niche = tag.name.toLowerCase();
              const browseUrl =
                (count ?? 0) >= TAG_THRESHOLD
                  ? canonical(`/magazines/${tag.slug}`)
                  : canonical('/index');
              nichePara =
                `\n\nIn the meantime, ${others} other ${niche} titles are ready to ` +
                `order now.\n\n**Browse ${niche} magazines:** ${browseUrl}`;
            }
          }
        } catch {
          // the niche paragraph is optional; the email sends without it
        }
        const bodyStart =
          `Hi,\n\n` +
          `Thanks for asking about **${title.name}** for ${request.business_name}. ` +
          `We're checking availability and terms and we'll come back to you.\n\n` +
          `Usually takes a couple of days. If it's urgent, reply and say so.`;
        const body = bodyStart + nichePara;
        await sendEmail({
          to: request.email,
          subject: `Your stock request for ${title.name}`,
          text: body.replace(/\*\*/g, ''),
          html: emailHtml(body),
        });
      }

      // Email 3.4 to the consumer. The want_near payload carries a postcode
      // rather than a city (spec 8), so the postcode stands in for {city}.
      if (parsed.data.signal_type === 'want_near' && title) {
        const request = payload.data as { postcode: string; email: string };
        const body =
          `Hi,\n\n` +
          `Thanks for telling us you want **${title.name}** in ${request.postcode}. ` +
          `We keep track of these, and when enough people ask for a title in one ` +
          `place, we go find a shop or café to stock it.\n\n` +
          `We'll email you if that happens. That's the only reason we'll email you.\n\n` +
          `In the meantime you can buy it direct from the publisher.\n\n` +
          `**Buy ${title.name} direct:** ${canonical(`/out/${title.slug}`)}`;
        await sendEmail({
          to: request.email,
          subject: `Noted, ${title.name} in ${request.postcode}`,
          text: body.replace(/\*\*/g, ''),
          html: emailHtml(body),
        });
      }
    }
  } catch (err) {
    console.error('signal ingest failed', err);
  }
  return done();
}
