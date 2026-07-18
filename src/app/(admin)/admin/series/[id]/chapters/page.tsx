import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { deleteChapter } from '@/app/actions/admin/chapters';

export default async function AdminChaptersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const series = await prisma.series.findUnique({
    where: { id },
    include: {
      chapters: {
        orderBy: { number: 'desc' }
      }
    }
  });

  if (!series) return <div>Series not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Chapters for {series.title}</h1>
          <p className="text-text-secondary">Manage chapters for this series.</p>
        </div>
        <Link 
          href={`/admin/series/${series.id}/chapters/new`} 
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Chapter
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface border-b border-border text-text-secondary">
              <tr>
                <th className="px-6 py-4 font-semibold">Number</th>
                <th className="px-6 py-4 font-semibold">Title</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Pages</th>
                <th className="px-6 py-4 font-semibold">Added</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {series.chapters.map((chapter) => (
                <tr key={chapter.id} className="hover:bg-surface/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-text-primary">Chapter {chapter.number}</td>
                  <td className="px-6 py-4 text-text-secondary">{chapter.title || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      chapter.isPublished ? 'bg-primary/10 text-primary' : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {chapter.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{chapter.totalPages}</td>
                  <td className="px-6 py-4 text-text-secondary">{formatDate(chapter.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <form action={deleteChapter.bind(null, chapter.id, series.id)}>
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
              {series.chapters.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                    No chapters found. Click &quot;Add Chapter&quot; to create one.
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
