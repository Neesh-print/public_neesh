import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

// All crawlers welcome, answer-engine bots named explicitly (spec 6.3).
// Being crawled by answer engines is the point.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'CCBot', allow: '/' },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
