export const revalidate = 300;

import { Metadata } from 'next';
import { Sparkles } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData, SERIES_CARD_SELECT } from '@/lib/data-mappers';
import { unstable_cache } from 'next/cache';

import { generateMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';

export const metadata: Metadata = generateMetadata({
  title: 'New Releases',
  description: 'Explore the newest manhwa and manga series freshly added to REDBEARD.',
  url: `${APP_URL}/browse/new-releases`
});

const getCachedNewReleasesSeries = unstable_cache(
  async () => {
    return prisma.series.findMany({
      select: SERIES_CARD_SELECT,
      take: 40,
      orderBy: { createdAt: 'desc' }
    });
  },
  ['browse-new-releases'],
  { tags: ['series'], revalidate: 300 }
);

export default async function NewReleasesPage() {
  const dbSeries = await getCachedNewReleasesSeries();
  
  return (
    <BrowseGrid 
      title="New Releases" 
      subtitle="Recently added to the platform" 
      icon={<Sparkles className="h-5 w-5 text-primary" />} 
      series={dbSeries.map(toSeriesCardData)} 
    />
  );
}
