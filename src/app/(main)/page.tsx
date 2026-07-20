export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { HomepageClient } from './homepage-client';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';
import { auth } from '@/auth';
import { getCachedSettings } from '@/app/actions/public/settings';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedSettings();
  return {
    title: settings.seo_site_title || 'REDBEARD - The Ultimate Reading Experience',
    description: settings.seo_site_description || 'Read the best manhwa and webtoons online.',
  };
}

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.id;
  
  // 1. Fetch active sections sorted by order
  let allSections = await prisma.homepageSection.findMany({ orderBy: { order: 'asc' } });
  
  // If no sections exist (e.g. fresh DB), fallback to default
  if (allSections.length === 0) {
    allSections = [
      { id: '1', type: 'HERO_BANNER', isActive: true, order: 0, limit: 10, isManual: false, title: null, subtitle: null, showViewAll: false, manualSeriesId: [] as string[] },
      { id: '2', type: 'CONTINUE_READING', isActive: true, order: 1, limit: 10, isManual: false, title: '📚 Continue Reading', subtitle: 'Pick up where you left off', showViewAll: true, manualSeriesId: [] as string[] },
      { id: '3', type: 'TRENDING', isActive: true, order: 2, limit: 10, isManual: false, title: '🔥 Trending', subtitle: 'Top 10 most viewed this week', showViewAll: true, manualSeriesId: [] as string[] },
      { id: '4', type: 'RECENTLY_UPDATED', isActive: true, order: 3, limit: 10, isManual: false, title: '🆕 Recently Updated', subtitle: 'Fresh chapters just dropped', showViewAll: true, manualSeriesId: [] as string[] },
      { id: '5', type: 'RECOMMENDED', isActive: true, order: 4, limit: 10, isManual: false, title: 'Recommended For You', subtitle: 'Based on your reading history', showViewAll: true, manualSeriesId: [] as string[] },
      { id: '6', type: 'FEATURED', isActive: true, order: 5, limit: 10, isManual: false, title: '⭐ Featured Series', subtitle: 'Handpicked by our staff', showViewAll: true, manualSeriesId: [] as string[] }
    ] as any;
  }
  const activeSections = allSections.filter(s => s.isActive).sort((a, b) => a.order - b.order);

  // 2. Fetch data for each active section
  const sectionData: Record<string, any[]> = {};

  const sectionPromises = activeSections.map(async (sec) => {
    let data: any[] = [];
    if (sec.type === 'HERO_BANNER') {
      const banners = await prisma.heroBanner.findMany({ orderBy: { order: 'asc' } });
      data = banners.map(b => ({
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
      data = ordered.map(toSeriesCardData);
    } else if (sec.type === 'CONTINUE_READING') {
      if (userId) {
        const history = await prisma.readingHistory.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          take: sec.limit,
          include: { series: { include: { genres: true } }, chapter: true }
        });
        data = history.map(h => ({
          series: toSeriesCardData(h.series),
          chapterNumber: h.chapter?.number || h.pageNumber || 1,
          progress: Math.min(100, Math.max(5, (h.pageNumber / Math.max(1, h.chapter?.totalPages || 1)) * 100))
        }));
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
          data = recommendedSeries.map(toSeriesCardData);
        } else {
          // Fallback to Editors Choice if no bookmarks
          const fallback = await prisma.series.findMany({
            where: { isEditorChoice: true },
            take: sec.limit,
            include: { genres: true }
          });
          data = fallback.map(toSeriesCardData);
        }
      } else {
        // Fallback for guests
        const fallback = await prisma.series.findMany({
          where: { isEditorChoice: true },
          take: sec.limit,
          include: { genres: true }
        });
        data = fallback.map(toSeriesCardData);
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
      data = Array.from(unique.values()).slice(0, sec.limit).map((ch: any) => ({
        series: toSeriesCardData(ch.series),
        chapterNumber: ch.number,
        publishedAt: ch.publishedAt?.toISOString() || ch.createdAt.toISOString()
      }));
    } else if (!sec.isManual) {
      // General fallback using the automated query
      let automated: any[] = [];
      if (sec.type === 'TRENDING') {
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
          automated = seriesIds.map(id => foundSeries.find(s => s.id === id)).filter(Boolean);
        } else {
          automated = await prisma.series.findMany({ orderBy: { totalViews: 'desc' }, include: { genres: true }, take: sec.limit });
        }
      } else if (sec.type === 'FEATURED') {
        automated = await prisma.series.findMany({ where: { isFeatured: true }, include: { genres: true }, take: sec.limit });
      }
      data = automated.map(toSeriesCardData);
    }
    return { type: sec.type, data };
  });

  const results = await Promise.allSettled(sectionPromises);
  for (const result of results) {
    if (result.status === 'fulfilled') {
      sectionData[result.value.type] = result.value.data;
    } else {
      console.error('Failed to load homepage section:', result.reason);
    }
  }

  return (
    <>
      <h1 className="sr-only">REDBEARD - The Ultimate Reading Experience</h1>
      <HomepageClient
        sections={activeSections}
        sectionData={sectionData}
        isLoggedIn={!!userId}
      />
    </>
  );
}
