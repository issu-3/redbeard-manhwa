export const revalidate = 3600;

import { Metadata } from 'next';
import { TrendingUp } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { BROWSE_PAGE_SIZE, getCachedBrowsePage, getCachedBrowseTotal } from '@/lib/browse-categories';

import { generateMetadata as generateSeoMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedSettings();
  return generateSeoMetadata({
    title: 'Popular',
    description: 'Read the most popular all-time fan favorite manga, manhwa, and webtoons on REDBEARD. Explore top-rated comics with millions of views online.',
    url: `${APP_URL}/browse/popular`,
    settings,
  });
}

export default async function PopularPage() {
  const [dbSeries, total] = await Promise.all([
    getCachedBrowsePage('popular', 0, BROWSE_PAGE_SIZE),
    getCachedBrowseTotal('popular'),
  ]);

  return (
    <BrowseGrid
      title="Most Popular"
      subtitle="All-time fan favorites"
      icon={<TrendingUp className="h-5 w-5 text-primary" />}
      series={dbSeries}
      category="popular"
      total={total}
    />
  );
}
