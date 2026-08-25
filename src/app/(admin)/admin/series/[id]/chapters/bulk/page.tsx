import { prisma } from '@/lib/prisma';
import { BulkChapterAdder } from '@/components/admin/BulkChapterAdder';

export default async function BulkAddChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const series = await prisma.series.findUnique({
    where: { id },
    select: { title: true }
  });

  if (!series) return <div>Series not found</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Bulk Add Chapters to {series.title}</h1>
        <p className="text-text-secondary">Paste multiple download links at once.</p>
      </div>

      <BulkChapterAdder seriesId={id} />
    </div>
  );
}
