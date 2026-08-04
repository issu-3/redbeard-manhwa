export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { Flame } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';

import { generateMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';

export const metadata: Metadata = generateMetadata({
  title: 'Trending',
  description: 'Discover the most trending and popular manhwa, manga, and webtoons right now on REDBEARD.',
  url: `${APP_URL}/browse/trending`
});

export default async function TrendingPage() {
  const dbSeries = await prisma.series.findMany({
    include: { genres: true },
    take: 40,
    orderBy: { totalBookmarks: 'desc' }
  });
  
  return (
    <BrowseGrid 
      title="Trending" 
      subtitle="What everyone is reading right now" 
      icon={<Flame className="h-5 w-5 text-primary" />} 
      series={dbSeries.map(toSeriesCardData)} 
    />
  );
}
