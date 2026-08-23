// Same-day removal in one command (spec 9): npm run remove -- {slug}
// Flags the row (title, or publisher which cascades through the visibility
// predicate), deletes cover objects, and revalidates. Rows are flagged, not
// deleted, so signal history and the audit trail survive.
import { loadEnv, scriptServiceClient } from './lib';

loadEnv();

async function revalidateAll(): Promise<void> {
  const url = process.env.REVALIDATE_URL;
  const token = process.env.REVALIDATE_TOKEN;
  if (!url || !token) {
    console.log('REVALIDATE_URL or REVALIDATE_TOKEN unset. Hit /api/revalidate by hand.');
    return;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(res.ok ? 'revalidated' : `revalidate failed with ${res.status}`);
  } catch (err) {
    console.error('revalidate request failed', err);
  }
}

// Email 1.6, removal confirmed. Sent when an address is passed:
// npm run remove -- {slug} {requester-email}
async function sendRemovalEmail(to: string, titleName: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY unset. Send the removal confirmation by hand to', to);
    return;
  }
  const body =
    `Hi,\n\n` +
    `${titleName} is off Neesh. The page is gone and it won't appear in the ` +
    `index or in search.\n\n` +
    `If you change your mind, reply and we'll put it back the same day.\n\n` +
    `Thanks for letting us know.`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM ?? 'Neesh <hi@neesh.art>',
      to,
      reply_to: process.env.NOTIFY_REPLY_TO ?? 'hi@neesh.art',
      subject: `${titleName} has been removed from Neesh`,
      text: body,
    }),
  });
  console.log(res.ok ? `removal email sent to ${to}` : `email failed with ${res.status}`);
}

async function main() {
  const slug = process.argv[2];
  const requesterEmail = process.argv[3];
  if (!slug) {
    console.error('Usage: npm run remove -- {slug} [requester-email]');
    process.exit(1);
  }
  const supabase = scriptServiceClient();

  const { data: title } = await supabase
    .from('directory_titles')
    .select('id, slug, name')
    .eq('slug', slug)
    .maybeSingle();

  if (title) {
    await supabase.from('directory_titles').update({ removed: true }).eq('id', title.id);
    await supabase.storage.from('covers').remove([`${title.slug}.jpg`]);
    console.log(`removed title ${title.name} (/titles/${title.slug})`);
    await revalidateAll();
    if (requesterEmail) await sendRemovalEmail(requesterEmail, title.name);
    return;
  }

  const { data: publisher } = await supabase
    .from('directory_publishers')
    .select('id, slug, name')
    .eq('slug', slug)
    .maybeSingle();

  if (publisher) {
    await supabase
      .from('directory_publishers')
      .update({ removed: true })
      .eq('id', publisher.id);
    const { data: titles } = await supabase
      .from('directory_titles')
      .select('slug')
      .eq('publisher_id', publisher.id);
    if (titles && titles.length > 0) {
      await supabase.storage.from('covers').remove(titles.map((t) => `${t.slug}.jpg`));
    }
    console.log(
      `removed publisher ${publisher.name} and took ${titles?.length ?? 0} title page(s) offline`
    );
    await revalidateAll();
    if (requesterEmail) await sendRemovalEmail(requesterEmail, publisher.name);
    return;
  }

  console.error(`No title or publisher with slug "${slug}".`);
  process.exit(1);
}

main();
