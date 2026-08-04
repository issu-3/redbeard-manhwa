export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { BookCheck } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';

import { generateMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';

export const metadata: Metadata = generateMetadata({
  title: 'Completed Series',
  description: 'Binge-worthy completed manhwa and webtoons from start to finish on REDBEARD.',
  url: `${APP_URL}/browse/completed`
});

export default async function CompletedPage() {
  const dbSeries = await prisma.series.findMany({
    where: { status: 'COMPLETED' },
    include: { genres: true },
    take: 40,
    orderBy: { updatedAt: 'desc' }
  });
  
  return (
    <BrowseGrid 
      title="Completed" 
      subtitle="Binge-worthy from start to finish" 
      icon={<BookCheck className="h-5 w-5 text-primary" />} 
      series={dbSeries.map(toSeriesCardData)} 
    />
  );
}
