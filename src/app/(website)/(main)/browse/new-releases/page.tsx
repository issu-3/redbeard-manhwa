export const revalidate = 3600;

import { Metadata } from 'next';
import { Sparkles } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { BROWSE_PAGE_SIZE, getCachedBrowsePage, getCachedBrowseTotal } from '@/lib/browse-categories';

import { generateMetadata as generateSeoMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedSettings();
  return generateSeoMetadata({
    title: 'New Releases',
    description: 'Explore the newest series freshly added to REDBEARD.',
    url: `${APP_URL}/browse/new-releases`,
    settings,
  });
}

export default async function NewReleasesPage() {
  const [dbSeries, total] = await Promise.all([
    getCachedBrowsePage('new-releases', 0, BROWSE_PAGE_SIZE),
    getCachedBrowseTotal('new-releases'),
  ]);

  return (
    <BrowseGrid
      title="New Releases"
      subtitle="Recently added to the platform"
      icon={<Sparkles className="h-5 w-5 text-primary" />}
      series={dbSeries}
      category="new-releases"
      total={total}
    />
  );
}
