import type { MetadataRoute } from 'next';

const SITE = 'https://hifz.uz';

// Tells search engines which pages they may list. Private areas stay out.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/profile', '/auth/', '/api/'] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
