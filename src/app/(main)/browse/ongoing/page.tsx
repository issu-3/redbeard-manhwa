export const revalidate = 60;
import { Metadata } from 'next';
import { Rows3 } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';

export const metadata: Metadata = { title: 'Ongoing Series' };

export default async function OngoingPage() {
  const dbSeries = await prisma.series.findMany({
    where: { status: 'ONGOING' },
    include: { genres: true },
    take: 40,
    orderBy: { updatedAt: 'desc' }
  });
  
  return (
    <BrowseGrid 
      title="Ongoing" 
      subtitle="Series currently being published" 
      icon={<Rows3 className="h-5 w-5 text-primary" />} 
      series={dbSeries.map(toSeriesCardData)} 
    />
  );
}
