'use client';

import Link from 'next/link';
import { ExternalLink, Edit, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface SeriesSeo {
  id: string;
  title: string;
  slug: string;
  seoTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  canonical: string | null;
  wordCount: number;
  isIndexable: boolean;
  optimized: boolean;
  seoScore?: number;
  missingFields?: string[];
  warnings?: string[];
  isDuplicateTitle?: boolean;
  isDuplicateDesc?: boolean;
  isInvalidCanonical?: boolean;
}

export function SeriesSeoTable({ seriesList }: { seriesList: SeriesSeo[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Series SEO Configuration</h2>
          <p className="text-sm text-text-secondary">Detailed metadata breakdown, scoring, and duplicate detection per series</p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface/50 text-text-secondary border-b border-border">
            <tr>
              <th className="px-6 py-4 font-semibold">Series</th>
              <th className="px-6 py-4 font-semibold">SEO Score</th>
              <th className="px-6 py-4 font-semibold">Missing Fields</th>
              <th className="px-6 py-4 font-semibold">Health & Warnings</th>
              <th className="px-6 py-4 font-semibold text-center">Indexable</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {seriesList.map(series => {
              const score = series.seoScore !== undefined ? series.seoScore : (series.optimized ? 95 : 45);
              const missing = series.missingFields || [];

              return (
                <tr key={series.id} className="hover:bg-surface/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-text-primary flex items-center gap-2">
                      {series.title}
                      <a href={`/series/${series.slug}`} target="_blank" rel="noreferrer" className="text-text-muted hover:text-primary">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    <div className="text-xs text-text-muted mt-1">{series.wordCount} words</div>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                      score >= 80 ? 'bg-success/10 text-success' : score >= 50 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'
                    }`}>
                      {score}/100
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    {missing.length === 0 ? (
                      <span className="text-xs text-success flex items-center gap-1 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> All Present
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {missing.map((f, i) => (
                          <span key={i} className="inline-flex rounded bg-danger/10 text-danger px-1.5 py-0.5 text-[11px] font-medium">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="space-y-1 max-w-xs">
                      {series.isDuplicateTitle && (
                        <div className="text-[11px] text-danger flex items-center gap-1 bg-danger/5 px-2 py-0.5 rounded border border-danger/10 font-medium">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> Duplicate Title
                        </div>
                      )}
                      {series.isDuplicateDesc && (
                        <div className="text-[11px] text-danger flex items-center gap-1 bg-danger/5 px-2 py-0.5 rounded border border-danger/10 font-medium">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> Duplicate Description
                        </div>
                      )}
                      {series.isInvalidCanonical && (
                        <div className="text-[11px] text-warning flex items-center gap-1 bg-warning/5 px-2 py-0.5 rounded border border-warning/10 font-medium">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> Invalid Canonical
                        </div>
                      )}
                      {!series.isDuplicateTitle && !series.isDuplicateDesc && !series.isInvalidCanonical && (!series.warnings || series.warnings.length === 0) && (
                        <span className="text-xs text-text-muted">No issues</span>
                      )}
                      {series.warnings && series.warnings.filter(w => !w.includes('Duplicate') && !w.includes('Canonical')).map((w, i) => (
                        <div key={i} className="text-[11px] text-warning flex items-center gap-1 bg-warning/5 px-2 py-0.5 rounded border border-warning/10 font-medium">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> {w}
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    {series.isIndexable ? (
                      <span title="Indexable by search engines" className="inline-block">
                        <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                      </span>
                    ) : (
                      <span title="Noindex applied" className="inline-block">
                        <XCircle className="h-5 w-5 text-danger mx-auto" />
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/admin/series/${series.id}/edit`}
                      className="inline-flex items-center gap-1.5 text-primary hover:text-primary-hover font-semibold bg-primary/10 hover:bg-primary/20 px-3.5 py-1.5 rounded-lg transition-colors text-xs"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
