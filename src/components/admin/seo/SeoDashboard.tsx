'use client';

import { Search, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  const missingFieldsCount = data.series.filter(s => s.missingFields && s.missingFields.length > 0).length;
  const duplicatesCount = data.series.filter(s => s.isDuplicateTitle || s.isDuplicateDesc).length;
  const missingImagesCount = data.series.filter(s => !s.ogImage).length;
  const invalidCanonicalsCount = data.series.filter(s => s.isInvalidCanonical).length;

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
            Production-grade local SEO monitoring, validation, and automated generation engine.
          </p>
        </div>
        <QuickActions />
      </div>

      {/* Main Scores */}
      <OverviewCards overview={data.overview} />

      {/* Quick KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Missing SEO Fields</div>
            <div className={`text-2xl font-black mt-1 flex items-center gap-1.5 ${missingFieldsCount > 0 ? 'text-warning' : 'text-success'}`}>
              {missingFieldsCount} series
              {missingFieldsCount === 0 && <CheckCircle2 className="h-5 w-5 text-success" />}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Duplicate Metadata</div>
            <div className={`text-2xl font-black mt-1 flex items-center gap-1.5 ${duplicatesCount > 0 ? 'text-danger' : 'text-success'}`}>
              {duplicatesCount} detected
              {duplicatesCount === 0 && <CheckCircle2 className="h-5 w-5 text-success" />}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Missing Social Images</div>
            <div className={`text-2xl font-black mt-1 flex items-center gap-1.5 ${missingImagesCount > 0 ? 'text-warning' : 'text-success'}`}>
              {missingImagesCount} pages
              {missingImagesCount === 0 && <CheckCircle2 className="h-5 w-5 text-success" />}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Invalid Canonicals</div>
            <div className={`text-2xl font-black mt-1 flex items-center gap-1.5 ${invalidCanonicalsCount > 0 ? 'text-danger' : 'text-success'}`}>
              {invalidCanonicalsCount} URLs
              {invalidCanonicalsCount === 0 && <CheckCircle2 className="h-5 w-5 text-success" />}
            </div>
          </div>
        </div>
      </div>

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
