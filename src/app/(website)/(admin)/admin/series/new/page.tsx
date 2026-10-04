import { prisma } from '@/lib/prisma';
import SeriesCreateClient from './SeriesCreateClient';

export default async function NewSeriesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  let genres: any[] = [];
  let tags: any[] = [];

  try {
    const [fetchedGenres, fetchedTags] = await Promise.all([
      prisma.genre.findMany({ orderBy: { name: 'asc' } }),
      prisma.tag.findMany({ orderBy: { name: 'asc' } })
    ]);
    genres = Array.isArray(fetchedGenres) ? fetchedGenres.map(g => ({ id: g.id, name: g.name })) : [];
    tags = Array.isArray(fetchedTags) ? fetchedTags.map(t => ({ id: t.id, name: t.name })) : [];
  } catch (err: any) {
    console.error('Error fetching data in NewSeriesPage:', err);
  }

  return (
    <>
      {error && (
        <div className="max-w-2xl mx-auto mb-4 rounded-xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger font-medium shadow-sm">
          Warning: {error}
        </div>
      )}
      <SeriesCreateClient genres={genres} tags={tags} />
    </>
  );
}
