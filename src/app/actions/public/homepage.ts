'use server';

import { prisma } from '@/lib/prisma';
import { toSeriesCardData, SERIES_CARD_SELECT } from '@/lib/data-mappers';
import type { HomepageSection } from '@prisma/client';

export const getCachedHomepageSections = async (): Promise<HomepageSection[]> => {
    try {
      const sections = await prisma.homepageSection.findMany({ orderBy: { order: 'asc' } });
      if (sections.length > 0) return sections;
    } catch (e) {
      console.warn('Database unreachable during section fetch');
    }
    return [
      { id: '1', type: 'HERO_BANNER', isActive: true, order: 0, limit: 10, isManual: false, title: null, subtitle: null, showViewAll: false, manualSeriesId: [] as string[] },
      { id: '2', type: 'POPULAR', isActive: true, order: 1, limit: 10, isManual: false, title: '🔥 Most Popular Series All Time', subtitle: 'Top-rated and most-read series on REDBEARD', showViewAll: true, manualSeriesId: [] as string[] },
      { id: '3', type: 'MANGA', isActive: true, order: 2, limit: 10, isManual: false, title: 'Manga', subtitle: 'Popular manga series', showViewAll: true, manualSeriesId: [] as string[] },
      { id: '4', type: 'MANHWA', isActive: true, order: 3, limit: 10, isManual: false, title: 'Manhwa', subtitle: 'Popular manhwa series', showViewAll: true, manualSeriesId: [] as string[] },
      { id: '5', type: 'RECENTLY_UPDATED', isActive: true, order: 4, limit: 10, isManual: false, title: '🆕 Recently Updated', subtitle: 'Fresh chapters just dropped', showViewAll: true, manualSeriesId: [] as string[] },
      { id: '6', type: 'NEW_RELEASES', isActive: true, order: 5, limit: 10, isManual: false, title: 'New Releases', subtitle: 'Fresh series and latest additions', showViewAll: true, manualSeriesId: [] as string[] }
    ];
};

export const getCachedHeroBanners = async () => {
    try {
      const banners = await prisma.heroBanner.findMany({ orderBy: { order: 'asc' } });
      return banners.map(b => {
        let slug = b.buttonUrl?.trim() || null;
        if (slug) {
          if (slug.startsWith('/series/')) slug = slug.replace('/series/', '');
          if (slug.startsWith('/')) slug = slug.substring(1);
        }
        
        return {
          id: b.id,
          title: b.title || '',
          slug: slug,
          coverImage: b.desktopImage,
          bannerImage: b.desktopImage,
          description: b.buttonText || '',
          genres: [],
          averageRating: 0,
          chapterCount: 0,
          totalViews: 0,
          status: 'ONGOING' as const
        };
      });
    } catch (e) {
      return [];
    }
};

export const getCachedSectionSeries = async (type: string, limit: number, isManual: boolean, manualIds: string[]): Promise<any[]> => {
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

        if (type === 'POPULAR') {
          const automated = await prisma.series.findMany({ 
            where: { ...SAFE_SEARCH_FILTER },
            orderBy: [{ totalViews: 'desc' }, { createdAt: 'desc' }], 
            select: SERIES_CARD_SELECT, 
            take: limit 
          });
          return automated.map(toSeriesCardData as any);
        }

        if (type === 'MANGA' || type === 'MANHWA') {
          const content = await prisma.series.findMany({ 
            where: { type, ...SAFE_SEARCH_FILTER },
            orderBy: [{ totalViews: 'desc' }, { createdAt: 'desc' }], 
            select: SERIES_CARD_SELECT, 
            take: limit 
          });
          return content.map(toSeriesCardData as any);
        }

        if (type === 'RECENTLY_UPDATED') {
          const chapters = await prisma.chapter.findMany({
            where: { 
              isPublished: true,
              series: {}
            },
            orderBy: [
              { publishedAt: { sort: 'desc', nulls: 'last' } },
              { createdAt: 'desc' }
            ],
            distinct: ['seriesId'],
            take: limit,
            select: {
              number: true,
              slug: true,
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
            chapterSlug: ch.slug,
            chapterLabel: ['DOWNLOAD', 'EXTERNAL'].includes(ch.sourceType as string) ? ch.label : null,
            publishedAt: ch.publishedAt?.toISOString() ?? ch.createdAt.toISOString()
          }));
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
};


