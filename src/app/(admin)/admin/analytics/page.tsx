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
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tighter text-text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
          Analytics Overview
        </h1>
        <p className="mt-1 text-text-muted">
          Monitor your platform's traffic, revenue, content performance, and system health.
        </p>
      </div>

      <AnalyticsDashboard initialData={analyticsData} currentRange={range} />
    </div>
  );
}
