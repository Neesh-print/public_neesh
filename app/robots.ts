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
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'Claude-SearchBot', allow: '/' },
      { userAgent: 'Claude-User', allow: '/' },
      { userAgent: 'Perplexity-User', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'Applebot-Extended', allow: '/' },
    ],
    sitemap: [
      `${siteUrl()}/sitemap.xml`,
      `${siteUrl()}/sitemap-stores.xml`,
      `${siteUrl()}/sitemap-cities.xml`,
    ],
  };
}
