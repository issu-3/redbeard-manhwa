'use client';

import { useRouter } from 'next/navigation';
import { 
  Users, BookOpen, Layers, MessageSquare, Activity, Monitor, DollarSign, Search, AlertCircle 
} from 'lucide-react';
import { MetricCard } from './MetricCard';
import { TrafficLineChart, ContentBarChart, SimplePieChart, RevenueLineChart } from './AnalyticsCharts';

export function AnalyticsDashboard({ initialData, currentRange }: { initialData: any, currentRange: string }) {
  const router = useRouter();

  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`/admin/analytics?range=${e.target.value}`);
  };

  const { overview, traffic, content, users, revenue, devices, search, system, errors } = initialData;

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Users" value={overview.totalUsers.toLocaleString()} trend={12} icon={Users} />
          <MetricCard title="Total Series" value={overview.totalSeries.toLocaleString()} trend={4} icon={BookOpen} />
          <MetricCard title="Total Chapters" value={overview.totalChapters.toLocaleString()} trend={8} icon={Layers} />
          <MetricCard title="Total Comments" value={overview.totalComments.toLocaleString()} trend={-2} icon={MessageSquare} />
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

        {/* REVENUE */}
        <section className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Estimated Revenue</h2>
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div className="mb-6">
              <div className="text-4xl font-black text-text-primary mb-1">${revenue.total.toLocaleString()}</div>
              <div className="text-sm text-text-muted">+8.4% from previous period</div>
            </div>
            <div className="flex-1 flex items-end">
              <RevenueLineChart data={revenue.timeline} />
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
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* DEVICES */}
        <section>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Devices</h2>
              <Monitor className="h-5 w-5 text-text-muted" />
            </div>
            <SimplePieChart data={devices} />
            <div className="flex justify-center gap-4 mt-4">
              {devices.map((d: any, i: number) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs font-medium">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#ef4444', '#f97316', '#eab308'][i] }} />
                  {d.name}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SEARCH QUERIES */}
        <section>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Top Search Queries</h2>
              <Search className="h-5 w-5 text-text-muted" />
            </div>
            <div className="space-y-4">
              {search.map((s: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-3 bg-surface rounded-lg">
                  <span className="text-sm font-medium">"{s.query}"</span>
                  <span className="text-xs font-bold text-text-muted">{s.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* USER ROLES */}
        <section>
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

      {/* SYSTEM & ERRORS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
            <h2 className="text-lg font-bold mb-6">System Health</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-surface rounded-lg border border-border">
                <div className="text-xs text-text-muted mb-1">Uptime</div>
                <div className="text-2xl font-black text-success">{system.uptime}</div>
              </div>
              <div className="p-4 bg-surface rounded-lg border border-border">
                <div className="text-xs text-text-muted mb-1">Avg Response</div>
                <div className="text-2xl font-black">{system.avgResponseTime}</div>
              </div>
              <div className="p-4 bg-surface rounded-lg border border-border">
                <div className="text-xs text-text-muted mb-1">DB Load</div>
                <div className="text-2xl font-black">{system.databaseLoad}</div>
              </div>
              <div className="p-4 bg-surface rounded-lg border border-border">
                <div className="text-xs text-text-muted mb-1">Active Connections</div>
                <div className="text-2xl font-black">{system.activeConnections}</div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Recent Errors</h2>
              <AlertCircle className="h-5 w-5 text-error" />
            </div>
            <div className="space-y-3">
              {errors.map((err: any) => (
                <div key={err.id} className={`p-3 rounded-lg border ${
                  err.level === 'error' ? 'bg-error/5 border-error/20 text-error' :
                  err.level === 'warning' ? 'bg-warning/5 border-warning/20 text-warning' :
                  'bg-info/5 border-info/20 text-info'
                }`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold uppercase">{err.type}</span>
                    <span className="text-xs opacity-70">{err.time}</span>
                  </div>
                  <p className="text-sm font-medium">{err.message}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
