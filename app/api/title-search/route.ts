import { NextRequest, NextResponse } from 'next/server';
import { anonClient, coverPublicUrl, hasSupabaseEnv } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export interface TitleSearchResult {
  name: string;
  slug: string;
  frequency: string | null;
  country: string | null;
  publisher: string;
  claimed: boolean;
  niche: string | null;
  cover: string | null;
}

const SELECT =
  'name, slug, frequency, country, cover_image_path, publisher:directory_publishers!inner(name, claimed), directory_title_tags(tag:directory_tags(name))';

function escapeLike(value: string): string {
  return value.replace(/[%_]/g, '\\$&');
}

// Powers the auth-flow publisher search. Queries the same titles table the
// directory uses, subject to the visibility predicate (handoff section 7);
// the anon key enforces it via RLS on top of the explicit filters.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 120);
  if (!q || !hasSupabaseEnv) {
    return NextResponse.json({ exact: null, near: [] });
  }

  const client = anonClient();
  const base = () =>
    client
      .from('directory_titles')
      .select(SELECT)
      .eq('removed', false)
      .in('status', ['active', 'dormant'])
      .limit(8);

  const [byTitle, byPublisher] = await Promise.all([
    base().ilike('name', `%${escapeLike(q)}%`),
    base().ilike('directory_publishers.name', `%${escapeLike(q)}%`),
  ]);

  const seen = new Set<string>();
  const results: TitleSearchResult[] = [];
  for (const row of [...(byTitle.data ?? []), ...(byPublisher.data ?? [])]) {
    if (seen.has(row.slug)) continue;
    seen.add(row.slug);
    const publisher = row.publisher as unknown as { name: string; claimed: boolean };
    const tags = row.directory_title_tags as unknown as { tag: { name: string } }[];
    results.push({
      name: row.name,
      slug: row.slug,
      frequency: row.frequency,
      country: row.country,
      publisher: publisher?.name ?? '',
      claimed: Boolean(publisher?.claimed),
      niche: tags?.[0]?.tag?.name ?? null,
      cover: coverPublicUrl(row.cover_image_path as string | null),
    });
  }

  const exact = results.find((r) => r.name.toLowerCase() === q.toLowerCase()) ?? null;
  const near = results.filter((r) => r !== exact).slice(0, 5);
  return NextResponse.json({ exact, near });
}
