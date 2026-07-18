import { prisma } from '@/lib/prisma';
import { ChapterEditor } from '@/components/admin/ChapterEditor';

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

      <ChapterEditor seriesId={id} />
    </div>
  );
}
