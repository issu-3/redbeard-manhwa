import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { APP_URL } from '@/lib/constants';

// Cache sitemap for 24 hours
export const revalidate = 86400;

const CHAPTERS_PER_SITEMAP = 10000;

/**
 * Generate sitemap index entries.
 * ID 0 = static + genres
 * ID 1 = all series
 * ID 2+ = chapters (paginated at 10k each)
 */
export async function generateSitemaps() {
  const chapterCount = await prisma.chapter.count({
    where: { isPublished: true },
  });

  const chapterSitemapCount = Math.max(1, Math.ceil(chapterCount / CHAPTERS_PER_SITEMAP));

  const ids: { id: string }[] = [
    { id: 'static' },
    { id: 'series' },
  ];

  for (let i = 0; i < chapterSitemapCount; i++) {
    ids.push({ id: `chapters-${i}` });
  }

  return ids;
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;
  const baseUrl = APP_URL || 'http://localhost:3000';

  // ── Static pages + Genres ──
  if (id === 'static') {
    const genres = await prisma.genre.findMany({
      select: { slug: true },
    });

    const staticRoutes: MetadataRoute.Sitemap = [
      { url: baseUrl, changeFrequency: 'daily', priority: 1.0 },
      { url: `${baseUrl}/browse/trending`, changeFrequency: 'hourly', priority: 0.9 },
      { url: `${baseUrl}/browse/popular`, changeFrequency: 'daily', priority: 0.9 },
      { url: `${baseUrl}/browse/latest`, changeFrequency: 'hourly', priority: 0.9 },
      { url: `${baseUrl}/browse/ongoing`, changeFrequency: 'daily', priority: 0.8 },
      { url: `${baseUrl}/browse/new-releases`, changeFrequency: 'daily', priority: 0.8 },
      { url: `${baseUrl}/browse/completed`, changeFrequency: 'daily', priority: 0.8 },
      { url: `${baseUrl}/browse/genres`, changeFrequency: 'weekly', priority: 0.8 },
      { url: `${baseUrl}/search`, changeFrequency: 'weekly', priority: 0.6 },
    ];

    const genreRoutes: MetadataRoute.Sitemap = genres
      .filter((g) => g.slug && g.slug.trim())
      .map((g) => ({
        url: `${baseUrl}/browse/genres/${g.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));

    return [...staticRoutes, ...genreRoutes];
  }

  // ── All Series ──
  if (id === 'series') {
    const series = await prisma.series.findMany({
      select: { slug: true, updatedAt: true },
    });

    return series
      .filter((s) => s.slug && s.slug.trim())
      .map((s) => ({
        url: `${baseUrl}/series/${s.slug}`,
        lastModified: s.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }));
  }

  // ── Chapters (paginated) ──
  if (id.startsWith('chapters-')) {
    const pageIndex = parseInt(id.replace('chapters-', ''), 10);

    const chapters = await prisma.chapter.findMany({
      where: { isPublished: true },
      select: {
        slug: true,
        updatedAt: true,
        series: {
          select: { slug: true },
        },
      },
      orderBy: { publishedAt: 'desc' },
      skip: pageIndex * CHAPTERS_PER_SITEMAP,
      take: CHAPTERS_PER_SITEMAP,
    });

    return chapters
      .filter((c) => c.slug && c.slug.trim() && c.series.slug)
      .map((c) => ({
        url: `${baseUrl}/series/${c.series.slug}/chapter/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      }));
  }

  return [];
}
