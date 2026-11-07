import { APP_URL } from '@/lib/constants';
import { prisma } from '@/lib/prisma';

export const revalidate = 3600;

export async function GET() {
  const baseUrl = APP_URL || 'https://redbeard.store';
  
  let latestSeriesUpdatedAt: string | null = null;
  let latestChapterUpdatedAt: string | null = null;

  try {
    const [latestSeries, latestChapter] = await Promise.all([
      prisma.series.findFirst({
        where: { chapters: { some: { isPublished: true } } },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      prisma.chapter.findFirst({
        where: { isPublished: true, NOT: { sourceType: 'DOWNLOAD' } },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
    ]);

    if (latestSeries?.updatedAt) {
      latestSeriesUpdatedAt = latestSeries.updatedAt.toISOString();
    }
    if (latestChapter?.updatedAt) {
      latestChapterUpdatedAt = latestChapter.updatedAt.toISOString();
    }
  } catch (error) {
    console.error('Failed to query genuine sitemap lastmod timestamps from DB:', error);
  }

  const sitemaps = [
    {
      loc: `${baseUrl}/sitemap-feed/sitemap/static.xml`,
      lastmod: null, // Static pages omit lastmod rather than generating false request-time dates
    },
    {
      loc: `${baseUrl}/sitemap-feed/sitemap/series.xml`,
      lastmod: latestSeriesUpdatedAt,
    },
    {
      loc: `${baseUrl}/sitemap-feed/sitemap/chapters.xml`,
      lastmod: latestChapterUpdatedAt,
    },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemaps
    .map(
      (s) => `
  <sitemap>
    <loc>${s.loc}</loc>${s.lastmod ? `\n    <lastmod>${s.lastmod}</lastmod>` : ''}
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
