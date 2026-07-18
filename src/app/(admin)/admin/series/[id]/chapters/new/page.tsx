import { createChapter } from '@/app/actions/admin/chapters';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function NewChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const series = await prisma.series.findUnique({
    where: { id },
    select: { title: true }
  });

  if (!series) return <div>Series not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Add Chapter to {series.title}</h1>
        <p className="text-text-secondary">Upload a new chapter.</p>
      </div>

      <form action={createChapter.bind(null, id)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Chapter Number *</label>
            <input 
              name="number" 
              type="number"
              step="0.1"
              required 
              className="w-full rounded-lg border border-border bg-card px-4 py-2" 
              placeholder="e.g. 1 or 1.5" 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold">Chapter Title (Optional)</label>
            <input 
              name="title" 
              className="w-full rounded-lg border border-border bg-card px-4 py-2" 
              placeholder="e.g. The Beginning" 
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold flex justify-between">
            <span>Image URLs *</span>
            <span className="text-xs text-text-secondary font-normal">One URL per line</span>
          </label>
          <textarea 
            name="imageUrls" 
            required 
            rows={10}
            className="w-full rounded-lg border border-border bg-card px-4 py-2 font-mono text-sm" 
            placeholder="https://.../page1.jpg&#10;https://.../page2.jpg" 
          />
        </div>
        
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="isPublished"
            name="isPublished" 
            defaultChecked
            className="h-4 w-4 rounded border-border bg-card text-primary"
          />
          <label htmlFor="isPublished" className="text-sm font-semibold">Publish immediately</label>
        </div>

        <div className="flex justify-end gap-4 border-t border-border pt-6">
          <Link 
            href={`/admin/series/${id}/chapters`} 
            className="rounded-lg px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface"
          >
            Cancel
          </Link>
          <button 
            type="submit" 
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Create Chapter
          </button>
        </div>
      </form>
    </div>
  );
}
