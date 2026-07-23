'use client';

import Link from 'next/link';
import { ExternalLink, Edit, CheckCircle2, XCircle } from 'lucide-react';

interface ChapterSeo {
  id: string;
  seriesTitle: string;
  number: number | null;
  title: string | null;
  label: string | null;
  slug: string;
  seriesId: string;
  seoTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  canonical: string | null;
  isIndexable: boolean;
  optimized: boolean;
}

export function ChapterSeoTable({ chapters }: { chapters: ChapterSeo[] }) {
  const optimizedCount = chapters.filter(c => c.optimized).length;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Chapter SEO Configuration</h2>
          <p className="text-sm text-text-secondary">Optimize individual chapters for long-tail keywords</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-sm font-semibold text-text-secondary">Optimization Progress</div>
          <div className="text-lg font-bold text-text-primary">{optimizedCount} / {chapters.length}</div>
        </div>
      </div>
      
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-left text-sm relative">
          <thead className="bg-surface/90 backdrop-blur-sm text-text-secondary sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 font-semibold">Chapter</th>
              <th className="px-6 py-4 font-semibold">Metadata Status</th>
              <th className="px-6 py-4 font-semibold">Indexable</th>
              <th className="px-6 py-4 font-semibold">Missing Fields</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {chapters.map(chapter => {
              const missing = [];
              if (!chapter.seoTitle) missing.push('Title');
              if (!chapter.metaDescription) missing.push('Desc');
              if (!chapter.ogImage) missing.push('OG Image');
              if (!chapter.canonical) missing.push('Canonical');

              return (
                <tr key={chapter.id} className="hover:bg-surface/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-text-primary flex flex-col">
                      <span>{chapter.seriesTitle}</span>
                      <span className="text-xs text-text-muted mt-0.5">
                        {chapter.label ? chapter.label : (chapter.number !== null ? `Ch. ${chapter.number}` : (chapter.title || 'Oneshot'))}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {chapter.optimized ? (
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
                    {chapter.isIndexable ? (
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
                      href={`/admin/series/${chapter.seriesId}/chapters/${chapter.id}/edit`}
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
