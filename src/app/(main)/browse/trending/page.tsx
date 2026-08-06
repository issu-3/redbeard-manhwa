export const revalidate = 300;

import { Metadata } from 'next';
import { Flame } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData, SERIES_CARD_SELECT } from '@/lib/data-mappers';
import { unstable_cache } from 'next/cache';

import { generateMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';

export const metadata: Metadata = generateMetadata({
  title: 'Trending',
  description: 'Discover the most trending and popular manhwa, manga, and webtoons right now on REDBEARD.',
  url: `${APP_URL}/browse/trending`
});

const getCachedTrendingSeries = unstable_cache(
  async () => {
    return prisma.series.findMany({
      select: SERIES_CARD_SELECT,
      take: 40,
      orderBy: { totalBookmarks: 'desc' }
    });
  },
  ['browse-trending'],
  { tags: ['series'], revalidate: 300 }
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
