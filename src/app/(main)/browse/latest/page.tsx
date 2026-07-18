export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { Clock } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';

export const metadata: Metadata = { title: 'Latest Updates' };

export default async function LatestPage() {
  const dbSeries = await prisma.series.findMany({
    include: { genres: true },
    take: 40,
    orderBy: { updatedAt: 'desc' }
  });
  
  return (
    <BrowseGrid 
      title="Latest Updates" 
      subtitle="Fresh chapters just dropped" 
      icon={<Clock className="h-5 w-5 text-primary" />} 
      series={dbSeries.map(toSeriesCardData)} 
    />
  );
}
