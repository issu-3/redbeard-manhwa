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

// Abstracted cache loader for performance
async function getHomepageData() {
  // 1. Fetch settings (very fast, single row queries)
  const settingsArray = await prisma.siteSetting.findMany({
    where: { key: { in: ['homepage_auto_genres', 'homepage_cache_interval'] } }
  });
  
  const settings = {
    auto_genres: true,
    cache_interval: 3600
  };
  
  for (const s of settingsArray) {
    if (s.key === 'homepage_auto_genres') settings.auto_genres = s.value === 'true';
    if (s.key === 'homepage_cache_interval') settings.cache_interval = parseInt(s.value) || 3600;
  }

  // 2. Define the cached function with the dynamic revalidate interval
  const fetchCached = unstable_cache(
    async () => {
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
              series = seriesIds.map(id => foundSeries.find(s => s.id === id)).filter(Boolean);
            } else {
              series = await prisma.series.findMany({ orderBy: { totalViews: 'desc' }, include: { genres: true }, take: sec.limit });
            }
          }
          else if (sec.type === 'POPULAR') {
            series = await prisma.series.findMany({ orderBy: { totalViews: 'desc' }, include: { genres: true }, take: sec.limit });
          }
          else if (sec.type === 'LATEST') {
            series = await prisma.series.findMany({
              orderBy: { updatedAt: 'desc' },
              include: { genres: true }, 
              take: sec.limit 
            });
          }
          else if (sec.type === 'NEW_RELEASES') {
            series = await prisma.series.findMany({ orderBy: { createdAt: 'desc' }, include: { genres: true }, take: sec.limit });
          }
          else if (sec.type === 'FEATURED') {
            series = await prisma.series.findMany({ where: { isFeatured: true }, include: { genres: true }, take: sec.limit });
          }
          else if (sec.type === 'COMPLETED') {
            series = await prisma.series.findMany({ where: { status: 'COMPLETED' }, orderBy: { updatedAt: 'desc' }, include: { genres: true }, take: sec.limit });
          }
          else if (sec.type === 'ONGOING') {
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

      // Genre Counts
      let formattedGenres: any[] = [];
      if (settings.auto_genres) {
        const allGenres = await prisma.genre.findMany({
          include: {
            _count: { select: { series: true } }
          },
          take: 20
        });

        formattedGenres = allGenres.map(g => ({
          name: g.name,
          slug: g.slug,
          icon: g.iconName || 'Hash',
          color: g.color || '#primary',
          seriesCount: g._count.series,
        }));
      } else {
        const allGenres = await prisma.genre.findMany({ take: 20 });
        formattedGenres = allGenres.map(g => ({
          name: g.name,
          slug: g.slug,
          icon: g.iconName || 'Hash',
          color: g.color || '#primary',
          seriesCount: g.seriesCount,
        }));
      }

      return { banners, sections, sectionData, formattedGenres };
    },
    ['homepage-data'],
    { revalidate: settings.cache_interval, tags: ['homepage_data'] }
  );

  return fetchCached();
}

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

