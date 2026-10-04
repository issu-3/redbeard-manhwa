import { prisma } from '@/lib/prisma';
import { ChaptersTableClient } from './chapters-table-client';
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

  return <ChaptersTableClient series={series} />;
}
