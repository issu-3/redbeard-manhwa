export const revalidate = 3600;

import { Metadata } from 'next';
import { BookCheck } from 'lucide-react';
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
    title: 'Completed Series',
    description: 'Binge-worthy completed series from start to finish on REDBEARD.',
    url: `${APP_URL}/browse/completed`,
    settings,
  });
}

const getCachedCompletedSeries = unstable_cache(
  async () => {
    return prisma.series.findMany({
      where: { status: 'COMPLETED' },
      select: SERIES_CARD_SELECT,
      take: 40,
      orderBy: { updatedAt: 'desc' }
    });
  },
  ['browse-completed-series'],
  { tags: ['browse-completed', 'series-data'], revalidate: 3600 }
);

export default async function CompletedPage() {
  const dbSeries = await getCachedCompletedSeries();
  
  return (
    <BrowseGrid 
      title="Completed" 
      subtitle="Binge-worthy from start to finish" 
      icon={<BookCheck className="h-5 w-5 text-primary" />} 
      series={dbSeries.map(toSeriesCardData)} 
    />
  );
}
