import { prisma } from '@/lib/prisma';
import { MetadataClient } from './metadata-client';

export default async function AdminMetadataPage() {
  const [genres, tags] = await Promise.all([
    prisma.genre.findMany({ orderBy: { name: 'asc' } }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } })
  ]);

  return (
    <div className="space-y-6">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-text-primary">
          Metadata
        </h1>
        <p className="mt-2 text-sm md:text-base text-text-secondary">
          Manage Genres and Tags.
        </p>
      </div>

      <MetadataClient genres={genres} tags={tags} />
    </div>
  );
}
