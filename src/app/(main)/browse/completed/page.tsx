export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { BookCheck } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { generateSampleSeries } from '@/lib/sample-data';

export const metadata: Metadata = { title: 'Completed Series' };

export default function CompletedPage() {
  const series = generateSampleSeries(18, { status: 'COMPLETED' }, 12);
  return <BrowseGrid title="Completed" subtitle="Binge-worthy from start to finish" icon={<BookCheck className="h-5 w-5 text-primary" />} series={series} />;
}
