'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';

export async function getPersonalizedSections(limit: number) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  // fetch reading history for continue reading
  const history = await prisma.readingHistory.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: { series: { include: { genres: true } }, chapter: true }
  });
  
  const continueReading = history.map(h => ({
    series: toSeriesCardData(h.series),
    chapterNumber: h.chapter?.number || h.pageNumber || 1,
    chapterLabel: h.chapter?.label,
    progress: Math.min(100, Math.max(5, (h.pageNumber / Math.max(1, h.chapter?.totalPages || 1)) * 100))
  }));

  // fetch recommended based on bookmarks
  let recommended: any[] = [];
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
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
      take: limit,
      include: { genres: true }
    });
    recommended = recommendedSeries.map(toSeriesCardData);
  }

  return { continueReading, recommended };
}
