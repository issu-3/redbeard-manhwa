import { Metadata } from 'next';
import { Rows3 } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { generateSampleSeries } from '@/lib/sample-data';

export const metadata: Metadata = { title: 'Ongoing Series' };

export default function OngoingPage() {
  const series = generateSampleSeries(18, { status: 'ONGOING' }, 2);
  return <BrowseGrid title="Ongoing" subtitle="Series currently being published" icon={<Rows3 className="h-5 w-5 text-primary" />} series={series} />;
}
