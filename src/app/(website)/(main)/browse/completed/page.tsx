export const revalidate = 3600;

import { Metadata } from 'next';
import { BookCheck } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { BROWSE_PAGE_SIZE, getCachedBrowsePage, getCachedBrowseTotal } from '@/lib/browse-categories';

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

export default async function CompletedPage() {
  const [dbSeries, total] = await Promise.all([
    getCachedBrowsePage('completed', 0, BROWSE_PAGE_SIZE),
    getCachedBrowseTotal('completed'),
  ]);

  return (
    <BrowseGrid
      title="Completed"
      subtitle="Binge-worthy from start to finish"
      icon={<BookCheck className="h-5 w-5 text-primary" />}
      series={dbSeries}
      category="completed"
      total={total}
    />
  );
}
