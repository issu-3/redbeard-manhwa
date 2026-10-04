import { prisma } from '@/lib/prisma';
import SeriesManagementClient from '@/components/admin/SeriesManagementClient';

export default async function AdminSeriesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const currentPage = parseInt(page || '1', 10);
  const take = 50;
  const skip = (currentPage - 1) * take;

  let seriesList: any[] = [];
  let totalSeries = 0;
  let loadError = false;

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
    loadError = true;
  }

  if (loadError) {
    throw new Error('Failed to load series data');
  }

  const totalPages = Math.ceil(totalSeries / take);

  // Serialize dates for the client component
  const serializedSeries = seriesList.map((s) => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    coverImage: s.coverImage,
    status: s.status,
    type: s.type,
    createdAt: s.createdAt.toISOString(),
    _count: s._count,
  }));

  return (
    <SeriesManagementClient
      initialSeries={serializedSeries}
      totalSeries={totalSeries}
      currentPage={currentPage}
      totalPages={totalPages}
      take={take}
    />
  );
}
