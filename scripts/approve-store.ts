// Store claim approval in one command: npm run approve-store -- {store-slug} [domain|manual]
// Marks the store claimed, resolves the pending claim, links the claimant's
// Neesh retailer account when one exists with the same email, sends the
// welcome email with "Pitch next" titles, and revalidates the store page.
import { loadEnv, scriptServiceClient } from './lib';

loadEnv();

const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://neesh.art').replace(/\/$/, '');

async function sendWelcomeEmail(
  to: string,
  name: string | null,
  storeName: string,
  pageUrl: string,
  pitch: { title_name: string; title_slug: string; shops: number }[]
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const pitchLines = pitch.length
    ? `\n\n**Pitch next.** Spaces with a shelf like yours also carry these, and you ` +
      `can order them wholesale on Neesh:\n\n` +
      pitch.map((p) => `- ${p.title_name}: ${site}/titles/${p.title_slug}`).join('\n')
    : '';
  const body =
    `Hi${name ? ` ${name}` : ''},\n\n` +
    `**${storeName}** is now yours on the Neesh Index.\n\n` +
    `**Your page:** ${pageUrl}\n\n` +
    `Reply with your address, opening hours, Instagram and a line or two about ` +
    `the shop, and we'll put them on the page. If a title on your shelf is ` +
    `wrong or missing, tell us and we'll fix it.` +
    pitchLines +
    `\n\nQuestions? Just reply.`;
  if (!apiKey) {
    console.log(`RESEND_API_KEY unset. Send this by hand to ${to}:\n\n${body.replace(/\*\*/g, '')}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM ?? 'Neesh <hi@neesh.art>',
      to,
      reply_to: process.env.NOTIFY_REPLY_TO ?? 'hi@neesh.art',
      subject: `${storeName} is yours on Neesh`,
      text: body.replace(/\*\*/g, ''),
    }),
  });
  console.log(res.ok ? `welcome email sent to ${to}` : `email failed with ${res.status}`);
}

async function revalidate(paths: string[]): Promise<void> {
  const token = process.env.REVALIDATE_TOKEN;
  if (!token) {
    console.log(`REVALIDATE_TOKEN unset. Revalidate ${paths.join(', ')} so the claimed badge renders.`);
    return;
  }
  const res = await fetch(`${site}/api/revalidate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths }),
  });
  console.log(res.ok ? `revalidated ${paths.join(', ')}` : `revalidate failed with ${res.status}`);
}

async function main() {
  const slug = process.argv[2];
  const method = process.argv[3] === 'domain' ? 'domain' : 'manual';
  if (!slug) {
    console.error('Usage: npm run approve-store -- {store-slug} [domain|manual]');
    process.exit(1);
  }
  const supabase = scriptServiceClient();

  const { data: store } = await supabase
    .from('directory_stores')
    .select('id, slug, name, website')
    .eq('slug', slug)
    .maybeSingle();
  if (!store) {
    console.error(`No store with slug "${slug}".`);
    process.exit(1);
  }

  const { data: claim } = await supabase
    .from('directory_store_claims')
    .select('id, email, name, website')
    .eq('store_id', store.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!claim) {
    console.error(`No pending claim for ${store.name}.`);
    process.exit(1);
  }

  // Link the space's Neesh account when one exists for the same email.
  const { data: retailer } = await supabase
    .from('retailers')
    .select('id, shop_name')
    .ilike('contact_email', claim.email)
    .limit(1)
    .maybeSingle();

  const now = new Date().toISOString();
  await supabase
    .from('directory_stores')
    .update({
      claimed: true,
      claimed_at: now,
      ...(store.website || !claim.website ? {} : { website: claim.website }),
    })
    .eq('id', store.id);
  await supabase
    .from('directory_store_claims')
    .update({
      status: 'approved',
      claim_method: method,
      retailer_id: retailer?.id ?? null,
      resolved_at: now,
    })
    .eq('id', claim.id);

  console.log(
    `approved: ${store.name}, claimed by ${claim.email}` +
      (retailer ? `, linked to retailer ${retailer.shop_name}` : ', no Neesh retailer account yet')
  );

  const { data: pitch } = await supabase.rpc('directory_store_pitch_next', {
    p_store_id: store.id,
    p_limit: 5,
  });
  await sendWelcomeEmail(claim.email, claim.name, store.name, `${site}/stores/${store.slug}`, pitch ?? []);
  await revalidate([`/stores/${store.slug}`]);
}

main();
