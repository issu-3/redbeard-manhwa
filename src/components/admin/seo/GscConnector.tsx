'use client';

import { BarChart3, MousePointerClick, Eye, TrendingUp, Search, XCircle } from 'lucide-react';

interface GscData {
  clicks: string;
  impressions: string;
  ctr: string;
  avgPosition: string;
  indexedPages: number;
  crawlErrors: number;
}

export function GscConnector({ gsc }: { gsc: GscData }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#4285F4]/10 rounded-lg text-[#4285F4]">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Google Search Console</h2>
            <p className="text-sm text-text-secondary">Organic traffic overview</p>
          </div>
        </div>
        <button className="px-3 py-1.5 bg-surface text-text-secondary text-sm font-medium rounded-lg border border-border hover:bg-surface/70 transition-colors">
          Connect Account
        </button>
      </div>
      
      <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        <Metric title="Total Clicks" value={gsc.clicks} icon={<MousePointerClick className="h-4 w-4 text-primary" />} />
        <Metric title="Total Impressions" value={gsc.impressions} icon={<Eye className="h-4 w-4 text-purple-500" />} />
        <Metric title="Average CTR" value={gsc.ctr} icon={<TrendingUp className="h-4 w-4 text-success" />} />
        <Metric title="Avg. Position" value={gsc.avgPosition} icon={<BarChart3 className="h-4 w-4 text-warning" />} />
        <Metric title="Indexed Pages" value={gsc.indexedPages.toString()} icon={<CheckCircle className="h-4 w-4 text-success" />} />
        <Metric title="Crawl Errors" value={gsc.crawlErrors.toString()} icon={<XCircle className="h-4 w-4 text-danger" />} />
      </div>
    </div>
  );
}

function Metric({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl border border-border/50 bg-surface/20 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-text-secondary text-sm font-medium">
        {icon}
        {title}
      </div>
      <div className="text-2xl font-bold text-text-primary">{value}</div>
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}
