import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { emailHtml, sendEmail } from '@/lib/notify';
import { canonical } from '@/lib/seo';
import { coverPublicUrl } from '@/lib/supabase';
import { newIssueEmail } from '@/emails/newIssue';
import { issueDate } from '@/lib/collect/shared';
import { makeToken } from '@/lib/collect/tokens';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Notification pilot, run once a day by Vercel Cron (vercel.json). Pilot
// titles are directory_titles.collect_pilot = true.
//
// 1. New-issue email: followers of a pilot title hear when a new issue is
//    approved. One email per reader per run, so at most one a day, listing
//    every new issue they follow. Only issues created in the last 14 days
//    count, so a backfill never mails old issues as news.
// 2. Availability alert: when a reported or confirmed record is created for
//    an issue a reader asked about, they get one email and the request is
//    marked fulfilled.
// Every send logs alert_sent. Resend is the sender (lib/notify).
//
// Safe to re-run. A run that hits the time limit part way leaves
// followers_notified_at unset, and the next run skips every reader whose
// alert_sent event for that issue already exists, so nobody gets the same
// email twice. Query errors fail the run (500, logged and alerted) instead
// of quietly sending nothing.

const FRESH_DAYS = 14;
// Stop starting new sends with this much of maxDuration left.
const TIME_BUDGET_MS = 50_000;

class QueryError extends Error {}

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new QueryError(`${what}: ${res.error.message}`);
  return (res.data ?? ([] as unknown)) as T;
}

interface Followed {
  issueId: string;
  titleId: string;
  titleName: string;
  titleSlug: string;
  issueLabel: string;
  dateLabel: string | null;
  coverUrl: string | null;
}

async function emailFor(userId: string, cache: Map<string, string | null>): Promise<string | null> {
  if (cache.has(userId)) return cache.get(userId) ?? null;
  const { data } = await serviceClient().auth.admin.getUserById(userId);
  const email = data.user?.email ?? null;
  cache.set(userId, email);
  return email;
}

