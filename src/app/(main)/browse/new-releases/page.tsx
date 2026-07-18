export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { Sparkles } from 'lucide-react';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { generateSampleSeries } from '@/lib/sample-data';

export const metadata: Metadata = { title: 'New Releases' };

export default function NewReleasesPage() {
  const series = generateSampleSeries(12, { status: 'UPCOMING' }, 6);
  return <BrowseGrid title="New Releases" subtitle="Recently added to the platform" icon={<Sparkles className="h-5 w-5 text-primary" />} series={series} />;
}
