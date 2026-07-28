'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData, SERIES_CARD_SELECT } from '@/lib/data-mappers';
import { unstable_cache } from 'next/cache';

export const getCachedHomepageSections = unstable_cache(
  async () => {
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
    ] as any[];
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

export const getCachedSectionSeries = unstable_cache(
  async (type: string, limit: number, isManual: boolean, manualIds: string[]) => {
    try {
      if (isManual && manualIds.length > 0) {
        const seriesList = await prisma.series.findMany({
          where: { id: { in: manualIds } },
          select: SERIES_CARD_SELECT
        });
        const seriesMap = new Map(seriesList.map(s => [s.id, s]));
        return manualIds.map(id => seriesMap.get(id)).filter(Boolean).map(s => toSeriesCardData(s!));
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
          return seriesIds.map(id => seriesMap.get(id)).filter(Boolean).map(s => toSeriesCardData(s!));
        } else {
          const automated = await prisma.series.findMany({ orderBy: { totalViews: 'desc' }, select: SERIES_CARD_SELECT, take: limit });
          return automated.map(toSeriesCardData);
        }
      }

      if (type === 'RECENTLY_UPDATED') {
        const chapters = await prisma.chapter.findMany({
          where: { isPublished: true },
          orderBy: { publishedAt: 'desc' },
          take: limit * 2,
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
        const unique = new Map<string, typeof chapters[0]>();
        for (const ch of chapters) {
          if (!unique.has(ch.seriesId)) unique.set(ch.seriesId, ch);
        }
        return Array.from(unique.values()).slice(0, limit).map(ch => ({
          series: toSeriesCardData(ch.series),
          chapterNumber: ch.number,
          chapterLabel: ch.sourceType === 'EXTERNAL' ? ch.label : null,
          publishedAt: ch.publishedAt?.toISOString() || ch.createdAt.toISOString()
        }));
      }

      if (type === 'RECOMMENDED') {
        const fallback = await prisma.series.findMany({
          where: { isEditorChoice: true },
          take: limit,
          select: SERIES_CARD_SELECT
        });
        return fallback.map(toSeriesCardData);
      }

      if (type === 'FEATURED') {
        const featured = await prisma.series.findMany({
          where: { isFeatured: true },
          orderBy: { totalViews: 'desc' },
          take: limit,
          select: SERIES_CARD_SELECT
        });
        return featured.map(toSeriesCardData);
      }

      if (type === 'NEW_RELEASES' || type === 'LATEST') {
        const latest = await prisma.series.findMany({
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: SERIES_CARD_SELECT
        });
        return latest.map(toSeriesCardData);
      }
    } catch (e) {
      console.warn(`Database error fetching section ${type}:`, e);
    }
    return [];
  },
  ['homepage-section-data'],
  { tags: ['homepage', 'series'], revalidate: 300 }
);

export async function getPersonalizedSections(limit: number) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  // fetch reading history for continue reading using optimized select and index
  const history = await prisma.readingHistory.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
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
    series: toSeriesCardData(h.series),
    chapterNumber: h.chapter?.number || h.pageNumber || 1,
    chapterSlug: h.chapter?.slug || String(h.chapter?.number || 1),
    chapterLabel: h.chapter?.sourceType === 'EXTERNAL' ? h.chapter?.label : null,
    progress: Math.min(100, Math.max(5, (h.pageNumber / Math.max(1, h.chapter?.totalPages || 1)) * 100))
  }));

  // fetch recommended based on bookmarks using select pruning
  let recommended: any[] = [];
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    select: {
      seriesId: true,
      series: {
        select: {
          genres: { select: { id: true } }
        }
      }
    },
    take: 5
  });
  
  if (bookmarks.length > 0) {
    const favoriteGenres = new Set<string>();
    bookmarks.forEach(b => b.series.genres.forEach(g => favoriteGenres.add(g.id)));
    const recommendedSeries = await prisma.series.findMany({
      where: {
        genres: { some: { id: { in: Array.from(favoriteGenres) } } },
        id: { notIn: bookmarks.map(b => b.seriesId) }
      },
      orderBy: { totalViews: 'desc' },
      take: limit,
      select: SERIES_CARD_SELECT
    });
    recommended = recommendedSeries.map(toSeriesCardData);
  }

  return { continueReading, recommended };
}
