import { prisma } from '@/lib/prisma';
import { ChapterEditor } from '@/components/admin/ChapterEditor';
import { notFound } from 'next/navigation';

export default async function EditChapterPage({ params }: { params: Promise<{ id: string; chapterId: string }> }) {
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
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Edit Chapter {chapter.number}</h1>
        <p className="text-text-secondary">{series.title}</p>
      </div>

      <ChapterEditor 
        seriesId={id} 
        chapter={chapter} 
        initialImages={chapter.images} 
      />
    </div>
  );
}
