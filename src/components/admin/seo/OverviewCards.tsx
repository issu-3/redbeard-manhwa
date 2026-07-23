'use client';

import { TrendingUp, TrendingDown, Search, SearchCode, Zap, FileText, Layers } from 'lucide-react';

interface Props {
  overview: {
    overallScore: number;
    previousScore: number;
    breakdown: {
      metadata: number;
      technical: number;
      performance: number;
      content: number;
      chapter: number;
    };
  };
}

export function OverviewCards({ overview }: Props) {
  const trend = overview.overallScore - overview.previousScore;
  const isUp = trend >= 0;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-hover" />
          <h3 className="text-sm font-semibold text-text-secondary w-full text-left">Overall Health Score</h3>
          <div className="mt-6 flex flex-col items-center">
            <span className={`text-6xl font-black tracking-tighter ${getScoreColor(overview.overallScore)}`}>
              {overview.overallScore}
            </span>
            <div className="mt-2 flex items-center gap-1.5 text-sm font-medium">
              {isUp ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-danger" />}
              <span className={isUp ? 'text-success' : 'text-danger'}>
                {Math.abs(trend)}% vs previous scan
              </span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-text-secondary mb-4">Score Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <BreakdownItem label="Metadata" score={overview.breakdown.metadata} icon={<Search className="h-4 w-4" />} />
            <BreakdownItem label="Technical SEO" score={overview.breakdown.technical} icon={<SearchCode className="h-4 w-4" />} />
            <BreakdownItem label="Content SEO" score={overview.breakdown.content} icon={<FileText className="h-4 w-4" />} />
            <BreakdownItem label="Chapter SEO" score={overview.breakdown.chapter} icon={<Layers className="h-4 w-4" />} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BreakdownItem({ label, score, icon }: { label: string, score: number, icon: React.ReactNode }) {
  const getProgressColor = (s: number) => {
    if (s >= 90) return 'bg-success';
    if (s >= 70) return 'bg-warning';
    return 'bg-danger';
  };

  return (
    <div className="rounded-xl border border-border/50 bg-surface/30 p-4">
      <div className="flex items-center gap-2 text-text-secondary mb-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-bold text-text-primary">{score}/100</span>
      </div>
      <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${getProgressColor(score)} transition-all duration-1000`} 
          style={{ width: `${score}%` }} 
        />
      </div>
    </div>
  );
}
