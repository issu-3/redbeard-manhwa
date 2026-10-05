import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { APP_URL } from '@/lib/constants';

// Cache sitemap for 24 hours
export const revalidate = 86400;

/**
 * Generate sitemap index entries.
 * ID 0 = static + genres
 * ID 1 = all series
 */
export async function generateSitemaps() {
  return [
    { id: 'static' },
    { id: 'series' },
    { id: 'chapters' },
  ];
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;
  const baseUrl = APP_URL || 'https://redbeard.store';

  try {
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
          priority: 0.9,
        }));
    }

    // ── Chapters ──
    if (id === 'chapters') {
      const chapters = await prisma.chapter.findMany({
        where: { isPublished: true },
        select: { slug: true, number: true, updatedAt: true, series: { select: { slug: true } } },
      });

      return chapters
        .filter((c) => c.series?.slug && (c.slug || c.number != null))
        .map((c) => {
          const cSlug = c.slug?.trim() ? c.slug : String(c.number);
          return {
            url: `${baseUrl}/series/${c.series.slug}/chapter/${cSlug}`,
            lastModified: c.updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.8,
          };
        });
    }
  } catch (error) {
    console.error(`Failed to generate sitemap for id ${id}:`, error);
  }

  return [];
}
