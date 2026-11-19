import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { collapse, HubSpotRateLimited, setSubscription, upsertContacts, type QueueRow } from '@/lib/hubspot';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Daily (vercel.json): sends queued newsletter consent changes to HubSpot
// (see supabase/migrations/20261025150000_hubspot_sync_queue.sql).
//
// Each address is settled as one unit: its contact is upserted, then it is
// subscribed or unsubscribed, and every queued row for it is marked done
// together. A failure leaves its rows pending with the error and an attempt
// count; after MAX_ATTEMPTS it is logged as an error (which alerts) and left
// for a person. A HubSpot rate limit, a missing token or running out of time
// ends the run early and the rest waits for the next one.

const BATCH = 200;
const MAX_ATTEMPTS = 5;
const TIME_BUDGET_MS = 50_000;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    log('warn', 'hubspot_sync.not_configured');
    return NextResponse.json({ ok: true, skipped: 'HUBSPOT_ACCESS_TOKEN not set' });
  }
  const canSubscribe = Boolean(process.env.HUBSPOT_SUBSCRIPTION_ID);
  if (!canSubscribe) log('warn', 'hubspot_sync.no_subscription_id');

  const startedAt = Date.now();
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from('hubspot_sync_queue')
    .select('id, email, action, source')
    .is('processed_at', null)
    .lt('attempts', MAX_ATTEMPTS)
    .order('id')
    .limit(BATCH);
  if (error) {
    log('error', 'hubspot_sync.queue_read_failed', { error: error.message });
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Without a subscription id only contact upserts can be done; consent
  // changes stay queued until it is set.
  const groups = collapse((data ?? []) as QueueRow[]).filter((g) => canSubscribe || g.action === 'upsert');
  let done = 0;
  let failed = 0;
  let stoppedEarly = false;

  const markDone = (ids: number[]) =>
    supabase.from('hubspot_sync_queue').update({ processed_at: new Date().toISOString(), last_error: null }).in('id', ids);

  // Contacts first, in batches of 100, so every address exists before its
  // subscription is set.
  try {
    await upsertContacts(groups.map((g) => g.email));
  } catch (err) {
    // A rate limit is not the queue's fault: no attempt is counted.
    if (err instanceof HubSpotRateLimited) {
      log('warn', 'hubspot_sync.rate_limited');
      return NextResponse.json({ ok: true, done: 0, stoppedEarly: true });
    }
    log('error', 'hubspot_sync.upsert_failed', { error: err });
    await recordFailure(groups.flatMap((g) => g.ids), err);
    return NextResponse.json({ ok: false, done: 0, failed: groups.length }, { status: 502 });
  }

  for (const group of groups) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      stoppedEarly = true;
      break;
    }
    try {
      if (group.action !== 'upsert') await setSubscription(group.email, group.action, group.source);
      const { error: markError } = await markDone(group.ids);
      if (markError) throw new Error(`mark done: ${markError.message}`);
      done++;
    } catch (err) {
      if (err instanceof HubSpotRateLimited) {
        stoppedEarly = true;
        break;
      }
      failed++;
      await recordFailure(group.ids, err);
    }
  }

  log(failed ? 'warn' : 'info', 'hubspot_sync.done', { done, failed, stoppedEarly, pending: groups.length - done - failed });
  return NextResponse.json({ ok: true, done, failed, stoppedEarly });

  async function recordFailure(ids: number[], err: unknown) {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    const { data: rows } = await supabase.from('hubspot_sync_queue').select('id, attempts').in('id', ids);
    for (const row of (rows ?? []) as { id: number; attempts: number }[]) {
      const attempts = row.attempts + 1;
      await supabase.from('hubspot_sync_queue').update({ attempts, last_error: message }).eq('id', row.id);
      if (attempts >= MAX_ATTEMPTS) {
        log('error', 'hubspot_sync.gave_up', { queueId: row.id, error: message });
      }
    }
  }
}
