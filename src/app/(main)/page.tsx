export const revalidate = 60;
import { Metadata } from 'next';
import { HomepageClient } from './homepage-client';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';

export const metadata: Metadata = {
  title: 'REDBEARD — The Ultimate Reading Experience',
  description:
    'Discover and read the best manhwa, manga, and webtoons. Thousands of titles, premium reading experience, and a vibrant community.',
};

export default async function HomePage() {
  const [
    genres,
    dbFeatured,
    dbTrending,
    dbPopular,
    dbRecentlyUpdated,
    dbCompleted,
    dbStaffPicks,
  ] = await Promise.all([
    prisma.genre.findMany({ take: 20 }),
    prisma.series.findMany({
      where: { isFeatured: true },
      include: { genres: true },
      take: 4,
    }),
    prisma.series.findMany({
      orderBy: { totalViews: 'desc' },
      include: { genres: true },
      take: 8,
    }),
    prisma.series.findMany({
      orderBy: { totalBookmarks: 'desc' },
      include: { genres: true },
      take: 8,
    }),
    prisma.series.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { genres: true },
      take: 8,
    }),
    prisma.series.findMany({
      where: { status: 'COMPLETED' },
      include: { genres: true },
      take: 6,
    }),
    prisma.series.findMany({
      where: { isEditorChoice: true },
      include: { genres: true },
      take: 6,
    }),
  ]);

  return (
    <HomepageClient
      featured={dbFeatured.map(toSeriesCardData)}
      trending={dbTrending.map(toSeriesCardData)}
      popular={dbPopular.map(toSeriesCardData)}
      recentlyUpdated={dbRecentlyUpdated.map(toSeriesCardData)}
      completed={dbCompleted.map(toSeriesCardData)}
      staffPicks={dbStaffPicks.map(toSeriesCardData)}
      genres={genres.map(g => ({
        name: g.name,
        slug: g.slug,
        icon: g.iconName || 'Hash',
        color: g.color || '#primary',
        seriesCount: g.seriesCount,
      }))}
    />
  );
}

