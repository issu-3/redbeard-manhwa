import { Metadata } from 'next';
import { HomepageClient } from './homepage-client';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';
import { getSections } from '@/app/actions/admin/homepage';
import { unstable_cache } from 'next/cache';

export const metadata: Metadata = {
  title: 'REDBEARD — The Ultimate Reading Experience',
  description:
    'Discover and read the best manhwa, manga, and webtoons. Thousands of titles, premium reading experience, and a vibrant community.',
};

// Abstracted cache loader for performance (updates hourly unless revalidated)
const getHomepageData = unstable_cache(
  async () => {
    // We only fetch active sections here, but wait, `getSections` is from an action and might not be cached this way well if it has auth checks.
    // Instead we query prisma directly here for the cache layer.
    const sections = await prisma.homepageSection.findMany({ 
      where: { isActive: true }, 
      orderBy: { order: 'asc' } 
    }).catch(() => []);

    const banners = await prisma.heroBanner.findMany({ 
      where: { isActive: true }, 
      orderBy: { order: 'asc' } 
    }).catch(() => []);

    const sectionData: Record<string, any[]> = {};

    await Promise.all(sections.map(async (sec) => {
      let series: any[] = [];
      
      if (!sec.isManual) {
        if (sec.type === 'TRENDING') {
          // 1. Trending Today: most views in the last 24 hours
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
          
          // Prisma doesn't natively support easy GROUP BY with relations if we want the full Series object back in one query without raw SQL.
          // So we do a raw query or find the top IDs then fetch them.
          const topReads = await prisma.readingHistory.groupBy({
            by: ['seriesId'],
            where: { updatedAt: { gte: yesterday } },
            _count: { seriesId: true },
            orderBy: { _count: { seriesId: 'desc' } },
            take: sec.limit
          });

          if (topReads.length > 0) {
            const seriesIds = topReads.map(t => t.seriesId);
            const foundSeries = await prisma.series.findMany({
              where: { id: { in: seriesIds } },
              include: { genres: true }
            });
            // Re-order by the topReads count
            series = seriesIds.map(id => foundSeries.find(s => s.id === id)).filter(Boolean);
          } else {
            // Fallback to lifetime total views if no activity in last 24h
            series = await prisma.series.findMany({ orderBy: { totalViews: 'desc' }, include: { genres: true }, take: sec.limit });
          }
        }
        else if (sec.type === 'POPULAR') {
          // 2. Most Popular: Lifetime views
          series = await prisma.series.findMany({ orderBy: { totalViews: 'desc' }, include: { genres: true }, take: sec.limit });
        }
        else if (sec.type === 'LATEST') {
          // 3. Latest Updates: Latest chapter published most recently
          series = await prisma.series.findMany({
            // A common approach is Series.updatedAt, assuming we update Series.updatedAt when a chapter is published.
            orderBy: { updatedAt: 'desc' },
            include: { genres: true }, 
            take: sec.limit 
          });
        }
        else if (sec.type === 'NEW_RELEASES') {
          // 4. New Releases: Newest series added
          series = await prisma.series.findMany({ orderBy: { createdAt: 'desc' }, include: { genres: true }, take: sec.limit });
        }
        else if (sec.type === 'FEATURED') {
          series = await prisma.series.findMany({ where: { isFeatured: true }, include: { genres: true }, take: sec.limit });
        }
        else if (sec.type === 'COMPLETED') {
          // 5. Completed: Recently completed
          series = await prisma.series.findMany({ where: { status: 'COMPLETED' }, orderBy: { updatedAt: 'desc' }, include: { genres: true }, take: sec.limit });
        }
        else if (sec.type === 'ONGOING') {
          // 6. Ongoing
          series = await prisma.series.findMany({ where: { status: 'ONGOING' }, orderBy: { updatedAt: 'desc' }, include: { genres: true }, take: sec.limit });
        }
        else if (sec.type === 'TOP_RATED') {
          series = await prisma.series.findMany({ orderBy: { averageRating: 'desc' }, include: { genres: true }, take: sec.limit });
        }
      } else {
        // Manual queries
        if (sec.manualSeriesId.length > 0) {
          const manualSeries = await prisma.series.findMany({ where: { id: { in: sec.manualSeriesId } }, include: { genres: true } });
          series = sec.manualSeriesId.map(id => manualSeries.find(s => s.id === id)).filter(Boolean);
        }
      }
      
      // Editor's picks is inherently manual
      if (sec.type === 'EDITORS_PICKS') {
        if (sec.manualSeriesId.length > 0) {
          const editorSeries = await prisma.series.findMany({ where: { id: { in: sec.manualSeriesId } }, include: { genres: true } });
          series = sec.manualSeriesId.map(id => editorSeries.find(s => s.id === id)).filter(Boolean);
        } else {
          series = await prisma.series.findMany({ where: { isEditorChoice: true }, include: { genres: true }, take: sec.limit });
        }
      }

      sectionData[sec.type] = series.map(toSeriesCardData);
    }));

    // 7. Genre Counts - Calculate automatically via DB instead of stale seriesCount
    const allGenres = await prisma.genre.findMany({
      include: {
        _count: { select: { series: true } }
      },
      take: 20
    });

    const formattedGenres = allGenres.map(g => ({
      name: g.name,
      slug: g.slug,
      icon: g.iconName || 'Hash',
      color: g.color || '#primary',
      seriesCount: g._count.series,
    }));

    return { banners, sections, sectionData, formattedGenres };
  },
  ['homepage-data'],
  { revalidate: 3600, tags: ['homepage_data'] }
);

export default async function HomePage() {
  const { banners, sections, sectionData, formattedGenres } = await getHomepageData();

  return (
    <HomepageClient
      banners={banners}
      sections={sections}
      sectionData={sectionData}
      genres={formattedGenres}
    />
  );
}

