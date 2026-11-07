export const revalidate = 3600;

import { Metadata } from 'next';
import { Rows3 } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { getCachedBrowsePage, getCachedBrowseTotal } from '@/lib/browse-categories';
import { BROWSE_PAGE_SIZE } from '@/lib/browse-constants';

import { generateMetadata as generateSeoMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedSettings();
  return generateSeoMetadata({
    title: 'Ongoing Series',
    description: 'Discover the best ongoing series with regular updates on REDBEARD.',
    url: `${APP_URL}/browse/ongoing`,
    settings,
  });
}

export default async function OngoingPage() {
  const [dbSeries, total] = await Promise.all([
    getCachedBrowsePage('ongoing', 0, BROWSE_PAGE_SIZE),
    getCachedBrowseTotal('ongoing'),
  ]);

  return (
    <BrowseGrid
      title="Ongoing"
      subtitle="Series currently being published"
      icon={<Rows3 className="h-5 w-5 text-primary" />}
      series={dbSeries}
      category="ongoing"
      total={total}
    />
  );
}
