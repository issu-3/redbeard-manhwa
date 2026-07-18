import { Metadata } from 'next';
import { TrendingUp } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { generateSampleSeries } from '@/lib/sample-data';

export const metadata: Metadata = { title: 'Popular' };

export default function PopularPage() {
  const series = generateSampleSeries(18, {}, 4);
  return <BrowseGrid title="Most Popular" subtitle="All-time fan favorites" icon={<TrendingUp className="h-5 w-5 text-primary" />} series={series} />;
}
