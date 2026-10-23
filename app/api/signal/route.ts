import { NextRequest, NextResponse } from 'next/server';
import { anonClient, serviceClient } from '@/lib/supabase';
import { clientIp, ipHash, isBot, payloadSchemas, signalSchema } from '@/lib/signals';
import { echoSafe, emailHtml, notify, sendEmail } from '@/lib/notify';
import { canonical } from '@/lib/seo';
import { TAG_THRESHOLD } from '@/lib/queries';
import { readSubmission, redirectWithNotice } from '@/lib/forms';
import { limitFormRequest, limitRequest } from '@/lib/rate-limit';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';

function noContent() {
  return new NextResponse(null, { status: 204 });
}

// Signal types that email the person who sent them.
const EMAILING_TYPES = new Set(['stock_request', 'want_near', 'title_interest']);

// Demand signal ingest (spec 8). Always answers 204 (or a 303 back to the
// form page) so the client never branches on the result.
export async function POST(req: NextRequest) {
  const submission = await readSubmission(req);
  let raw: unknown = null;
  let signalTypeForRedirect = 'ok';
  if (submission.ok && submission.isForm) {
    const { title_id, signal_type, ...rest } = submission.raw as Record<string, string>;
    signalTypeForRedirect = signal_type ?? 'ok';
    raw = { title_id, signal_type, payload: rest };
  } else if (submission.ok) {
    raw = submission.raw;
  }
  const done = () =>
    submission.isForm ? redirectWithNotice(req, signalTypeForRedirect) : noContent();
  if (!submission.ok || submission.trapped) return done();

  // Beacons fire on every profile view; the emailing types get the same
  // limits as the other public forms. Over the limit is answered like a
  // success and nothing is stored.
  const requestedType =
    raw && typeof raw === 'object' ? (raw as { signal_type?: unknown }).signal_type : undefined;
  const allowed =
    typeof requestedType === 'string' && EMAILING_TYPES.has(requestedType)
      ? await limitFormRequest(req, 'signal-email')
      : await limitRequest(req, 'signal-beacon', 60, 60);
  if (!allowed) return done();

  // The merged "Want this title?" form submits a virtual title_interest
  // type; the chosen role decides which stored signal it becomes, so the
  // demand data stays split by audience.
  if (
    raw &&
    typeof raw === 'object' &&
    (raw as { signal_type?: unknown }).signal_type === 'title_interest'
  ) {
    const r = raw as { signal_type: string; payload?: Record<string, unknown> };
    r.signal_type = r.payload?.role === 'space' ? 'stock_request' : 'want_near';
  }

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
      log('error', 'signal.insert_failed', { error: error.message });
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
        const request = payload.data as { business_name?: string; email: string };
        const business = echoSafe(request.business_name, '', 80);
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
                  ? canonical(`/index/${tag.slug}`)
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
          `Thanks for asking about **${title.name}**` +
          `${business ? ` for ${business}` : ''}. ` +
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
        const place = echoSafe(request.postcode, 'your area', 16);
        const body =
          `Hi,\n\n` +
          `Thanks for telling us you want **${title.name}** in ${place}. ` +
          `We keep track of these, and when enough people ask for a title in one ` +
          `place, we go find a shop or café to stock it.\n\n` +
          `We'll email you if that happens. That's the only reason we'll email you.\n\n` +
          `In the meantime you can buy it direct from the publisher.\n\n` +
          `**Buy ${title.name} direct:** ${canonical(`/out/${title.slug}`)}`;
        await sendEmail({
          to: request.email,
          subject: `Noted, ${title.name} near you`,
          text: body.replace(/\*\*/g, ''),
          html: emailHtml(body),
        });
      }
    }
  } catch (err) {
    log('error', 'signal.failed', { error: err });
  }
  return done();
}
