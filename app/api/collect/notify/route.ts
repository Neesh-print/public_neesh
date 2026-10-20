import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { emailHtml, sendEmail } from '@/lib/notify';
import { canonical } from '@/lib/seo';
import { coverPublicUrl } from '@/lib/supabase';
import { newIssueEmail } from '@/emails/newIssue';
import { issueDate } from '@/lib/collect/shared';
import { makeToken } from '@/lib/collect/tokens';

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

const FRESH_DAYS = 14;

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
  const supabase = serviceClient();
  const since = new Date(Date.now() - FRESH_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const emails = new Map<string, string | null>();
  let newIssueEmails = 0;
  let alertEmails = 0;

  // 1. New issues on pilot titles.
  const { data: fresh } = await supabase
    .from('directory_issues')
    .select(
      'id, issue_label, published_on, published_year, cover_image_path, title:directory_titles!inner(id, name, slug, collect_pilot, cover_image_path)'
    )
    .eq('review_status', 'approved')
    .eq('removed', false)
    .is('merged_into', null)
    .is('followers_notified_at', null)
    .gte('created_at', since)
    .eq('directory_titles.collect_pilot', true);

  const issues = ((fresh ?? []) as unknown as {
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
    const { data: follows } = await supabase
      .from('collector_titles')
      .select('user_id, title_id, collector:collectors!inner(notify_new_issues)')
      .in('title_id', titleIds)
      .eq('following', true)
      .eq('collectors.notify_new_issues', true);

    const byReader = new Map<string, Followed[]>();
    for (const f of (follows ?? []) as { user_id: string; title_id: string }[]) {
      const list = byReader.get(f.user_id) ?? [];
      list.push(...issues.filter((i) => i.titleId === f.title_id));
      byReader.set(f.user_id, list);
    }

    // Issue totals per title, for "You own 4 of its 5 issues."
    const { data: allIssues } = await supabase
      .from('directory_issues')
      .select('id, title_id')
      .in('title_id', titleIds)
      .eq('removed', false)
      .is('merged_into', null)
      .neq('review_status', 'rejected');
    const totals = new Map<string, number>();
    const titleOf = new Map<string, string>();
    for (const i of allIssues ?? []) {
      totals.set(i.title_id, (totals.get(i.title_id) ?? 0) + 1);
      titleOf.set(i.id, i.title_id);
    }

    for (const [userId, list] of byReader) {
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
      await sendEmail({ to, subject: email.subject, text: email.text, html: email.html });
      await supabase.from('collection_events').insert(
        list.map((i) => ({
          user_id: userId,
          event_type: 'alert_sent',
          title_id: i.titleId,
          issue_id: i.issueId,
          surface: 'new_issue_email',
        }))
      );
      newIssueEmails++;
    }
    await supabase
      .from('directory_issues')
      .update({ followers_notified_at: new Date().toISOString() })
      .in(
        'id',
        issues.map((i) => i.issueId)
      );
  }

  // 2. Availability alerts for requested issues.
  const today = new Date().toISOString().slice(0, 10);
  const { data: records } = await supabase
    .from('directory_issue_availability')
    .select(
      'id, issue_id, level, observed_on, store:directory_stores!inner(id, name, slug), issue:directory_issues!inner(issue_label, title:directory_titles!inner(id, name, slug, collect_pilot))'
    )
    .is('alerts_sent_at', null)
    .gte('expires_on', today)
    .gte('created_at', since);

  for (const r of (records ?? []) as unknown as {
    id: string;
    issue_id: string;
    level: 'reported' | 'confirmed';
    observed_on: string;
    store: { id: string; name: string; slug: string };
    issue: { issue_label: string; title: { id: string; name: string; slug: string; collect_pilot: boolean } };
  }[]) {
    if (r.issue.title.collect_pilot) {
      const { data: requests } = await supabase
        .from('availability_requests')
        .select('user_id')
        .eq('issue_id', r.issue_id)
        .is('fulfilled_at', null)
        .is('cancelled_at', null);
      const date = new Date(`${r.observed_on}T00:00:00Z`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
      });
      const status =
        r.level === 'confirmed'
          ? `In stock as of ${date}`
          : `Stocked ${r.issue.issue_label} as of ${date}`;
      for (const req of (requests ?? []) as { user_id: string }[]) {
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
        });
        await supabase
          .from('availability_requests')
          .update({ fulfilled_at: new Date().toISOString() })
          .eq('user_id', req.user_id)
          .eq('issue_id', r.issue_id);
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
    await supabase
      .from('directory_issue_availability')
      .update({ alerts_sent_at: new Date().toISOString() })
      .eq('id', r.id);
  }

  return NextResponse.json({ ok: true, newIssueEmails, alertEmails });
}
