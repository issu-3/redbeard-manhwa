import { Metadata } from 'next';
import { HomepageClient } from './homepage-client';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';
import { unstable_cache } from 'next/cache';
import { auth } from '@/auth';

export const metadata: Metadata = {
  title: 'REDBEARD — Premium Manga & Manhwa',
  description:
    'Discover and read the best manhwa, manga, and webtoons. Premium reading experience and vibrant community.',
};

const getCachedPublicData = unstable_cache(
  async () => {
    // 1. Hero Banner: Featured or Hot
    const heroSeries = await prisma.series.findMany({
      where: { OR: [{ isFeatured: true }, { isHot: true }] },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { genres: true }
    });

    // 2. Trending: Top 10 by totalViews (since readingHistory grouping for 7 days might be slow on large tables without proper indexes, we'll use a combination of recent updates + views or just totalViews)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trendingHistory = await prisma.readingHistory.groupBy({
      by: ['seriesId'],
      where: { updatedAt: { gte: sevenDaysAgo } },
      _count: { seriesId: true },
      orderBy: { _count: { seriesId: 'desc' } },
      take: 10
    });

    let trendingSeries = [];
    if (trendingHistory.length > 0) {
      const ids = trendingHistory.map(h => h.seriesId);
      const found = await prisma.series.findMany({
        where: { id: { in: ids } },
        include: { genres: true }
      });
      trendingSeries = ids.map(id => found.find(s => s.id === id)).filter(Boolean) as typeof found;
    } else {
      trendingSeries = await prisma.series.findMany({
        orderBy: { totalViews: 'desc' },
        take: 10,
        include: { genres: true }
      });
    }

    // 3. Recently Updated
    const recentlyUpdatedChapters = await prisma.chapter.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      take: 15,
      include: { 
        series: {
          include: { genres: true }
        }
      }
    });

    // Filter unique series for recently updated
    const uniqueRecentSeries = new Map();
    for (const ch of recentlyUpdatedChapters) {
      if (!uniqueRecentSeries.has(ch.seriesId)) {
        uniqueRecentSeries.set(ch.seriesId, ch);
      }
    }
    const recentUpdates = Array.from(uniqueRecentSeries.values()).slice(0, 10);

    // 4. Editor's Picks (Guest fallback)
    const editorsPicks = await prisma.series.findMany({
      where: { isEditorChoice: true },
      take: 10,
      include: { genres: true }
    });

    return {
      hero: heroSeries.map(toSeriesCardData),
      trending: trendingSeries.map(toSeriesCardData),
      recent: recentUpdates.map(ch => ({
        series: toSeriesCardData(ch.series),
        chapterNumber: ch.number,
        publishedAt: ch.publishedAt?.toISOString() || ch.createdAt.toISOString()
      })),
      editorsPicks: editorsPicks.map(toSeriesCardData)
    };
  },
  ['homepage-public-v1'],
  { revalidate: 3600, tags: ['homepage_data'] }
);

import type { SeriesCardData } from '@/types';
import type { ContinueReadingItem } from '@/components/home/ContinueReadingCarousel';

export default async function HomePage() {
  const publicData = await getCachedPublicData();
  const session = await auth();

  let continueReading: ContinueReadingItem[] = [];
  let recommended: SeriesCardData[] = [];

  if (session?.user?.id) {
    // 1. Continue Reading
    const history = await prisma.readingHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      include: { 
        series: { include: { genres: true } }, 
        chapter: true 
      }
    });

    continueReading = history.map(h => ({
      series: toSeriesCardData(h.series),
      chapterNumber: h.chapter?.number || h.pageNumber || 1, // Fallback if chapter not found
      progress: Math.min(100, Math.max(5, (h.pageNumber / Math.max(1, h.chapter?.totalPages || 1)) * 100))
    }));

    // 2. Recommended (Based on bookmarks)
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: session.user.id },
      include: { series: { include: { genres: true } } },
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
        take: 10,
        include: { genres: true }
      });
      recommended = recommendedSeries.map(toSeriesCardData);
    }
  }

  // Fallback for recommended if empty (e.g. no bookmarks or guest)
  if (recommended.length === 0) {
    recommended = publicData.editorsPicks;
  }

  return (
    <HomepageClient
      hero={publicData.hero}
      trending={publicData.trending}
      recentlyUpdated={publicData.recent}
      continueReading={continueReading}
      recommended={recommended}
      isLoggedIn={!!session?.user?.id}
    />
  );
}
