import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClient } from '@/lib/supabase';
import { isBot } from '@/lib/signals';
import { CLIENT_EVENT_TYPES, STATE_EVENT_TYPES } from '@/lib/collect/shared';
import { cleanUtm, readerFromRequest } from '@/lib/collect/server';
import { limitRequest } from '@/lib/rate-limit';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';

const schema = z.object({
  event_type: z.enum(CLIENT_EVENT_TYPES),
  title_id: z.string().uuid().nullable().optional(),
  issue_id: z.string().uuid().nullable().optional(),
  store_id: z.string().uuid().nullable().optional(),
  surface: z.string().max(40).nullable().optional(),
  anon_id: z.string().uuid().nullable().optional(),
  utm: z
    .object({
      utm_source: z.string().optional(),
      utm_medium: z.string().optional(),
      utm_campaign: z.string().optional(),
      utm_content: z.string().optional(),
    })
    .partial()
    .optional(),
});

// The server route for collection_events (the table has no client policies).
// Views and clicks come from everyone. Own/Want/Follow changes come from
// here only before sign-in, tagged with the device's anon_id; after sign-in
// the state tables' triggers write them, so state events from a signed-in
// reader are dropped to avoid counting twice.
export async function POST(req: NextRequest) {
  if (isBot(req.headers.get('user-agent'))) return new NextResponse(null, { status: 204 });
  if (!(await limitRequest(req, 'collect-event', 120, 60))) return new NextResponse(null, { status: 204 });
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const e = parsed.data;

  const reader = await readerFromRequest(req);
  if (reader && STATE_EVENT_TYPES.has(e.event_type)) return new NextResponse(null, { status: 204 });
  if (!reader && !e.anon_id) return new NextResponse(null, { status: 204 });
  if (e.event_type === 'acquired_confirmed' && !reader) return new NextResponse(null, { status: 204 });

  try {
    const supabase = serviceClient();
    let titleId = e.title_id ?? null;
    if (!titleId && e.issue_id) {
      const { data } = await supabase.from('directory_issues').select('title_id').eq('id', e.issue_id).maybeSingle();
      titleId = (data?.title_id as string | undefined) ?? null;
    }
    // A reader without a collectors row yet (mid sign-in) logs anonymously.
    let userId: string | null = null;
    if (reader) {
      const { data } = await supabase.from('collectors').select('user_id').eq('user_id', reader.id).maybeSingle();
      userId = data ? reader.id : null;
    }
    const { error } = await supabase.from('collection_events').insert({
      user_id: userId,
      anon_id: userId ? null : e.anon_id ?? null,
      event_type: e.event_type,
      title_id: titleId,
      issue_id: e.issue_id ?? null,
      store_id: e.store_id ?? null,
      surface: e.surface ?? null,
      ...cleanUtm(e.utm),
    });
    if (error) log('error', 'collect_event.insert_failed', { error: error.message });
  } catch (err) {
    log('error', 'collect_event.failed', { error: err });
  }
  return new NextResponse(null, { status: 204 });
}
