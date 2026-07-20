import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { deleteSeries } from '@/app/actions/admin/series';

export default async function AdminSeriesPage() {
  const seriesList = await prisma.series.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { chapters: true } } }
  });

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
                  <td className="px-6 py-4 text-text-secondary">{series.type}</td>
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
