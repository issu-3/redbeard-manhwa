import { prisma } from '@/lib/prisma';
import { TaxonomyClient } from '@/components/admin/TaxonomyClient';

export default async function AdminGenresPage() {
  const genres = await prisma.genre.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { series: true }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Genres</h1>
        <p className="text-text-secondary">Manage series genres and categories.</p>
      </div>

      <TaxonomyClient type="genre" data={genres} />
    </div>
  );
}
