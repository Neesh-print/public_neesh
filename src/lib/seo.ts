import type { Publisher, Tag, TitleFull, TitleWithPublisher } from './types';
import { coverPublicUrl } from './supabase';

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://neesh.art').replace(/\/$/, '');
}

export function canonical(path: string): string {
  return `${siteUrl()}${path}`;
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export function countryName(code: string | null): string | null {
  if (!code) return null;
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  bimonthly: 'Every two months',
  quarterly: 'Quarterly',
  triannual: 'Three times a year',
  biannual: 'Twice a year',
  annual: 'Annual',
  irregular: 'Irregular',
  evergreen: 'Evergreen',
};

// Prose form of a niche name for headings and sentences: "Food & Drink"
// reads as "food and drink".
export function nicheProse(name: string): string {
  return name.toLowerCase().replace(/ & /g, ' and ');
}

export function placeLabel(city: string | null, country: string | null): string | null {
  const c = countryName(country);
  if (city && c) return `${city}, ${c}`;
  return city ?? c;
}

// Profile title pattern (spec 6.1). Falls back gracefully when a title has no
// tag or no location yet.
export function titleMetaTitle(title: TitleFull): string {
  const niche = title.tags[0]?.name.toLowerCase();
  const from = title.city ?? countryName(title.country);
  const middle = [
    'Independent',
    niche,
    'magazine',
    from ? `from ${from}` : null,
  ]
    .filter(Boolean)
    .join(' ');
  return `${title.name} | ${middle} | Neesh`;
}

export function titleMetaDescription(title: TitleFull): string {
  if (title.description) return title.description;
  const parts = [
    `${title.name} is an independent${title.tags[0] ? ` ${title.tags[0].name.toLowerCase()}` : ''} magazine`,
  ];
  const freq = title.frequency ? FREQUENCY_LABELS[title.frequency]?.toLowerCase() : null;
  const place = placeLabel(title.city, title.country);
  if (freq && title.frequency !== 'evergreen') parts.push(`published ${freq}`);
  if (place) parts.push(`in ${place}`);
  parts.push(`by ${title.publisher.name}.`);
  return parts.join(' ').replace(/ \./, '.');
}

export function ogImageForTitle(title: TitleWithPublisher, primaryTag?: Tag): string {
  const cover = coverPublicUrl(title.cover_image_path);
  if (cover) return cover;
  const params = new URLSearchParams({ title: title.name });
  const sub = [title.publisher.name, primaryTag?.name].filter(Boolean).join(' · ');
  if (sub) params.set('sub', sub);
  return `${siteUrl()}/api/og?${params.toString()}`;
}

// --- JSON-LD builders. All server-rendered into page markup (spec 1.5). ---

export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Neesh',
    url: siteUrl(),
    logo: `${siteUrl()}/neesh-logo.png`,
    sameAs: ['https://www.instagram.com/neeshprint/', 'https://instagram.com/neesh.art'],
  };
}

export function periodicalLd(title: TitleFull) {
  const cover = coverPublicUrl(title.cover_image_path);
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Periodical',
    name: title.name,
    url: canonical(`/titles/${title.slug}`),
    publisher: {
      '@type': 'Organization',
      name: title.publisher.name,
      url: canonical(`/publishers/${title.publisher.slug}`),
      ...(title.publisher.website ? { sameAs: [title.publisher.website] } : {}),
    },
  };
  if (title.description) ld.description = title.description;
  if (cover) ld.image = cover;
  const country = countryName(title.country);
  if (country) ld.countryOfOrigin = { '@type': 'Country', name: country };
  return ld;
}

export function itemListLd(tagName: string, tagSlug: string, titles: TitleWithPublisher[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Independent ${tagName.toLowerCase()} magazines`,
    url: canonical(`/magazines/${tagSlug}`),
    itemListElement: titles.slice(0, 50).map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      url: canonical(`/titles/${t.slug}`),
    })),
  };
}

// FAQPage markup for /faq and the FAQ blocks on /publishers and /spaces.
// These are the AEO surfaces (handoff 11).
export function faqPageLd(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: canonical(item.path),
    })),
  };
}
