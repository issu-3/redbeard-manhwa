import { Metadata } from 'next';
import { getAnalyticsData } from '@/app/actions/admin/analytics';
import { AnalyticsDashboard } from '@/components/admin/analytics/AnalyticsDashboard';

export const metadata: Metadata = {
  title: 'Analytics Dashboard - REDBEARD Admin',
};

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const range = (searchParams.range as string) || '7d';
  
  const analyticsData = await getAnalyticsData(range);

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-text-primary">
          Analytics
        </h1>
        <p className="mt-2 text-sm md:text-base text-text-secondary">
          Monitor platform activity and system health.
        </p>
      </div>

      <AnalyticsDashboard initialData={analyticsData} currentRange={range} />
    </div>
  );
}
