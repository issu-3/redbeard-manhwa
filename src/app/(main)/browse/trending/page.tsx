import { Metadata } from 'next';
import { Flame } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { generateSampleSeries } from '@/lib/sample-data';

export const metadata: Metadata = { title: 'Trending' };

export default function TrendingPage() {
  const series = generateSampleSeries(18);
  return <BrowseGrid title="Trending" subtitle="What everyone is reading right now" icon={<Flame className="h-5 w-5 text-primary" />} series={series} />;
}
