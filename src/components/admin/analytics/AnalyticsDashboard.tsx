'use client';

import { useRouter } from 'next/navigation';
import { 
  Users, BookOpen, Layers, MessageSquare, Activity, Bookmark, Eye, Fingerprint
} from 'lucide-react';
import { MetricCard } from './MetricCard';
import { 
  DailyTrafficChart, 
  UserGrowthChart, 
  PublishingActivityChart, 
  ReadingDistributionChart 
} from './AnalyticsCharts';

export function AnalyticsDashboard({ initialData, currentRange }: { initialData: any, currentRange: string }) {
  const router = useRouter();

  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`/admin/analytics?range=${e.target.value}`);
  };

  const { overview, charts, lastUpdated } = initialData;

  const isAllTime = currentRange === 'all';
  const prefix = isAllTime ? 'Total' : 'New';

  return (
    <div className="space-y-8 pb-12">
      
      {/* Filters & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border border-border p-4 rounded-xl">
        <div className="flex items-center gap-2 text-sm">
          <Activity className="h-5 w-5 text-primary" />
          <span className="font-medium">Data Sync: Live</span>
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
          <MetricCard title={`${prefix} Users`} value={overview.users.value.toLocaleString()} trend={overview.users.trend} sparkline={overview.users.sparkline} lastUpdated={lastUpdated} icon={Users} />
          <MetricCard title="Active Users" value={overview.activeUsers.value.toLocaleString()} trend={overview.activeUsers.trend} sparkline={overview.activeUsers.sparkline} lastUpdated={lastUpdated} icon={Users} />
          <MetricCard title={`${prefix} Series`} value={overview.series.value.toLocaleString()} trend={overview.series.trend} sparkline={overview.series.sparkline} lastUpdated={lastUpdated} icon={BookOpen} />
          <MetricCard title={`${prefix} Chapters`} value={overview.chapters.value.toLocaleString()} trend={overview.chapters.trend} sparkline={overview.chapters.sparkline} lastUpdated={lastUpdated} icon={Layers} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Views" value={overview.views.value.toLocaleString()} trend={overview.views.trend} sparkline={overview.views.sparkline} lastUpdated={lastUpdated} icon={Eye} />
          <MetricCard title="Unique Visitors" value={overview.uniqueVisitors.value.toLocaleString()} trend={overview.uniqueVisitors.trend} sparkline={overview.uniqueVisitors.sparkline} lastUpdated={lastUpdated} icon={Fingerprint} />
          <MetricCard title={`${prefix} Bookmarks`} value={overview.bookmarks.value.toLocaleString()} trend={overview.bookmarks.trend} sparkline={overview.bookmarks.sparkline} lastUpdated={lastUpdated} icon={Bookmark} />
          <MetricCard title={`${prefix} Comments`} value={overview.comments.value.toLocaleString()} trend={overview.comments.trend} sparkline={overview.comments.sparkline} lastUpdated={lastUpdated} icon={MessageSquare} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8">
        {/* TRAFFIC TREND */}
        <section>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Daily Traffic</h2>
              <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded">Reads</span>
            </div>
            <DailyTrafficChart data={charts.dailyTraffic} />
          </div>
        </section>

        {/* 2 COLUMN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
              <h2 className="text-lg font-bold mb-6">User Growth</h2>
              <UserGrowthChart data={charts.userGrowth} />
            </div>
          </section>
          <section>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
              <h2 className="text-lg font-bold mb-6">Publishing Activity</h2>
              <PublishingActivityChart data={charts.publishingActivity} />
            </div>
          </section>
        </div>

        {/* READING DISTRIBUTION */}
        <section>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
            <h2 className="text-lg font-bold mb-6">Reading Distribution (Top Genres / Series)</h2>
            <ReadingDistributionChart data={charts.readingDistribution} />
          </div>
        </section>
      </div>

    </div>
  );
}
