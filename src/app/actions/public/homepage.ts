'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData, SERIES_CARD_SELECT } from '@/lib/data-mappers';
import { unstable_cache } from 'next/cache';
import type { HomepageSection } from '@prisma/client';
import type { SeriesCardData } from '@/types';

export const getCachedHomepageSections = unstable_cache(
  async (): Promise<HomepageSection[]> => {
    try {
      const sections = await prisma.homepageSection.findMany({ orderBy: { order: 'asc' } });
      if (sections.length > 0) return sections;
    } catch (e) {
      console.warn('Database unreachable during section fetch');
    }
    return [
      { id: '1', type: 'HERO_BANNER', isActive: true, order: 0, limit: 10, isManual: false, title: null, subtitle: null, showViewAll: false, manualSeriesId: [] as string[] },
      { id: '2', type: 'CONTINUE_READING', isActive: true, order: 1, limit: 10, isManual: false, title: '📚 Continue Reading', subtitle: 'Pick up where you left off', showViewAll: true, manualSeriesId: [] as string[] },
      { id: '3', type: 'TRENDING', isActive: true, order: 2, limit: 10, isManual: false, title: '🔥 Trending', subtitle: 'Top 10 most viewed this week', showViewAll: true, manualSeriesId: [] as string[] },
      { id: '4', type: 'RECENTLY_UPDATED', isActive: true, order: 3, limit: 10, isManual: false, title: '🆕 Recently Updated', subtitle: 'Fresh chapters just dropped', showViewAll: true, manualSeriesId: [] as string[] },
      { id: '5', type: 'RECOMMENDED', isActive: true, order: 4, limit: 10, isManual: false, title: 'Recommended For You', subtitle: 'Based on your reading history', showViewAll: true, manualSeriesId: [] as string[] },
      { id: '6', type: 'FEATURED', isActive: true, order: 5, limit: 10, isManual: false, title: '⭐ Featured Series', subtitle: 'Handpicked by our staff', showViewAll: true, manualSeriesId: [] as string[] }
    ];
  },
  ['homepage-sections'],
  { tags: ['homepage', 'sections'], revalidate: 600 }
);

export const getCachedHeroBanners = unstable_cache(
  async () => {
    try {
      const banners = await prisma.heroBanner.findMany({ orderBy: { order: 'asc' } });
      return banners.map(b => ({
        id: b.id,
        title: b.title || '',
        slug: '#',
        coverImage: b.desktopImage,
        bannerImage: b.desktopImage,
        description: b.buttonText || '',
        genres: [],
        averageRating: 0,
        chapterCount: 0,
        totalViews: 0,
        status: 'ONGOING' as const
      }));
    } catch (e) {
      return [];
    }
  },
  ['homepage-hero-banners'],
  { tags: ['homepage', 'banners'], revalidate: 600 }
);

