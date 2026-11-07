export const revalidate = 3600;

import { Metadata } from 'next';
import { Flame } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { getCachedBrowsePage, getCachedBrowseTotal } from '@/lib/browse-categories';
import { BROWSE_PAGE_SIZE } from '@/lib/browse-constants';

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

export default async function TrendingPage() {
  const [dbSeries, total] = await Promise.all([
    getCachedBrowsePage('trending', 0, BROWSE_PAGE_SIZE),
    getCachedBrowseTotal('trending'),
  ]);

  return (
    <BrowseGrid
      title="Trending"
      subtitle="What everyone is reading right now"
      icon={<Flame className="h-5 w-5 text-primary" />}
      series={dbSeries}
      category="trending"
      total={total}
    />
  );
}
