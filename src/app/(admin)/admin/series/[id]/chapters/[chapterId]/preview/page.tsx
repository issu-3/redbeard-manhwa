import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function PreviewChapterPage({ params }: { params: Promise<{ id: string; chapterId: string }> }) {
  const { id, chapterId } = await params;
  
  const [series, chapter] = await Promise.all([
    prisma.series.findUnique({
      where: { id },
      select: { title: true }
    }),
    prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        images: {
          orderBy: { pageNumber: 'asc' }
        }
      }
    })
  ]);

  if (!series || !chapter) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Preview Chapter {chapter.number}</h1>
          <p className="text-text-secondary">{series.title}</p>
        </div>
        <Link 
          href={`/admin/series/${id}/chapters`} 
          className="flex items-center gap-2 rounded-lg bg-surface px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Chapters
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col items-center p-4">
        {chapter.images.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            No images found in this chapter.
          </div>
        ) : (
          <div className="w-full flex flex-col max-w-[800px] mx-auto gap-1 bg-black">
            {chapter.images.map((img) => (
              <img 
                key={img.id} 
                src={img.imageUrl} 
                alt={`Page ${img.pageNumber}`} 
                className="w-full object-contain pointer-events-none select-none"
                loading="lazy"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
