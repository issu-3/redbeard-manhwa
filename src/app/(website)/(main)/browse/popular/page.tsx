export const revalidate = 3600;

import { Metadata } from 'next';
import { TrendingUp } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData, SERIES_CARD_SELECT } from '@/lib/data-mappers';

import { generateMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';

export const metadata: Metadata = generateMetadata({
  title: 'Popular',
  description: 'Read the most popular all-time fan favorite series on REDBEARD.',
  url: `${APP_URL}/browse/popular`
});

const getCachedPopularSeries = async () => {
    return prisma.series.findMany({
      where: {},
      select: SERIES_CARD_SELECT,
      take: 40,
      orderBy: { totalViews: 'desc' }
    });
  };

export default async function PopularPage() {
  const dbSeries = await getCachedPopularSeries();
  
  return (
    <BrowseGrid 
      title="Most Popular" 
      subtitle="All-time fan favorites" 
      icon={<TrendingUp className="h-5 w-5 text-primary" />} 
      series={dbSeries.map(toSeriesCardData)} 
    />
  );
}
