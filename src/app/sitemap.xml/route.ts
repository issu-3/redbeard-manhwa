import { prisma } from '@/lib/prisma';
import { APP_URL } from '@/lib/constants';

export const revalidate = 86400;

export async function GET() {
  const baseUrl = APP_URL || 'https://redbeard.store';
  
  let chapterSitemapCount = 1;
  const CHAPTERS_PER_SITEMAP = 10000;
  
  try {
    const chapterCount = await prisma.chapter.count({
      where: { isPublished: true },
    });
    chapterSitemapCount = Math.max(1, Math.ceil(chapterCount / CHAPTERS_PER_SITEMAP));
  } catch (error) {
    console.warn('Failed to count chapters for sitemap:', error);
  }

  const sitemaps = [
    `${baseUrl}/sitemap-feed/sitemap/static.xml`,
    `${baseUrl}/sitemap-feed/sitemap/series.xml`,
  ];

  for (let i = 0; i < chapterSitemapCount; i++) {
    sitemaps.push(`${baseUrl}/sitemap-feed/sitemap/chapters-${i}.xml`);
  }

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
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate',
    },
  });
}
