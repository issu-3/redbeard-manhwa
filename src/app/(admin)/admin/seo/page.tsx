import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SEO Health Dashboard',
};

// Helper to check if a record has SEO data
function hasSeo(record: { seo: any }) {
  if (!record.seo) return false;
  try {
    const seo = typeof record.seo === 'string' ? JSON.parse(record.seo) : record.seo;
    return !!(seo.title || seo.description || seo.keywords || seo.focusKeyword);
  } catch (e) {
    return false;
  }
}

export default async function SeoHealthPage() {
  const [allSeries, allChapters] = await Promise.all([
    prisma.series.findMany({ select: { id: true, title: true, slug: true, seo: true } }),
    prisma.chapter.findMany({ select: { id: true, number: true, slug: true, series: { select: { title: true, slug: true } }, seo: true } })
  ]);

  const seriesWithSeo = allSeries.filter(hasSeo);
  const chaptersWithSeo = allChapters.filter(hasSeo);

  const seriesWithoutSeo = allSeries.filter(s => !hasSeo(s));

  const seriesScore = allSeries.length > 0 ? (seriesWithSeo.length / allSeries.length) * 100 : 100;
  const chaptersScore = allChapters.length > 0 ? (chaptersWithSeo.length / allChapters.length) * 100 : 100;

  const totalScore = Math.round((seriesScore + chaptersScore) / 2);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
          <Search className="h-8 w-8 text-primary" />
          SEO Health Dashboard
        </h1>
        <p className="text-text-secondary mt-1">
          Monitor and improve your platform's search engine optimization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-text-secondary">Overall SEO Score</h3>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={`text-4xl font-black ${totalScore >= 80 ? 'text-success' : totalScore >= 50 ? 'text-warning' : 'text-danger'}`}>
              {totalScore}%
            </span>
          </div>
          <p className="mt-1 text-sm text-text-muted">Combined score across all entities</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-text-secondary">Series Optimized</h3>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-text-primary">{seriesWithSeo.length}</span>
            <span className="text-lg font-medium text-text-muted">/ {allSeries.length}</span>
          </div>
          <p className="mt-1 text-sm text-text-muted">Series with custom SEO metadata</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-text-secondary">Chapters Optimized</h3>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-text-primary">{chaptersWithSeo.length}</span>
            <span className="text-lg font-medium text-text-muted">/ {allChapters.length}</span>
          </div>
          <p className="mt-1 text-sm text-text-muted">Chapters with custom SEO metadata</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Series Needing Optimization</h2>
            <p className="text-sm text-text-secondary">These series are missing custom SEO metadata</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1 text-sm font-medium text-warning">
            <AlertTriangle className="h-4 w-4" />
            {seriesWithoutSeo.length} Needs Attention
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface/50 text-text-secondary">
              <tr>
                <th className="px-6 py-4 font-semibold">Series Title</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {seriesWithoutSeo.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-text-muted">
                    <CheckCircle className="mx-auto h-8 w-8 text-success mb-2" />
                    All series are fully optimized!
                  </td>
                </tr>
              ) : (
                seriesWithoutSeo.map(series => (
                  <tr key={series.id} className="hover:bg-surface/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{series.title}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-semibold text-danger">
                        Missing Metadata
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/admin/series/${series.id}/edit`}
                        className="text-primary hover:text-primary-hover font-semibold"
                      >
                        Optimize
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
