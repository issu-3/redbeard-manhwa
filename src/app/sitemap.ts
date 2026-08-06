import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { APP_URL } from '@/lib/constants';
import { unstable_cache } from 'next/cache';

// OPT-11: Cache the heavy sitemap DB queries (up to 50k chapter rows with JOINs).
// Crawlers don't need real-time data — a 1-hour cache is fine.
const getCachedSitemapData = unstable_cache(
  async () => {
    const [series, genres, chapters] = await Promise.all([
      prisma.series.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.genre.findMany({ select: { slug: true } }),
      prisma.chapter.findMany({ 
        where: { isPublished: true },
        select: { slug: true, updatedAt: true, series: { select: { slug: true } } },
        take: 50000,
        orderBy: { updatedAt: 'desc' }
      }),
    ]);
    return { series, genres, chapters };
  },
  ['sitemap-data'],
  { tags: ['series', 'chapters'], revalidate: 3600 }
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = APP_URL || 'http://localhost:3000';

  try {
    const { series, genres, chapters } = await getCachedSitemapData();

    const staticRoutes: MetadataRoute.Sitemap = [
        { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
        { url: `${baseUrl}/browse/trending`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
        { url: `${baseUrl}/browse/popular`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        { url: `${baseUrl}/browse/latest`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
        { url: `${baseUrl}/browse/completed`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
        { url: `${baseUrl}/browse/genres`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
      ];

      const seriesRoutes = series.map((s) => ({
        url: `${baseUrl}/series/${s.slug}`,
        lastModified: s.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }));

      const genreRoutes = genres.map((g) => ({
        url: `${baseUrl}/browse/genres/${g.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));

    const chapterRoutes = chapters.map((c) => ({
      url: `${baseUrl}/series/${c.series.slug}/chapter/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'never' as const,
      priority: 0.6,
    }));

    return [...staticRoutes, ...seriesRoutes, ...genreRoutes, ...chapterRoutes];
  } catch (error) {
    console.error('Failed to generate dynamic sitemap routes:', error);
    return [];
  }
}
