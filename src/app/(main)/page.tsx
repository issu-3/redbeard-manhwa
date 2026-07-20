export const revalidate = 3600;
import { Metadata } from 'next';
import { HomepageClient } from './homepage-client';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';
import { getCachedSettings } from '@/app/actions/public/settings';
import { AdSlot } from '@/components/ads/AdSlot';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedSettings();
  return {
    title: settings.seo_site_title || 'REDBEARD - The Ultimate Reading Experience',
    description: settings.seo_site_description || 'Read the best manhwa and webtoons online.',
  };
}

export default async function HomePage() {
  // 1. Fetch active sections sorted by order
  let allSections: any[] = [];
  try {
    allSections = await prisma.homepageSection.findMany({ orderBy: { order: 'asc' } });
  } catch (error) {
    console.warn('Database unreachable during static generation, falling back to defaults.');
  }
  
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

  // 2. Fetch static data for each active section
  const sectionData: Record<string, any[]> = {};

  const sectionPromises = activeSections.map(async (sec) => {
    let data: any[] = [];
    try {
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
        const seriesMap = new Map(seriesList.map(s => [s.id, s]));
        const ordered = (sec.manualSeriesId as string[]).map((id: string) => seriesMap.get(id)).filter(Boolean);
        data = ordered.map((s: any) => toSeriesCardData(s));
      } else if (sec.type === 'CONTINUE_READING') {
        // Dynamic data fetched client-side via getPersonalizedSections
        data = [];
      } else if (sec.type === 'RECOMMENDED' && !sec.isManual) {
        // Fallback for guests and static shell (personalized data fetched client-side)
        const fallback = await prisma.series.findMany({
          where: { isEditorChoice: true },
          take: sec.limit,
          include: { genres: true }
        });
        data = fallback.map(toSeriesCardData);
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
            const seriesIds = topReads.map((t: any) => t.seriesId);
            const foundSeries = await prisma.series.findMany({
              where: { id: { in: seriesIds } },
              include: { genres: true }
            });
            const seriesMap = new Map(foundSeries.map(s => [s.id, s]));
            automated = seriesIds.map((id: string) => seriesMap.get(id)).filter(Boolean);
          } else {
            automated = await prisma.series.findMany({ orderBy: { totalViews: 'desc' }, include: { genres: true }, take: sec.limit });
          }
        } else if (sec.type === 'FEATURED') {
          automated = await prisma.series.findMany({ where: { isFeatured: true }, include: { genres: true }, take: sec.limit });
        }
        data = automated.map((s: any) => toSeriesCardData(s));
      }
    } catch (e) {
      console.warn(`Database unreachable during static generation for section ${sec.type}`);
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
      <AdSlot placement="homepage" />
      <HomepageClient
        sections={activeSections}
        sectionData={sectionData}
        isLoggedIn={false} // Managed internally by HomepageClient via next-auth
      />
    </>
  );
}
