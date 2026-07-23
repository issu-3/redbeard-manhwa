'use client';

import { Search } from 'lucide-react';
import { OverviewCards } from './OverviewCards';
import { TechnicalAudit } from './TechnicalAudit';
import { PerformanceMetrics } from './PerformanceMetrics';
import { GscConnector } from './GscConnector';
import { SeoTimeline } from './SeoTimeline';
import { AiAssistant } from './AiAssistant';
import { QuickActions } from './QuickActions';
import { SeriesSeoTable } from './SeriesSeoTable';
import { ChapterSeoTable } from './ChapterSeoTable';

interface SeoData {
  overview: any;
  series: any[];
  chapters: any[];
  technicalAudit: any[];
  performance: any;
  gsc: any;
  timelineData: any[];
  aiSuggestions: any[];
}

export function SeoDashboard({ data }: { data: SeoData }) {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Search className="h-8 w-8 text-primary" />
            SEO Health Dashboard
          </h1>
          <p className="text-text-secondary mt-1">
            Professional SEO monitoring and optimization platform.
          </p>
        </div>
        <QuickActions />
      </div>

      {/* Main Scores */}
      <OverviewCards overview={data.overview} />

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <SeoTimeline data={data.timelineData} />
          <GscConnector gsc={data.gsc} />
        </div>
        <div className="flex flex-col gap-6">
          <TechnicalAudit auditData={data.technicalAudit} />
        </div>
      </div>

      {/* Next Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.performance && <PerformanceMetrics performance={data.performance} />}
        <div className={data.performance ? "" : "lg:col-span-2"}>
          <AiAssistant suggestions={data.aiSuggestions} />
        </div>
      </div>

      {/* Content Tables */}
      <div className="space-y-6 pt-4 border-t border-border">
        <SeriesSeoTable seriesList={data.series} />
        <ChapterSeoTable chapters={data.chapters} />
      </div>
    </div>
  );
}
