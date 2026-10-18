export const revalidate = 3600;

import { Metadata } from 'next';
import { Flame } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData, SERIES_CARD_SELECT } from '@/lib/data-mappers';
import { unstable_cache } from 'next/cache';

import { generateMetadata as generateSeoMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedSettings();
  return generateSeoMetadata({
    title: 'Trending',
    description: 'Discover the most trending manhwa, manga, and comics right now on REDBEARD. Read popular series with high quality scans and daily updates online.',
    url: `${APP_URL}/browse/trending`,
    settings,
  });
}

const getCachedTrendingSeries = unstable_cache(
  async () => {
    return prisma.series.findMany({
      where: {},
      select: SERIES_CARD_SELECT,
      take: 40,
      orderBy: { totalBookmarks: 'desc' }
    });
  },
  ['browse-trending-series'],
  { tags: ['browse-trending', 'series-data'], revalidate: 3600 }
);

export default async function TrendingPage() {
  const dbSeries = await getCachedTrendingSeries();
  
  return (
    <BrowseGrid 
      title="Trending" 
      subtitle="What everyone is reading right now" 
      icon={<Flame className="h-5 w-5 text-primary" />} 
      series={dbSeries.map(toSeriesCardData)} 
    />
  );
}
