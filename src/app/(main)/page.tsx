export const revalidate = 60;
import { Metadata } from 'next';
import { HomepageClient } from './homepage-client';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';
import { getSections } from '@/app/actions/admin/homepage';

export const metadata: Metadata = {
  title: 'REDBEARD — The Ultimate Reading Experience',
  description:
    'Discover and read the best manhwa, manga, and webtoons. Thousands of titles, premium reading experience, and a vibrant community.',
};

export default async function HomePage() {
  const [genres, banners, sections] = await Promise.all([
    prisma.genre.findMany({ take: 20 }),
    prisma.heroBanner.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }),
    getSections().catch(() => []) // Catch in case sections table doesn't exist yet during initial build
  ]);

  const activeSections = sections.filter(s => s.isActive).sort((a, b) => a.order - b.order);

  // Fetch data for each section
  const sectionData: Record<string, any[]> = {};
  
  await Promise.all(activeSections.map(async (sec) => {
    let series: any[] = [];
    
    // Auto queries
    if (!sec.isManual) {
      if (sec.type === 'TRENDING') series = await prisma.series.findMany({ orderBy: { totalViews: 'desc' }, include: { genres: true }, take: sec.limit });
      else if (sec.type === 'POPULAR') series = await prisma.series.findMany({ orderBy: { totalBookmarks: 'desc' }, include: { genres: true }, take: sec.limit });
      else if (sec.type === 'LATEST') series = await prisma.series.findMany({ orderBy: { updatedAt: 'desc' }, include: { genres: true }, take: sec.limit });
      else if (sec.type === 'NEW_RELEASES') series = await prisma.series.findMany({ orderBy: { createdAt: 'desc' }, include: { genres: true }, take: sec.limit });
      else if (sec.type === 'FEATURED') series = await prisma.series.findMany({ where: { isFeatured: true }, include: { genres: true }, take: sec.limit });
      else if (sec.type === 'COMPLETED') series = await prisma.series.findMany({ where: { status: 'COMPLETED' }, include: { genres: true }, take: sec.limit });
      else if (sec.type === 'ONGOING') series = await prisma.series.findMany({ where: { status: 'ONGOING' }, include: { genres: true }, take: sec.limit });
      else if (sec.type === 'TOP_RATED') series = await prisma.series.findMany({ orderBy: { averageRating: 'desc' }, include: { genres: true }, take: sec.limit });
    } else {
      // Manual queries
      if (sec.manualSeriesId.length > 0) {
        const manualSeries = await prisma.series.findMany({ where: { id: { in: sec.manualSeriesId } }, include: { genres: true } });
        // Preserve order
        series = sec.manualSeriesId.map(id => manualSeries.find(s => s.id === id)).filter(Boolean);
      }
    }
    
    // Editor's picks is inherently manual
    if (sec.type === 'EDITORS_PICKS') {
      if (sec.manualSeriesId.length > 0) {
        const editorSeries = await prisma.series.findMany({ where: { id: { in: sec.manualSeriesId } }, include: { genres: true } });
        series = sec.manualSeriesId.map(id => editorSeries.find(s => s.id === id)).filter(Boolean);
      } else {
        // Fallback for older data
        series = await prisma.series.findMany({ where: { isEditorChoice: true }, include: { genres: true }, take: sec.limit });
      }
    }

    sectionData[sec.type] = series.map(toSeriesCardData);
  }));

  // Map genres
  const formattedGenres = genres.map(g => ({
    name: g.name,
    slug: g.slug,
    icon: g.iconName || 'Hash',
    color: g.color || '#primary',
    seriesCount: g.seriesCount,
  }));

  return (
    <HomepageClient
      banners={banners}
      sections={activeSections}
      sectionData={sectionData}
      genres={formattedGenres}
    />
  );
}

