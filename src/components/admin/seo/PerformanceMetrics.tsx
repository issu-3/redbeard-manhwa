'use client';

import { Zap } from 'lucide-react';

interface PerformanceData {
  lcp: string;
  lcpStatus: string;
  cls: string;
  clsStatus: string;
  inp: string;
  inpStatus: string;
  ttfb: string;
  ttfbStatus: string;
}

export function PerformanceMetrics({ performance }: { performance: PerformanceData }) {
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-success bg-success/10 border-success/20';
      case 'warning': return 'text-warning bg-warning/10 border-warning/20';
      case 'fail': return 'text-danger bg-danger/10 border-danger/20';
      default: return 'text-text-muted bg-surface/50 border-border';
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Core Web Vitals</h2>
            <p className="text-sm text-text-secondary">Field data performance (Last 28 days)</p>
          </div>
        </div>
      </div>
      
      <div className="p-6 grid grid-cols-2 gap-4 flex-grow">
        <MetricBox label="LCP (Largest Contentful Paint)" value={performance.lcp} colorClass={getStatusColor(performance.lcpStatus)} />
        <MetricBox label="CLS (Cumulative Layout Shift)" value={performance.cls} colorClass={getStatusColor(performance.clsStatus)} />
        <MetricBox label="INP (Interaction to Next Paint)" value={performance.inp} colorClass={getStatusColor(performance.inpStatus)} />
        <MetricBox label="TTFB (Time to First Byte)" value={performance.ttfb} colorClass={getStatusColor(performance.ttfbStatus)} />
      </div>
    </div>
  );
}

function MetricBox({ label, value, colorClass }: { label: string, value: string, colorClass: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-surface/30 p-4 flex flex-col justify-center">
      <span className="text-xs text-text-secondary mb-1">{label}</span>
      <span className={`text-2xl font-black px-3 py-1 rounded-md border inline-flex self-start ${colorClass}`}>
        {value}
      </span>
    </div>
  );
}
