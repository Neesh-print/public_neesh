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

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: npm run remove -- {slug}');
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
    return;
  }

  console.error(`No title or publisher with slug "${slug}".`);
  process.exit(1);
}

main();
