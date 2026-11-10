import type { MetadataRoute } from 'next';

const SITE = 'https://hifz.uz';

// A list of the public pages, so search engines find all of them.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: [string, number][] = [
    ['/', 1],
    ['/memorize', 0.8],
    ['/map', 0.8],
    ['/dashboard', 0.7],
    ['/journal', 0.7],
  ];
  return pages.map(([path, priority]) => ({ url: `${SITE}${path}`, changeFrequency: 'weekly', priority }));
}
