'use client';

import Link from 'next/link';
import { ExternalLink, Edit, CheckCircle2, XCircle } from 'lucide-react';

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
}

export function SeriesSeoTable({ seriesList }: { seriesList: SeriesSeo[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Series SEO Configuration</h2>
          <p className="text-sm text-text-secondary">Manage metadata for your top-level series pages</p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface/50 text-text-secondary">
            <tr>
              <th className="px-6 py-4 font-semibold">Series</th>
              <th className="px-6 py-4 font-semibold">Metadata Status</th>
              <th className="px-6 py-4 font-semibold">Indexable</th>
              <th className="px-6 py-4 font-semibold">Missing Fields</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {seriesList.map(series => {
              const missing = [];
              if (!series.seoTitle) missing.push('Title');
              if (!series.metaDescription) missing.push('Desc');
              if (!series.ogImage) missing.push('OG Image');
              if (!series.canonical) missing.push('Canonical');

              return (
                <tr key={series.id} className="hover:bg-surface/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-text-primary flex items-center gap-2">
                      {series.title}
                      <a href={`/series/${series.slug}`} target="_blank" rel="noreferrer" className="text-text-muted hover:text-primary">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="text-xs text-text-muted mt-1">{series.wordCount} words</div>
                  </td>
                  <td className="px-6 py-4">
                    {series.optimized ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                        Optimized
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning">
                        Needs Work
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {series.isIndexable ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-danger" />
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-text-muted">
                    {missing.length === 0 ? '-' : missing.join(', ')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/admin/series/${series.id}/edit`}
                      className="inline-flex items-center gap-1 text-primary hover:text-primary-hover font-semibold bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Edit className="h-4 w-4" />
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
