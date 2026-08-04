export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { Sparkles } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';

import { generateMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';

export const metadata: Metadata = generateMetadata({
  title: 'New Releases',
  description: 'Explore the newest manhwa and manga series freshly added to REDBEARD.',
  url: `${APP_URL}/browse/new-releases`
});

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
