import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Plus, Trash2, Link as LinkIcon } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { deleteChapter } from '@/app/actions/admin/chapters';

export default async function AdminChaptersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const series = await prisma.series.findUnique({
    where: { id },
    include: {
      chapters: {
        orderBy: [{ number: 'asc' }, { createdAt: 'asc' }]
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
                  <td className="px-6 py-4 font-bold text-text-primary flex items-center gap-2">
                    {chapter.label || `Chapter ${chapter.number}`}
                    {chapter.sourceType === 'EXTERNAL' && <span title={`External Link: ${chapter.externalProvider}`}><LinkIcon className="h-4 w-4 text-primary" /></span>}
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{chapter.title || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      chapter.isPublished ? 'bg-primary/10 text-primary' : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {chapter.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-text-secondary">
                    {chapter.sourceType === 'EXTERNAL' ? '-' : chapter.totalPages}
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{formatDate(chapter.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={`/admin/series/${series.id}/chapters/${chapter.id}/preview`}
                        className="rounded-lg p-2 text-text-secondary hover:bg-surface-hover transition-colors"
                        title="Preview Chapter"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      </Link>
                      <Link 
                        href={`/admin/series/${series.id}/chapters/${chapter.id}/edit`}
                        className="rounded-lg p-2 text-text-secondary hover:bg-surface-hover transition-colors"
                        title="Edit Chapter"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                      </Link>
                      <form action={deleteChapter.bind(null, chapter.id, series.id)}>
                        <button 
                          type="submit"
                          className="rounded-lg p-2 text-text-secondary hover:bg-red-500/10 hover:text-red-500 transition-colors"
                          title="Delete Chapter"
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
