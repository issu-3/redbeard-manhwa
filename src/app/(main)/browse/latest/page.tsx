import { Metadata } from 'next';
import { Clock } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { generateSampleSeries } from '@/lib/sample-data';

export const metadata: Metadata = { title: 'Latest Updates' };

export default function LatestPage() {
  const series = generateSampleSeries(18, {}, 8);
  return <BrowseGrid title="Latest Updates" subtitle="Fresh chapters just dropped" icon={<Clock className="h-5 w-5 text-primary" />} series={series} />;
}