export const getCachedSectionSeries = async (type: string, limit: number, isManual: boolean, manualIds: string[]): Promise<any[]> => {
  return unstable_cache(
    async () => {
      try {
        const SAFE_SEARCH_FILTER = {};

        if (isManual && manualIds.length > 0) {
          const seriesList = await prisma.series.findMany({
            where: { id: { in: manualIds } },
            select: SERIES_CARD_SELECT
          });
          const seriesMap = new Map(seriesList.map(s => [s.id, s]));
          return manualIds.map(id => seriesMap.get(id)).filter(Boolean).map(s => toSeriesCardData(s as any));
        }

        if (type === 'TRENDING') {
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const topReads = await prisma.readingHistory.groupBy({
            by: ['seriesId'],
            where: { updatedAt: { gte: yesterday } },
            _count: { seriesId: true },
            orderBy: { _count: { seriesId: 'desc' } },
            take: limit
          });
          if (topReads.length > 0) {
            const seriesIds = topReads.map(t => t.seriesId);
            const foundSeries = await prisma.series.findMany({
              where: { id: { in: seriesIds } },
              select: SERIES_CARD_SELECT
            });
            const seriesMap = new Map(foundSeries.map(s => [s.id, s]));
            return seriesIds.map(id => seriesMap.get(id)).filter(Boolean).map(s => toSeriesCardData(s as any));
          } else {
            const automated = await prisma.series.findMany({ 
              where: { ...SAFE_SEARCH_FILTER },
              orderBy: { totalViews: 'desc' }, 
              select: SERIES_CARD_SELECT, 
              take: limit 
            });
            return automated.map(toSeriesCardData as any);
          }
        }

        if (type === 'RECENTLY_UPDATED') {
          const chapters = await prisma.chapter.findMany({
            where: { 
              isPublished: true,
              series: {}
            },
            orderBy: { publishedAt: 'desc' },
            distinct: ['seriesId'],
            take: limit,
            select: {
              number: true,
              label: true,
              sourceType: true,
              publishedAt: true,
              createdAt: true,
              seriesId: true,
              series: { select: SERIES_CARD_SELECT }
            }
          });
          return chapters.map(ch => ({
            series: toSeriesCardData(ch.series as any),
            chapterNumber: ch.number,
            chapterLabel: ['DOWNLOAD', 'EXTERNAL'].includes(ch.sourceType as string) ? ch.label : null,
            publishedAt: ch.publishedAt?.toISOString() || ch.createdAt.toISOString()
          }));
        }

        if (type === 'RECOMMENDED') {
          const fallback = await prisma.series.findMany({
            where: { isEditorChoice: true, ...SAFE_SEARCH_FILTER },
            take: limit,
            select: SERIES_CARD_SELECT
          });
          return fallback.map(toSeriesCardData as any);
        }

        if (type === 'FEATURED') {
          const featured = await prisma.series.findMany({
            where: { isFeatured: true, ...SAFE_SEARCH_FILTER },
            orderBy: { totalViews: 'desc' },
            take: limit,
            select: SERIES_CARD_SELECT
          });
          return featured.map(toSeriesCardData as any);
        }

        if (type === 'NEW_RELEASES' || type === 'LATEST') {
          const latest = await prisma.series.findMany({
            where: { ...SAFE_SEARCH_FILTER },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: SERIES_CARD_SELECT
          });
          return latest.map(toSeriesCardData as any);
        }
      } catch (e) {
        console.warn(`Database error fetching section ${type}:`, e);
      }
      return [];
    },
    ['homepage-section-data', type, String(limit), String(isManual), manualIds.join(',')],
    { tags: ['homepage', 'series', `section-${type}`], revalidate: 300 }
  )();
};

export async function getPersonalizedSections(limit: number): Promise<{ continueReading: any[], recommended: SeriesCardData[] } | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  // fetch reading history for continue reading using optimized select and index
  const history = await prisma.readingHistory.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    distinct: ['seriesId'],
    take: limit,
    select: {
      pageNumber: true,
      updatedAt: true,
      series: { select: SERIES_CARD_SELECT },
      chapter: {
        select: {
          number: true,
          slug: true,
          label: true,
          totalPages: true,
          sourceType: true
        }
      }
    }
  });
  
  const continueReading = history.map(h => ({
    series: toSeriesCardData(h.series as any),
    chapterNumber: h.chapter?.number ?? h.pageNumber ?? null,
    chapterSlug: h.chapter?.slug || null,
    chapterLabel: ['DOWNLOAD', 'EXTERNAL'].includes(h.chapter?.sourceType as string) ? h.chapter?.label : null,
    progress: Math.min(100, Math.max(5, (h.pageNumber / Math.max(1, h.chapter?.totalPages || 1)) * 100))
  }));

  let recommended: SeriesCardData[] = [];
  // OPT-16: Combine into a single query to reduce DB roundtrips and limit to 100
  const allBookmarks = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      seriesId: true,
      series: { select: { genres: { select: { id: true } } } }
    }
  });
  const bookmarkedIds = allBookmarks.map(b => b.seriesId);
  const recentBookmarks = allBookmarks.slice(0, 5);
  
  if (recentBookmarks.length > 0) {
    const favoriteGenres = new Set<string>();
    recentBookmarks.forEach(b => b.series.genres.forEach((g: { id: string }) => favoriteGenres.add(g.id)));
    const recommendedSeries = await prisma.series.findMany({
      where: {
        genres: { some: { id: { in: Array.from(favoriteGenres) } } },
        id: { notIn: bookmarkedIds }
      },
      orderBy: { totalViews: 'desc' },
      take: limit,
      select: SERIES_CARD_SELECT
    });
    recommended = recommendedSeries.map(toSeriesCardData as any);
  }

  return { continueReading, recommended };
}
