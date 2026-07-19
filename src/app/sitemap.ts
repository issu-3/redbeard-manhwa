import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { APP_URL } from '@/lib/constants';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = APP_URL || 'http://localhost:3000';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/browse/trending`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/browse/popular`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/browse/latest`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/browse/completed`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/browse/genres`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/dmca`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  const series = await prisma.series.findMany({ select: { slug: true, updatedAt: true } });
  const seriesRoutes = series.map((s) => ({
    url: `${baseUrl}/series/${s.slug}`,
    lastModified: s.updatedAt,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  const genres = await prisma.genre.findMany({ select: { slug: true } });
  const genreRoutes = genres.map((g) => ({
    url: `${baseUrl}/browse/genres/${g.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const chapters = await prisma.chapter.findMany({ 
    where: { isPublished: true },
    select: { number: true, updatedAt: true, series: { select: { slug: true } } },
    take: 10000,
    orderBy: { updatedAt: 'desc' }
  });
  const chapterRoutes = chapters.map((c) => ({
    url: `${baseUrl}/series/${c.series.slug}/chapter/${c.number}`,
    lastModified: c.updatedAt,
    changeFrequency: 'never' as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...seriesRoutes, ...genreRoutes, ...chapterRoutes];
}
