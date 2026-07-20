export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { GenreCard } from '@/components/shared/GenreCard';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Genres' };

export default async function GenresPage() {
  const genres = await prisma.genre.findMany({
    include: {
      _count: {
        select: { series: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary md:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>
          Browse by Genre
        </h1>
        <p className="mt-1 text-sm text-text-muted">Discover series by your favorite categories</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {genres.map((genre, i) => (
          <GenreCard 
            key={genre.slug} 
            genre={{
              name: genre.name,
              slug: genre.slug,
              icon: genre.iconName || 'Hash',
              color: genre.color || '#E53935',
              seriesCount: genre._count.series
            }} 
            index={i} 
          />
        ))}
      </div>
    </div>
  );
}
