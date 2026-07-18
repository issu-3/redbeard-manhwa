export const revalidate = 60;
import { Metadata } from 'next';
import { Flame } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';

export const metadata: Metadata = { title: 'Trending' };

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
