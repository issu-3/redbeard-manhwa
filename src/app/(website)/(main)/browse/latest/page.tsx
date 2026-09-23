export const revalidate = 300;

import { Metadata } from 'next';
import { Clock } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { getCachedSectionSeries } from '@/app/actions/public/homepage';

import { generateMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';

export const metadata: Metadata = generateMetadata({
  title: 'Latest Updates',
  description: 'Read the latest chapters just dropped on REDBEARD.',
  url: `${APP_URL}/browse/latest`
});

export default async function LatestPage() {
  const updates = await getCachedSectionSeries('RECENTLY_UPDATED', 40, false, []);
  // getCachedSectionSeries returns RecentUpdate[] for RECENTLY_UPDATED
  // We map it back to SeriesCardData for BrowseGrid
  const dbSeries = updates.map(u => ({
    ...u.series,
    updatedAt: u.publishedAt // Overwrite the series updatedAt with the chapter's effective timestamp
  }));
  
  return (
    <BrowseGrid 
      title="Latest Updates" 
      subtitle="Fresh chapters just dropped" 
      icon={<Clock className="h-5 w-5 text-primary" />} 
      series={dbSeries} 
    />
  );
}
