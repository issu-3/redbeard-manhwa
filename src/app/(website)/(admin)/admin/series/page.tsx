import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { deleteSeries } from '@/app/actions/admin/series';
import { getContentTypeLabel } from '@/lib/content-types';

export default async function AdminSeriesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const currentPage = parseInt(page || '1', 10);
  const take = 50;
  const skip = (currentPage - 1) * take;

  let seriesList: any[] = [];
  let totalSeries = 0;
  try {
    const [fetchedSeries, count] = await Promise.all([
      prisma.series.findMany({
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { chapters: true } } }
      }),
      prisma.series.count()
    ]);
    seriesList = fetchedSeries;
    totalSeries = count;
  } catch (err) {
    console.error('Failed to load admin series list:', err);
  }

  const totalPages = Math.ceil(totalSeries / take);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Series Management</h1>
          <p className="text-text-secondary">Manage all series on the platform.</p>
        </div>
        <Link 
          href="/admin/series/new" 
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Series
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            {/* Table content remains exactly the same */}
            <thead className="bg-surface border-b border-border text-text-secondary">
              <tr>
                <th className="px-6 py-4 font-semibold">Title</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Chapters</th>
                <th className="px-6 py-4 font-semibold">Added</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {seriesList.map((series) => (
                <tr key={series.id} className="hover:bg-surface/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 rounded overflow-hidden">
                        <Image src={series.coverImage} alt={series.title} fill className="object-cover" sizes="40px" />
                      </div>
                      <div>
                        <div className="font-semibold text-text-primary">{series.title}</div>
                        <div className="text-xs text-text-secondary">{series.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      {series.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">
                      {getContentTypeLabel(series.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{series._count.chapters}</td>
                  <td className="px-6 py-4 text-text-secondary">{formatDate(series.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={`/admin/series/${series.id}/chapters`}
                        className="rounded-lg p-2 text-text-secondary hover:bg-surface hover:text-primary transition-colors"
                        title="Manage Chapters"
                      >
                        <BookOpenIcon className="h-4 w-4" />
                      </Link>
                      <Link 
                        href={`/admin/series/${series.id}/edit`}
                        className="rounded-lg p-2 text-text-secondary hover:bg-surface hover:text-primary transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <form action={deleteSeries.bind(null, series.id)}>
                        <button 
                          type="submit"
                          className="rounded-lg p-2 text-text-secondary hover:bg-red-500/10 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {seriesList.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                    No series found. Click &quot;Add Series&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border bg-surface px-6 py-4">
            <p className="text-sm text-text-secondary">
              Showing <span className="font-semibold text-text-primary">{Math.min(skip + 1, totalSeries)}</span> to{' '}
              <span className="font-semibold text-text-primary">{Math.min(skip + take, totalSeries)}</span> of{' '}
              <span className="font-semibold text-text-primary">{totalSeries}</span> entries
            </p>
            <div className="flex gap-2">
              {currentPage > 1 ? (
                <Link
                  href={`/admin/series?page=${currentPage - 1}`}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-surface transition-colors"
                >
                  Previous
                </Link>
              ) : (
                <button disabled className="rounded-lg border border-border bg-card/50 px-4 py-2 text-sm font-semibold text-text-muted cursor-not-allowed">
                  Previous
                </button>
              )}
              
              {currentPage < totalPages ? (
                <Link
                  href={`/admin/series?page=${currentPage + 1}`}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-surface transition-colors"
                >
                  Next
                </Link>
              ) : (
                <button disabled className="rounded-lg border border-border bg-card/50 px-4 py-2 text-sm font-semibold text-text-muted cursor-not-allowed">
                  Next
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BookOpenIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
