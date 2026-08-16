export const revalidate = 3600;

import { Metadata } from 'next';
import { Rows3 } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData, SERIES_CARD_SELECT } from '@/lib/data-mappers';
import { unstable_cache } from 'next/cache';

import { generateMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';

export const metadata: Metadata = generateMetadata({
  title: 'Ongoing Series',
  description: 'Discover the best ongoing manhwa and webtoons with regular updates on REDBEARD.',
  url: `${APP_URL}/browse/ongoing`
});

const getCachedOngoingSeries = unstable_cache(
  async () => {
    return prisma.series.findMany({
      where: { status: 'ONGOING' },
      select: SERIES_CARD_SELECT,
      take: 40,
      orderBy: { updatedAt: 'desc' }
    });
  },
  ['browse-ongoing'],
  { tags: ['series'], revalidate: 3600 }
);

export default async function OngoingPage() {
  const dbSeries = await getCachedOngoingSeries();
  
  return (
    <BrowseGrid 
      title="Ongoing" 
      subtitle="Series currently being published" 
      icon={<Rows3 className="h-5 w-5 text-primary" />} 
      series={dbSeries.map(toSeriesCardData)} 
    />
  );
}
