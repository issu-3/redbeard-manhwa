export const revalidate = 3600;

import { Metadata } from 'next';
import { Clock } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData, SERIES_CARD_SELECT } from '@/lib/data-mappers';
import { unstable_cache } from 'next/cache';

import { generateMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';

export const metadata: Metadata = generateMetadata({
  title: 'Latest Updates',
  description: 'Read the latest manhwa and webtoon chapters just dropped on REDBEARD.',
  url: `${APP_URL}/browse/latest`
});

const getCachedLatestSeries = unstable_cache(
  async () => {
    return prisma.series.findMany({
      select: SERIES_CARD_SELECT,
      take: 40,
      orderBy: { updatedAt: 'desc' }
    });
  },
  ['browse-latest'],
  { tags: ['series'], revalidate: 3600 }
);

export default async function LatestPage() {
  const dbSeries = await getCachedLatestSeries();
  
  return (
    <BrowseGrid 
      title="Latest Updates" 
      subtitle="Fresh chapters just dropped" 
      icon={<Clock className="h-5 w-5 text-primary" />} 
      series={dbSeries.map(toSeriesCardData)} 
    />
  );
}
