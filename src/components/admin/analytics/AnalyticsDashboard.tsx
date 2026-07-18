'use client';

import { useRouter } from 'next/navigation';
import { 
  Users, BookOpen, Layers, MessageSquare, Activity, Bookmark, Eye, Fingerprint
} from 'lucide-react';
import { MetricCard } from './MetricCard';
import { TrafficLineChart, ContentBarChart, SimplePieChart } from './AnalyticsCharts';

export function AnalyticsDashboard({ initialData, currentRange }: { initialData: any, currentRange: string }) {
  const router = useRouter();

  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`/admin/analytics?range=${e.target.value}`);
  };

  const { overview, traffic, content, users } = initialData;

  const isAllTime = currentRange === 'all';

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
          <MetricCard title={isAllTime ? "Total Users" : "New Users"} value={overview.newUsers.toLocaleString()} icon={Users} />
          <MetricCard title={isAllTime ? "Total Series" : "New Series"} value={overview.totalSeries.toLocaleString()} icon={BookOpen} />
          <MetricCard title={isAllTime ? "Total Chapters" : "New Chapters"} value={overview.totalChapters.toLocaleString()} icon={Layers} />
          <MetricCard title={isAllTime ? "Total Comments" : "New Comments"} value={overview.newComments.toLocaleString()} icon={MessageSquare} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard title="New Bookmarks" value={overview.newBookmarks.toLocaleString()} icon={Bookmark} />
          <MetricCard title="Chapter Views" value={overview.chapterViews.toLocaleString()} icon={Eye} />
          <MetricCard title="Unique Visitors" value={overview.uniqueVisitors.toLocaleString()} icon={Fingerprint} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* TRAFFIC TREND */}
        <section className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Traffic & Views</h2>
              <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded">Reads</span>
            </div>
            <TrafficLineChart data={traffic} />
          </div>
        </section>
        
        {/* TOP GENRES */}
        <section className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
            <h2 className="text-lg font-bold mb-6">Top Genres</h2>
            <div className="space-y-4">
              {content.topGenres.map((g: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{g.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-surface rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, (g.value / (content.topGenres[0]?.value || 1)) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-bold w-8 text-right">{g.value}</span>
                  </div>
                </div>
              ))}
              {content.topGenres.length === 0 && (
                <div className="text-sm text-text-muted text-center py-4">No genres found</div>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CONTENT BREAKDOWN */}
        <section className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
            <h2 className="text-lg font-bold mb-6">Content by Status</h2>
            <ContentBarChart data={content.byStatus} />
          </div>
        </section>

        {/* USER ROLES */}
        <section className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
            <h2 className="text-lg font-bold mb-6">User Roles</h2>
            <SimplePieChart data={users} />
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {users.map((u: any, i: number) => (
                <div key={u.name} className="flex items-center gap-1.5 text-xs font-medium">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#ef4444', '#f97316', '#eab308'][i] }} />
                  {u.name} ({u.value})
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
