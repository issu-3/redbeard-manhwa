export const revalidate = 60;
import { Metadata } from 'next';
import { TrendingUp } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';

export const metadata: Metadata = { title: 'Popular' };

export default async function PopularPage() {
  const dbSeries = await prisma.series.findMany({
    include: { genres: true },
    take: 40,
    orderBy: { totalViews: 'desc' }
  });
  
  return (
    <BrowseGrid 
      title="Most Popular" 
      subtitle="All-time fan favorites" 
      icon={<TrendingUp className="h-5 w-5 text-primary" />} 
      series={dbSeries.map(toSeriesCardData)} 
    />
  );
}
