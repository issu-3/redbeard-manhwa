import { APP_URL } from '@/lib/constants';

export const revalidate = 3600;

export async function GET() {
  const baseUrl = APP_URL || 'https://redbeard.store';
  
  const sitemaps = [
    `${baseUrl}/sitemap-feed/sitemap/static.xml`,
    `${baseUrl}/sitemap-feed/sitemap/series.xml`,
    `${baseUrl}/sitemap-feed/sitemap/chapters.xml`,
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemaps
    .map(
      (url) => `
  <sitemap>
    <loc>${url}</loc>
  </sitemap>`
    )
    .join('')}
</sitemapindex>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
