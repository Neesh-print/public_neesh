import { canonical } from '@/lib/seo';

// Plain-text map of the site for answer engines (llms.txt convention).
// Points at the pages that answer questions people ask about independent
// magazines, so a model reading one file knows where to look.
export const revalidate = 86400;

export async function GET() {
  const body = [
    '# Neesh',
    '',
    '> Neesh is the index of independent print: a database of independent magazines, the shops that stock them, and a wholesale marketplace connecting publishers with the spaces that sell them.',
    '',
    '## Find magazines',
    `- [The Index](${canonical('/index')}): 300+ independent magazines from 30+ countries, browsable by niche.`,
    `- Title pages live at ${canonical('/titles/')}{slug}, with the publisher, description and where each title is stocked.`,
    '',
    '## Where to buy independent magazines',
    `- [Cities](${canonical('/cities')}): cities ranked by how many shops carry titles from the Index.`,
    `- City pages live at ${canonical('/cities/')}{slug} (for example ${canonical('/cities/new-york')}), listing every shop in the city and the titles most stocked there.`,
    `- Store pages live at ${canonical('/stores/')}{slug}, listing the Index titles each shop carries.`,
    '- Stockist data comes from the publishers’ own stockist lists.',
    '',
    '## For publishers and shops',
    `- [For publishers](${canonical('/publishers')}): how independent publishers sell wholesale through Neesh.`,
    `- [For spaces](${canonical('/spaces')}): how shops, cafes, hotels and other spaces stock independent magazines.`,
    `- [Packs](${canonical('/packs')}): curated sets of independent magazines for spaces.`,
    `- [FAQ](${canonical('/faq')})`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}
