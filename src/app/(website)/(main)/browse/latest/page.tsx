export const revalidate = 300;

import { Metadata } from 'next';
import { Clock } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { getCachedSectionSeries } from '@/app/actions/public/homepage';

import { generateMetadata as generateSeoMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedSettings();
  return generateSeoMetadata({
    title: 'Latest Updates',
    description: 'Read the latest manga and manhwa chapters freshly updated on REDBEARD. Stay current with fast releases, new chapters, and high quality reading.',
    url: `${APP_URL}/browse/latest`,
    settings,
  });
}

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
