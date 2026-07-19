import { Metadata } from 'next';
import { HomepageClient } from './homepage-client';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';
import { auth } from '@/auth';
import { getSections, getAutomatedSeries, getBanners } from '@/app/actions/admin/homepage';

export const metadata: Metadata = {
  title: 'REDBEARD — Premium Manga & Manhwa',
  description:
    'Discover and read the best manhwa, manga, and webtoons. Premium reading experience and vibrant community.',
};

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.id;
  
  // 1. Fetch active sections sorted by order
  const allSections = await getSections();
  const activeSections = allSections.filter(s => s.isActive).sort((a, b) => a.order - b.order);

  // 2. Fetch data for each active section
  const sectionData: Record<string, any[]> = {};

  for (const sec of activeSections) {
    if (sec.type === 'HERO_BANNER') {
      const banners = await getBanners();
      sectionData[sec.type] = banners.map(b => ({
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
        status: 'ONGOING'
      }));
    } else if (sec.isManual && sec.manualSeriesId.length > 0) {
      const seriesList = await prisma.series.findMany({
        where: { id: { in: sec.manualSeriesId } },
        include: { genres: true }
      });
      // Maintain manual order
      const ordered = sec.manualSeriesId.map(id => seriesList.find(s => s.id === id)).filter((s): s is typeof seriesList[0] => Boolean(s));
      sectionData[sec.type] = ordered.map(toSeriesCardData);
    } else if (sec.type === 'CONTINUE_READING') {
      if (userId) {
        const history = await prisma.readingHistory.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          take: sec.limit,
          include: { series: { include: { genres: true } }, chapter: true }
        });
        sectionData[sec.type] = history.map(h => ({
          series: toSeriesCardData(h.series),
          chapterNumber: h.chapter?.number || h.pageNumber || 1,
          progress: Math.min(100, Math.max(5, (h.pageNumber / Math.max(1, h.chapter?.totalPages || 1)) * 100))
        }));
      } else {
        sectionData[sec.type] = [];
      }
    } else if (sec.type === 'RECOMMENDED' && !sec.isManual) {
      if (userId) {
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
            take: sec.limit,
            include: { genres: true }
          });
          sectionData[sec.type] = recommendedSeries.map(toSeriesCardData);
        } else {
          // Fallback to Editors Choice if no bookmarks
          const fallback = await prisma.series.findMany({
            where: { isEditorChoice: true },
            take: sec.limit,
            include: { genres: true }
          });
          sectionData[sec.type] = fallback.map(toSeriesCardData);
        }
      } else {
        // Fallback for guests
        const fallback = await prisma.series.findMany({
          where: { isEditorChoice: true },
          take: sec.limit,
          include: { genres: true }
        });
        sectionData[sec.type] = fallback.map(toSeriesCardData);
      }
    } else if (sec.type === 'RECENTLY_UPDATED' && !sec.isManual) {
      const chapters = await prisma.chapter.findMany({
        where: { isPublished: true },
        orderBy: { publishedAt: 'desc' },
        take: sec.limit * 2,
        include: { series: { include: { genres: true } } }
      });
      const unique = new Map();
      for (const ch of chapters) {
        if (!unique.has(ch.seriesId)) unique.set(ch.seriesId, ch);
      }
      sectionData[sec.type] = Array.from(unique.values()).slice(0, sec.limit).map((ch: any) => ({
        series: toSeriesCardData(ch.series),
        chapterNumber: ch.number,
        publishedAt: ch.publishedAt?.toISOString() || ch.createdAt.toISOString()
      }));
    } else if (!sec.isManual) {
      // General fallback using the automated query
      const automated = await getAutomatedSeries(sec.type, sec.limit);
      sectionData[sec.type] = automated.map(toSeriesCardData);
    }
  }

  return (
    <HomepageClient
      sections={activeSections}
      sectionData={sectionData}
      isLoggedIn={!!userId}
    />
  );
}
