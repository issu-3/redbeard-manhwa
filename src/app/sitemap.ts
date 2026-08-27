import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { APP_URL } from '@/lib/constants';
import { unstable_cache } from 'next/cache';

// OPT-11: Cache the heavy sitemap DB queries.
export const revalidate = 86400; // Cache sitemap for 24 hours at the Edge

const getCachedSitemapData = async () => {
    const [series, genres] = await Promise.all([
        prisma.series.findMany({ select: { slug: true, updatedAt: true } }),
        prisma.genre.findMany({ select: { slug: true } }),
      ]);
    return { series, genres };
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = APP_URL || 'http://localhost:3000';

  try {
    const { series, genres } = await getCachedSitemapData();

    let staticRoutes: MetadataRoute.Sitemap = [];
    let seriesRoutes: MetadataRoute.Sitemap = [];
    let genreRoutes: MetadataRoute.Sitemap = [];

    staticRoutes = [
        { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
        { url: `${baseUrl}/browse/trending`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
        { url: `${baseUrl}/browse/popular`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        { url: `${baseUrl}/browse/latest`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
        { url: `${baseUrl}/browse/ongoing`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
        { url: `${baseUrl}/browse/new-releases`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
        { url: `${baseUrl}/browse/completed`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
        { url: `${baseUrl}/browse/genres`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
      ];

      seriesRoutes = series.map((s) => ({
        url: `${baseUrl}/series/${s.slug}`,
        lastModified: s.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }));

      genreRoutes = genres.map((g) => ({
        url: `${baseUrl}/browse/genres/${g.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    return [...staticRoutes, ...seriesRoutes, ...genreRoutes];
  } catch (error) {
    console.error(`Failed to generate dynamic sitemap routes:`, error);
    return [];
  }
}
