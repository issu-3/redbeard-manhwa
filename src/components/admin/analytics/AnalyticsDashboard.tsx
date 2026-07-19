
'use client';

import { useRouter } from 'next/navigation';
import { 
  Users, BookOpen, Layers, MessageSquare, Activity, Bookmark, Eye, Fingerprint, Search, Smartphone, Globe, TrendingUp
} from 'lucide-react';
import { MetricCard } from './MetricCard';
import { 
  DailyTrafficChart, 
  UserGrowthChart, 
  PublishingActivityChart, 
  ReadingDistributionChart,
  HorizontalBarChart,
  RetentionChart,
  DeviceDistributionChart
} from './AnalyticsCharts';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import { SystemHealthPanel } from './SystemHealthPanel';

export function AnalyticsDashboard({ initialData, currentRange }: { initialData: any, currentRange: string }) {
  const router = useRouter();

  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`/admin/analytics?range=${e.target.value}`);
  };

  const { overview = {}, charts = {}, lastUpdated } = initialData;

  const isAllTime = currentRange === 'all';
  const prefix = isAllTime ? 'Total' : 'New';

  return (
    <div className="space-y-8 pb-12">
      
      {/* Filters & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border border-border p-4 rounded-xl">
        <div className="flex items-center gap-2 text-sm">
          <Activity className="h-5 w-5 text-primary" />
          <span className="font-medium">Data Sync: Live (Neon PostgreSQL)</span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-sm font-semibold text-text-muted">Date Range:</label>
          <select 
            value={currentRange}
            onChange={handleRangeChange}
            className="flex-1 sm:w-48 bg-background border border-input rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* OVERVIEW CARDS */}
      <section>
        <h2 className="text-xl font-bold mb-4">Platform Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <MetricCard title={`${prefix} Users`} value={overview.users?.value?.toLocaleString() || '0'} trend={overview.users?.trend || 0} sparkline={overview.users?.sparkline || []} lastUpdated={lastUpdated} icon={Users} />
          <MetricCard title="Active Users" value={overview.activeUsers?.value?.toLocaleString() || '0'} trend={overview.activeUsers?.trend || 0} sparkline={overview.activeUsers?.sparkline || []} lastUpdated={lastUpdated} icon={Users} />
          <MetricCard title={`${prefix} Series`} value={overview.series?.value?.toLocaleString() || '0'} trend={overview.series?.trend || 0} sparkline={overview.series?.sparkline || []} lastUpdated={lastUpdated} icon={BookOpen} />
          <MetricCard title={`${prefix} Chapters`} value={overview.chapters?.value?.toLocaleString() || '0'} trend={overview.chapters?.trend || 0} sparkline={overview.chapters?.sparkline || []} lastUpdated={lastUpdated} icon={Layers} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Views" value={overview.views?.value?.toLocaleString() || '0'} trend={overview.views?.trend || 0} sparkline={overview.views?.sparkline || []} lastUpdated={lastUpdated} icon={Eye} />
          <MetricCard title="Unique Visitors" value={overview.uniqueVisitors?.value?.toLocaleString() || '0'} trend={overview.uniqueVisitors?.trend || 0} sparkline={overview.uniqueVisitors?.sparkline || []} lastUpdated={lastUpdated} icon={Fingerprint} />
          <MetricCard title={`${prefix} Bookmarks`} value={overview.bookmarks?.value?.toLocaleString() || '0'} trend={overview.bookmarks?.trend || 0} sparkline={overview.bookmarks?.sparkline || []} lastUpdated={lastUpdated} icon={Bookmark} />
          <MetricCard title={`${prefix} Comments`} value={overview.comments?.value?.toLocaleString() || '0'} trend={overview.comments?.trend || 0} sparkline={overview.comments?.sparkline || []} lastUpdated={lastUpdated} icon={MessageSquare} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8">
        {/* TRAFFIC & RETENTION TREND */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold">Daily Traffic</h2>
                </div>
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded">Reads</span>
              </div>
              <ChartErrorBoundary chartName="Daily Traffic">
                <DailyTrafficChart data={charts.dailyTraffic || []} />
              </ChartErrorBoundary>
            </div>
          </section>
          <section>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
               <div className="flex items-center gap-2 mb-6">
                  <Users className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-bold">Reader Retention (By Cohort)</h2>
                </div>
              <ChartErrorBoundary chartName="Reader Retention">
                <RetentionChart data={charts.retentionData || []} />
              </ChartErrorBoundary>
            </div>
          </section>
        </div>

        {/* CONTENT METRICS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
              <h2 className="text-lg font-bold mb-6">Top Series (By Views)</h2>
              <ChartErrorBoundary chartName="Top Series">
                <HorizontalBarChart data={charts.topSeries || []} xKey="views" yKey="views" nameKey="name" color="#3b82f6" />
              </ChartErrorBoundary>
            </div>
          </section>
          <section>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
              <h2 className="text-lg font-bold mb-6">Most Read Chapters</h2>
              <ChartErrorBoundary chartName="Most Read Chapters">
                <HorizontalBarChart data={charts.mostReadChapters || []} xKey="views" yKey="views" nameKey="name" color="#eab308" />
              </ChartErrorBoundary>
            </div>
          </section>
        </div>

        {/* DEMOGRAPHICS & DEVICES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <section>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
              <div className="flex items-center gap-2 mb-6">
                 <Globe className="h-5 w-5 text-green-500" />
                 <h2 className="text-lg font-bold">Top Countries</h2>
              </div>
              <ChartErrorBoundary chartName="Country Statistics">
                <HorizontalBarChart data={charts.countryStats || []} xKey="value" yKey="value" nameKey="name" color="#22c55e" />
              </ChartErrorBoundary>
            </div>
          </section>
          <section>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
              <div className="flex items-center gap-2 mb-6">
                 <Smartphone className="h-5 w-5 text-purple-500" />
                 <h2 className="text-lg font-bold">Device Breakdown</h2>
              </div>
              <ChartErrorBoundary chartName="Device Statistics">
                <DeviceDistributionChart data={charts.deviceStats || []} />
              </ChartErrorBoundary>
            </div>
          </section>
        </div>

        {/* MISC */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <section>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
              <div className="flex items-center gap-2 mb-6">
                <Search className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-bold">Top Search Queries</h2>
              </div>
              <ChartErrorBoundary chartName="Search Analytics">
                <HorizontalBarChart data={charts.searchAnalytics || []} xKey="count" yKey="count" nameKey="query" color="#f97316" />
              </ChartErrorBoundary>
            </div>
          </section>
          <section>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
              <h2 className="text-lg font-bold mb-6">Top Genres</h2>
              <ChartErrorBoundary chartName="Reading Distribution">
                <ReadingDistributionChart data={charts.readingDistribution || []} />
              </ChartErrorBoundary>
            </div>
          </section>
           <section>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
              <h2 className="text-lg font-bold mb-6">User Growth</h2>
              <ChartErrorBoundary chartName="User Growth">
                <UserGrowthChart data={charts.userGrowth || []} />
              </ChartErrorBoundary>
            </div>
          </section>
        </div>

      </div>

      {/* SYSTEM HEALTH */}
      <section>
        <ChartErrorBoundary chartName="System Health">
          <SystemHealthPanel />
        </ChartErrorBoundary>
      </section>

    </div>
  );
}
