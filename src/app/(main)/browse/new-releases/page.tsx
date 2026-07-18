export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { Sparkles } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';

export const metadata: Metadata = { title: 'New Releases' };

export default async function NewReleasesPage() {
  const dbSeries = await prisma.series.findMany({
    include: { genres: true },
    take: 40,
    orderBy: { createdAt: 'desc' }
  });
  
  return (
    <BrowseGrid 
      title="New Releases" 
      subtitle="Recently added to the platform" 
      icon={<Sparkles className="h-5 w-5 text-primary" />} 
      series={dbSeries.map(toSeriesCardData)} 
    />
  );
}