const SETTINGS_LINE = `Change what Neesh emails you about: ${canonical('/collect/settings')}`;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    return await run();
  } catch (err) {
    log('error', 'collect_notify.failed', { error: err });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

async function run(): Promise<NextResponse> {
  const startedAt = Date.now();
  const outOfTime = () => Date.now() - startedAt > TIME_BUDGET_MS;
  let unfinished = false;
  const supabase = serviceClient();
  const since = new Date(Date.now() - FRESH_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const emails = new Map<string, string | null>();
  let newIssueEmails = 0;
  let alertEmails = 0;

  // 1. New issues on pilot titles.
  const fresh = must(
    await supabase
      .from('directory_issues')
      .select(
        'id, issue_label, published_on, published_year, cover_image_path, title:directory_titles!inner(id, name, slug, collect_pilot, cover_image_path)'
      )
      .eq('review_status', 'approved')
      .eq('removed', false)
      .is('merged_into', null)
      .is('followers_notified_at', null)
      .gte('created_at', since)
      .eq('directory_titles.collect_pilot', true),
    'fresh issues'
  );

  const issues = (fresh as unknown as {
    id: string;
    issue_label: string;
    published_on: string | null;
    published_year: number | null;
    cover_image_path: string | null;
    title: { id: string; name: string; slug: string; cover_image_path: string | null };
  }[]).map<Followed>((r) => ({
    issueId: r.id,
    titleId: r.title.id,
    titleName: r.title.name,
    titleSlug: r.title.slug,
    issueLabel: r.issue_label,
    dateLabel: issueDate(r),
    coverUrl: coverPublicUrl(r.cover_image_path) ?? coverPublicUrl(r.title.cover_image_path),
  }));

  if (issues.length > 0) {
    const titleIds = [...new Set(issues.map((i) => i.titleId))];
    const follows = must(
      await supabase
        .from('collector_titles')
        .select('user_id, title_id, collector:collectors!inner(notify_new_issues)')
        .in('title_id', titleIds)
        .eq('following', true)
        .eq('collectors.notify_new_issues', true),
      'follows'
    );

    // Readers already emailed about an issue (by an earlier, unfinished run).
    const sent = must(
      await supabase
        .from('collection_events')
        .select('user_id, issue_id')
        .eq('event_type', 'alert_sent')
        .eq('surface', 'new_issue_email')
        .in(
          'issue_id',
          issues.map((i) => i.issueId)
        ),
      'sent alerts'
    ) as { user_id: string | null; issue_id: string | null }[];
    const alreadySent = new Set(sent.map((e) => `${e.user_id}:${e.issue_id}`));

    const byReader = new Map<string, Followed[]>();
    for (const f of follows as { user_id: string; title_id: string }[]) {
      const list = byReader.get(f.user_id) ?? [];
      list.push(
        ...issues.filter((i) => i.titleId === f.title_id && !alreadySent.has(`${f.user_id}:${i.issueId}`))
      );
      byReader.set(f.user_id, list);
    }

    // Issue totals per title, for "You own 4 of its 5 issues."
    const allIssues = must(
      await supabase
        .from('directory_issues')
        .select('id, title_id')
        .in('title_id', titleIds)
        .eq('removed', false)
        .is('merged_into', null)
        .neq('review_status', 'rejected'),
      'issue totals'
    ) as { id: string; title_id: string }[];
    const totals = new Map<string, number>();
    const titleOf = new Map<string, string>();
    for (const i of allIssues) {
      totals.set(i.title_id, (totals.get(i.title_id) ?? 0) + 1);
      titleOf.set(i.id, i.title_id);
    }

    for (const [userId, list] of byReader) {
      if (outOfTime()) {
        unfinished = true;
        break;
      }
      const to = await emailFor(userId, emails);
      if (!to || list.length === 0) continue;
      const { data: owned } = await supabase
        .from('collection_items')
        .select('issue_id')
        .eq('user_id', userId)
        .eq('state', 'own')
        .in('issue_id', [...titleOf.keys()]);
      const ownedByTitle = new Map<string, number>();
      for (const o of owned ?? []) {
        const t = titleOf.get(o.issue_id);
        if (t) ownedByTitle.set(t, (ownedByTitle.get(t) ?? 0) + 1);
      }
      const email = newIssueEmail(
        list.map((i) => ({
          titleName: i.titleName,
          issueLabel: i.issueLabel,
          dateLabel: i.dateLabel,
          coverUrl: i.coverUrl,
          owned: ownedByTitle.get(i.titleId) ?? 0,
          total: totals.get(i.titleId) ?? 1,
          shopsUrl: canonical(`/titles/${i.titleSlug}#stockists`),
          unfollowUrl: `${canonical('/api/collect/unfollow')}?t=${encodeURIComponent(
            makeToken('unfollow', `${userId}:${i.titleId}`, 365)
          )}`,
        })),
        { logo: canonical('/neesh-logo.png'), settings: canonical('/collect/settings') }
      );
      await sendEmail({ to, subject: email.subject, text: email.text, html: email.html, throttle: false });
      // This event is what stops a re-run from sending the same email.
      const logged = await supabase.from('collection_events').insert(
        list.map((i) => ({
          user_id: userId,
          event_type: 'alert_sent',
          title_id: i.titleId,
          issue_id: i.issueId,
          surface: 'new_issue_email',
        }))
      );
      if (logged.error) throw new QueryError(`alert_sent insert: ${logged.error.message}`);
      newIssueEmails++;
    }
    // Only a complete pass marks the issues done; otherwise the next run
    // finishes the job, skipping readers already emailed.
    if (!unfinished) {
      must(
        await supabase
          .from('directory_issues')
          .update({ followers_notified_at: new Date().toISOString() })
          .in(
            'id',
            issues.map((i) => i.issueId)
          ),
        'mark notified'
      );
    }
  }

  // 2. Availability alerts for requested issues.
  const today = new Date().toISOString().slice(0, 10);
  const records = must(
    await supabase
      .from('directory_issue_availability')
      .select(
        'id, issue_id, level, observed_on, store:directory_stores!inner(id, name, slug), issue:directory_issues!inner(issue_label, title:directory_titles!inner(id, name, slug, collect_pilot))'
      )
      .is('alerts_sent_at', null)
      .gte('expires_on', today)
      .gte('created_at', since),
    'availability records'
  );

  for (const r of records as unknown as {
    id: string;
    issue_id: string;
    level: 'reported' | 'confirmed';
    observed_on: string;
    store: { id: string; name: string; slug: string };
    issue: { issue_label: string; title: { id: string; name: string; slug: string; collect_pilot: boolean } };
  }[]) {
    if (outOfTime()) {
      unfinished = true;
      break;
    }
    if (r.issue.title.collect_pilot) {
      // Fulfilled requests drop out here, so a re-run never repeats a send.
      const requests = must(
        await supabase
          .from('availability_requests')
          .select('user_id')
          .eq('issue_id', r.issue_id)
          .is('fulfilled_at', null)
          .is('cancelled_at', null),
        'availability requests'
      );
      const date = new Date(`${r.observed_on}T00:00:00Z`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
      });
      const status =
        r.level === 'confirmed'
          ? `In stock as of ${date}`
          : `Stocked ${r.issue.issue_label} as of ${date}`;
      for (const req of requests as { user_id: string }[]) {
        const to = await emailFor(req.user_id, emails);
        if (!to) continue;
        const text =
          `${r.issue.title.name} ${r.issue.issue_label} has turned up at ${r.store.name}. ${status}.\n\n` +
          `${canonical(`/stores/${r.store.slug}`)}\n\n` +
          `Shops sell out, so call ahead if you're making a trip.\n\n${SETTINGS_LINE}`;
        await sendEmail({
          to,
          subject: `${r.issue.title.name} ${r.issue.issue_label} is at ${r.store.name}`,
          text,
          html: emailHtml(text),
          throttle: false,
        });
        must(
          await supabase
            .from('availability_requests')
            .update({ fulfilled_at: new Date().toISOString() })
            .eq('user_id', req.user_id)
            .eq('issue_id', r.issue_id),
          'fulfil request'
        );
        await supabase.from('collection_events').insert({
          user_id: req.user_id,
          event_type: 'alert_sent',
          title_id: r.issue.title.id,
          issue_id: r.issue_id,
          store_id: r.store.id,
          surface: 'availability_email',
        });
        alertEmails++;
      }
    }
    must(
      await supabase
        .from('directory_issue_availability')
        .update({ alerts_sent_at: new Date().toISOString() })
        .eq('id', r.id),
      'mark record alerted'
    );
  }

  log(unfinished ? 'warn' : 'info', 'collect_notify.done', { newIssueEmails, alertEmails, unfinished });
  return NextResponse.json({ ok: true, newIssueEmails, alertEmails, unfinished });
}
