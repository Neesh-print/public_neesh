// Claim approval in one command: npm run approve -- {publisher-slug}
// Flips claimed = true on the publisher, resolves the pending claim, and
// sends the approval email (handoff 5.2 replacement body for email 1.2).
// Manual send chosen over a DB trigger, per handoff 5.3, at v1 claim volume.
import { loadEnv, scriptServiceClient } from './lib';

loadEnv();

async function sendApprovalEmail(
  to: string,
  name: string | null,
  titleName: string,
  pageUrl: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY unset. Send email 1.2 by hand to', to);
    return;
  }
  const body =
    `Hi ${name ?? ''},\n\n`.replace(' ,', ',') +
    `**${titleName}** is now yours on Neesh. The page shows as verified by the ` +
    `publisher, and we'll send you a monthly note on who's looking at it and ` +
    `where they are.\n\n` +
    `**See your page:** ${pageUrl}\n\n` +
    `Two things that help us right now. Reply with your wholesale terms and ` +
    `we'll get them on the page. And tell us what back issues you're sitting ` +
    `on, because we move a lot of back stock into spaces where nobody's ` +
    `chasing the newest issue.\n\n` +
    `We take 10 percent of wholesale when you sell through Neesh. Free to ` +
    `list, free to sell.\n\n` +
    `Questions? Just reply.`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM ?? 'Neesh <hi@neesh.art>',
      to,
      reply_to: process.env.NOTIFY_REPLY_TO ?? 'hi@neesh.art',
      subject: `${titleName} is yours`,
      text: body.replace(/\*\*/g, ''),
    }),
  });
  console.log(res.ok ? `approval email sent to ${to}` : `email failed with ${res.status}`);
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: npm run approve -- {publisher-slug}');
    process.exit(1);
  }
  const supabase = scriptServiceClient();

  const { data: publisher } = await supabase
    .from('directory_publishers')
    .select('id, name, slug, claimed')
    .eq('slug', slug)
    .maybeSingle();
  if (!publisher) {
    console.error(`No publisher with slug "${slug}".`);
    process.exit(1);
  }

  const { data: claim } = await supabase
    .from('directory_claims')
    .select('id, email, name')
    .eq('publisher_id', publisher.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!claim) {
    console.error(`No pending claim for ${publisher.name}.`);
    process.exit(1);
  }

  await supabase
    .from('directory_publishers')
    .update({
      claimed: true,
      claimed_at: new Date().toISOString(),
      claimed_email: claim.email,
      claim_method: 'manual',
    })
    .eq('id', publisher.id);
  await supabase
    .from('directory_claims')
    .update({ status: 'approved', resolved_at: new Date().toISOString() })
    .eq('id', claim.id);

  const { data: title } = await supabase
    .from('directory_titles')
    .select('name, slug')
    .eq('publisher_id', publisher.id)
    .eq('removed', false)
    .in('status', ['active', 'dormant'])
    .order('name')
    .limit(1)
    .maybeSingle();

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://neesh.art').replace(/\/$/, '');
  const pageUrl = title
    ? `${site}/titles/${title.slug}`
    : `${site}/publishers/${publisher.slug}`;

  console.log(`approved: ${publisher.name}, claimed by ${claim.email}`);
  await sendApprovalEmail(claim.email, claim.name, title?.name ?? publisher.name, pageUrl);
  console.log('Remember to hit /api/revalidate so the claimed badge renders.');
}

main();
