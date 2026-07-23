import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { APP_URL } from '@/lib/constants';

export async function generateSitemaps() {
  try {
    const chapterCount = await prisma.chapter.count({ where: { isPublished: true } });
    const numSitemaps = Math.max(1, Math.ceil(chapterCount / 20000));
    return Array.from({ length: numSitemaps }, (_, i) => ({ id: i }));
  } catch (error) {
    return [{ id: 0 }];
  }
}

export default async function sitemap(props: { id: Promise<string> } | { id: string }): Promise<MetadataRoute.Sitemap> {
  const baseUrl = APP_URL || 'http://localhost:3000';
  const PAGE_SIZE = 20000;

  try {
    const routes: MetadataRoute.Sitemap = [];

    let parsedId = 0;
    if (props.id) {
      // In Next.js 16+, id might be a Promise. In <16, it might be a string or number
      const resolvedId = props.id instanceof Promise ? await props.id : props.id;
      parsedId = Number(resolvedId) || 0;
    }

    // Only include static, series, and genres in the first sitemap
    if (parsedId === 0) {
      const staticRoutes: MetadataRoute.Sitemap = [
        { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
        { url: `${baseUrl}/browse/trending`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
        { url: `${baseUrl}/browse/popular`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        { url: `${baseUrl}/browse/latest`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
        { url: `${baseUrl}/browse/completed`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
        { url: `${baseUrl}/browse/genres`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
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

      routes.push(...staticRoutes, ...seriesRoutes, ...genreRoutes);
    }



    // Paginate chapters across sitemaps
    const chapters = await prisma.chapter.findMany({ 
      where: { isPublished: true },
      select: { slug: true, updatedAt: true, series: { select: { slug: true } } },
      skip: parsedId * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { updatedAt: 'desc' }
    });
    
    const chapterRoutes = chapters.map((c) => ({
      url: `${baseUrl}/series/${c.series.slug}/chapter/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'never' as const,
      priority: 0.6,
    }));

    routes.push(...chapterRoutes);

    return routes;
  } catch (error) {
    console.error('Failed to generate dynamic sitemap routes:', error);
    return [];
  }
}
